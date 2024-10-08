import * as Canvas from '../util/Canvas.js';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/packets/Packets.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/data/Modes.js';
import { IImage, IPixel, IUnverifiedPixel, IStatistics, defaultStatistics, IRGBColor, IQueuedPixel, IArea } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';
import { Connection } from './connection/Connection.js';
import { constant } from '../util/Constant.js';
import { Bounds } from '../util/Bounds.js';
import { TextBuilder } from '../util/drawing/TextWriter.js';
import { LineDrawer } from '../util/drawing/LineDrawer.js';
import { PacketResponseMap, RateChangePacket } from '../util/packets/PacketResponses.js';
import { HeaderTypes } from '../PixelPlace.js';
import { OutgoingHttpHeaders } from 'http';
import { Color } from '../util/data/Color.js';
import { PacketSendMap } from '../util/packets/PacketSends.js';

/**
 * The pixelplace bot.
 */
export class Bot {

    protector!: Protector;
    private authKey!: string;
    private authToken!: string;
    private authId!: string;
    private boardId!: number;

    private prevPlaceValue: number = 0;

    private sendQueue: Array<IQueuedPixel> = [];
    private resendQueue: Array<IPixel> = [];
    private unverifiedPixels: Array<IUnverifiedPixel> = [];
    private sendAfterWarDone: Array<IPixel> = [];
    private goingThroughQueue: number = 0;

    autoRestart: boolean;
    handleErrors: boolean;

    private uidman!: UIDManager;

    headers: (type: HeaderTypes) => OutgoingHttpHeaders = () => {return {}};

    private connection!: Connection;
    rate: RateChangePacket = -1;

    /**
     * Creates a bot instance
     * @param auth Auth data for pixelplace
     * @param autoRestart If the bot should restart when it closes. Defaults to true
     * @param handleErrors If errors should be handled when received -- invalid auth id will be processed regardless of this value. Defaults to true
     */
    constructor(auth: Auth, autoRestart: boolean = true, handleErrors: boolean = true) {
        this.authKey = auth.authKey;
        this.authToken = auth.authToken;
        this.authId = auth.authId;

        constant(this, 'boardId', auth.boardId);
        
        this.autoRestart = autoRestart;
        this.handleErrors = handleErrors;

        if(auth.uidManager) {
            this.uidman = new UIDManager(this);
        }

        this.Load = this.Load.bind(this);
        this.Connect = this.Connect.bind(this);
        this.Init = this.Init.bind(this);
    }

    /**
     * Gets an account username from the uid. Requires the uid manager enabled.
     * @param uid The uid of the account.
     * @returns The username from the uid.
     */
    getUsername(uid: string | number): string | undefined {
        if(!this.uidman) {
            throw "This bot does not have the uid manager enabled. new Auth(authObj, boardId, true)";
        }
        return this.uidman.getUsername(uid);
    }

    /**
     * Canvas
     * @returns The canvas the bot is on.
     */
    getCanvas(): Canvas.Canvas {
        return this.connection.canvas;
    }

    /**
     * Enables a listener for a packet. When the packet is received, the function will be called.
     * @param packet The packet to listen for.
     * @param func The function to execute upon receiving it.
     * @param pre If true, the function will be called before ppjs processes it (only applies to 42[] packets). Defaults to false.
     */
    on<T extends keyof PacketResponseMap>(packet: T, func: (args: PacketResponseMap[T]) => void, pre: boolean = false): void {
        this.connection.on(packet, func, pre);
    }

    /**
     * Initiates the bot.
     * @returns A promise that will resolve once the bot connects and is fully loaded.
     */
    async Init(): Promise<void> {
        return new Promise<void>((resolve) => this.Connect().then(this.Load).then(resolve));
    }

    /**
     * Connects the bot to pixelplace.
     * @returns A promise that will resolve once the socket opens.
     */
    async Connect(): Promise<void> {
        this.connection = new Connection(this, this.authKey, this.authToken, this.authId, this.boardId, this.stats, this.headers);
        return this.connection.Connect();
    }

    /**
     * Loads the bot fully. This should always be ran directly after Connect() or the bot won't function.
     * @returns A promise that will resolve once the bot is fully loaded.
     */
    async Load(): Promise<void> {
        if (!this.connection) {
            throw new Error("Connection not initialized.");
        }
        return this.connection.Load();
    }

    /**
     * Gets the color of the pixel at x,y coordinates.
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @returns The color of the pixel at x,y.
     */
    getPixelAt(x: number, y: number): Color | undefined {
        return this.getCanvas()?.pixelData?.get(x, y);
    }

    /**
     * Gets the closest color to an r,g,b value
     * @param rgb The rgb values. {r,g,b}
     * @returns The closest color to rgb
     */
    getClosestColorId(rgb: IRGBColor): Color {
        return this.getCanvas()?.getClosestColorId(rgb);
    }

    /**
     * This function is used by the connection for verifying pixels. This shouldn't be used outside of that.
     */
    verifyPixels() {
        let successful = this.unverifiedPixels.length;
        for (let i = this.unverifiedPixels.length - 1; i >= 0; i--) {
            const pixel = this.unverifiedPixels[i];

            if(this.getPixelAt(pixel.data.x, pixel.data.y) == pixel.data.col) continue;

            this.resendQueue.push(pixel.data); // pixels were not sent, redo them
            this.connection.canvas?.pixelData?.set(pixel.data.x, pixel.data.y, pixel.originalColor);

            // statistics
            this.stats.pixels.placing.failed++;
            this.stats.pixels.colors[pixel.data.col]--;
            successful--;
        }
        this.stats.pixels.placing.placed += successful;
        this.unverifiedPixels = [];
    }
    
    private getPlacementSpeed() {
        const prevValue = this.prevPlaceValue;
        const newValue = this.userDefPlaceSpeed(prevValue);
        this.prevPlaceValue = newValue;
        return newValue;
    }

    /**
     * This is used internally. Calling this probably won't do anything but I don't recommend it.
     */
    sendWarPackets() {
        this.sendAfterWarDone.forEach(pixel => {
            this.resendQueue.push(pixel);
        });
        this.sendAfterWarDone = [];
    }

    private userDefPlaceSpeed: (prevValue?: number) => number = () => 16;
    suppress: boolean = false;
    checkRate: number = -2;

    /**
     * Sets the placement speed of the bot
     * @param arg Either a direct number or a function for the pixeling
     * @param autoFix If the rate should automatically be updated to be rate_change value -- won't do anything if you use a function
     * @param suppress Suppress warnings if the number is below bot.rate
     */
    setPlacementSpeed(arg: (prevValue?: number) => number | number, autoFix: boolean=true, suppress: boolean=false): void {
        this.suppress = suppress;
        if(typeof arg != 'function') {
            if(this.rate == -1) {
                console.warn(`~~WARN~~ The rate_change packet has not been received yet, so the placement speed cannot be verified for if it works. You likely shouldn't be setting this value right now.`);
            } else if(!suppress && arg < this.rate) {
                console.warn(`~~WARN~~ Placement speed under ${this.rate} (Current rate_change value) may lead to rate limit or even a ban! (Suppress with setPlacementSpeed(${arg}, ${autoFix}, true); not recommended)`);
            }
            this.userDefPlaceSpeed = () => arg;
            if(autoFix) {
                this.checkRate = -2;
            } else {
                this.checkRate = arg;
            }
            return;
        }
        this.userDefPlaceSpeed = arg;
        this.checkRate = -1;
    }

    /**
     * Places a pixel
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @param col The color of the pixel.
     * @param brush The brush to place the pixel. Defaults to 1.
     * @param protect Whether the pixel should be replaced when changed. Defaults to false.
     * @param wars Whether the pixel should be placed if it's in a war zone during a war. Defaults to false. (will get you banned if a mod sees)
     * @param force Whether the pixel packet should still be sent even if it won't change the color. Defaults to false.
     * @returns A promise that resolves upon the pixel being sent.
     */
    async placePixel(...args: [IPixel] | [x: number, y: number, col: number, brush?: number, protect?: boolean, wars?: boolean, force?: boolean]): Promise<void> {
        let pixel: IPixel;

        if (args.length === 1 && typeof args[0] === 'object') {
            pixel = args[0] as IPixel;
        } else if (args.length >= 3) {
            pixel = {
                x: args[0] as number,
                y: args[1] as number,
                col: args[2] as number,
                brush: args[3] as number || 1,
                protect: args[4] as boolean || false,
                wars: args[5] as boolean || false,
                force: args[6] as boolean || false
            };
        } else throw new Error('Invalid arguments for placePixel.');

        return this.placePixelInternal(pixel);
    }

    /**
     * Directly protects a pixel. It can help with certain bugs.
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @param col The color of the pixel.
     */
    protect(x: number, y: number, col: number): void {
        this.protector.protect(x, y, col);
    }

    private resolvePacket(queuedPixel: IQueuedPixel): void {
        queuedPixel.resolve();
        this.goingThroughQueue--;
        this.goThroughPixels();
    }

    private semiAccurateTimeout(call: () => void, time: number): void {
        time += Math.floor(Math.random() * 3) + 2; // add jitter but not as extreme as normal js & not so widespread across systems

        const start = process.hrtime();
        function loop() {
            const elapsed = process.hrtime(start)[1] / 1000000;
            if (elapsed < time) {
                setImmediate(loop);
            } else {
                call();
            }
        }
        setImmediate(loop);
    }

    private goThroughPixels(): void {

        const queuedPixel = this.sendQueue.shift();

        if(queuedPixel == null) return; // shouldn't but just in case

        this.goingThroughQueue++;

        const {x, y, col, protect, wars, force} = queuedPixel.data;

        const colAtSpot = this.getPixelAt(x, y);

        const skippedColor = (!force && colAtSpot == col) || colAtSpot == null || colAtSpot == Color.OCEAN;
        if(skippedColor) {
            setImmediate(() => this.resolvePacket(queuedPixel));
            return;
        }
        const skippedWar = !wars && this.isWarOccurring() && this.isPixelInWarZone(this.getCurrentWarZone(), x, y);
        if(skippedWar) {
            if(protect) {
                let updated = false;
                for (let i = 0; i < this.sendAfterWarDone.length; i++) {
                    if (this.sendAfterWarDone[i].x === queuedPixel.data.x && this.sendAfterWarDone[i].y === queuedPixel.data.y) {
                        this.sendAfterWarDone[i].col = queuedPixel.data.col;
                        updated = true;
                        break;
                    }
                }

                if (!updated) {
                    this.sendAfterWarDone.push(queuedPixel.data);
                }
            }
            return this.resolvePacket(queuedPixel);
        }

        queuedPixel.speed -= this.nextSubtract;
        this.semiAccurateTimeout(() => this.sendPixel(queuedPixel, colAtSpot), queuedPixel.speed);
        return;
    }

    private lastPixel: number = Date.now();
    private nextSubtract: number = 0;
    private sendPixel(queuedPixel: IQueuedPixel, origCol: number): void {
        this.resolvePacket(queuedPixel);

        const {x, y, col, brush, wars, force} = queuedPixel.data;

        const colAtSpot = this.getPixelAt(x, y);
        const skipped = ((!force && colAtSpot == col) || colAtSpot == null || colAtSpot == Color.OCEAN)
                            || (!wars && this.isWarOccurring() && this.isPixelInWarZone(this.getCurrentWarZone(), x, y));
        if(skipped) {
            return;
        }

        this.nextSubtract = 0;
        if(this.checkRate != -1) {
            const deltaTime = Date.now() - this.lastPixel;
            this.nextSubtract = Math.min(deltaTime - queuedPixel.speed, 0);
            this.lastPixel = Date.now();
        }

        this.emit(Packets.SENT.PIXEL, [x,y,col,brush]);
        this.connection.canvas?.pixelData?.set(x, y, col);

        const arr: IUnverifiedPixel = {data: queuedPixel.data, originalColor: origCol || 0};
        this.unverifiedPixels.push(arr);

        // statistics
        this.stats.pixels.placing.attempted++;

        this.stats.pixels.placing.last_pos[0] = x;
        this.stats.pixels.placing.last_pos[1] = y;

        if(!this.stats.pixels.colors[col])this.stats.pixels.colors[col] = 0;
        this.stats.pixels.colors[col]++;

        if(this.stats.pixels.placing.first_time == -1) this.stats.pixels.placing.first_time = Date.now();
    }

    private addToSendQueue(p: IQueuedPixel): void {
        this.sendQueue.push(p);
        if(this.goingThroughQueue == 0) {
            this.goThroughPixels();
        }
    }

    private async placePixelInternal(p: IPixel, forcePlacementSpeed: number=-1): Promise<void> {

        const {x, y, col, protect, force } = p;

        if(x > this.connection.canvas.canvasWidth || x < 0 || y > this.connection.canvas.canvasHeight || y < 0) {
            return Promise.resolve();
        }

        if(!this.getCanvas().isValidColor(col)) {
            return Promise.resolve();
        }

        // we still want to protect it even if it's same color, so it's done prior.
        if(protect) {
            this.protector.protect(x, y, col);
        }

        // Do not add to queue.
        if(this.getPixelAt(x, y) == col && !force) {
            return Promise.resolve();
        }

        if(this.resendQueue.length > 0) {
            const pixel: IPixel | undefined = this.resendQueue.shift();
            if(pixel != null) {
                await this.placePixelInternal(pixel);
            }
        }

        const placementSpeed = forcePlacementSpeed == -1 ? this.getPlacementSpeed() : forcePlacementSpeed;

        return new Promise<void>((resolve) => this.addToSendQueue({data: p, speed: placementSpeed, resolve}) );
    }

    /**
     * Sends a value through the socket. It's recommended to use emit() over this.
     * @param value The value to send.
     */
    send(value: string | unknown[] | Buffer | Uint8Array): void {
        this.connection.send(value);
    }

    /**
     * Emits a packet type and value through the socket.
     * @param type Packet type.
     * @param value Value. If not set, no value will be sent through other than the packet name.
     */
    emit<T extends keyof PacketSendMap>(type: T, value?: PacketSendMap[T]): void {
        this.connection.emit(type, value);
    }
    
    /**
     * Draws an image.
     * @param x The x coordinate of the left.
     * @param y The y coordinate of the top.
     * @param path The path of the image.
     * @param mode The mode to draw. Can also be DrawingFunction.
     * @param protect If the pixels should be replaced when another player modifies them.
     * @param transparent If the image is transparent. Will skip any 0 alpha pixels.
     * @param wars If the pixels should place inside of war zones during wars (will get you banned if mods see it).
     * @param force If the pixel packet should still be sent if it doesn't change the color.
     * @returns A promise that resolves once the image is done drawing.
     */
    async drawImage(...args: [IImage] | [x: number, y: number, path: string, mode?: Modes, protect?: boolean, transparent?: boolean, wars?: boolean, force?: boolean]): Promise<void> {
        let image: IImage;

        if (args.length === 1 && typeof args[0] === 'object') {
            image = args[0] as IImage;
        } else if (args.length >= 3) {
            image = {
                x: args[0] as number,
                y: args[1] as number,
                path: args[2] as string,
                mode: args[3] as Modes || Modes.TOP_LEFT_TO_RIGHT,
                protect: args[4] as boolean || false,
                transparent: args[5] as boolean || false,
                wars: args[6] as boolean || false,
                force: args[7] as boolean || false
            };
        } else throw new Error('Invalid arguments for drawImage.');
        
        return this.drawImageInternal(image);
    }
    
    private async drawImageInternal(image: IImage) {

        this.stats.images.drawing++;

        await new ImageDrawer(this, image).begin();

        this.stats.images.drawing--;
        this.stats.images.finished++;

    }

    /**
     * Creates a builder for a text drawing. After adding the options, add .draw() to the end.
     * @param text The text to draw.
     * @param x The top-left x position to draw at.
     * @param y The top-left y position to draw at.
     * @param protect If the pixels should be replaced when another player modifies them.
     * @param wars If the pixels should place inside of war zones during wars (will get you banned if mods see it).
     * @param force If the pixel packet should still be sent if it doesn't change the color.
     */
    buildText(text: string, x: number, y: number, protect: boolean = false, wars: boolean = false, force: boolean = false) {
        return new TextBuilder(this, text, x, y, protect, wars, force);
    }

    /**
     * Draws a line between two positions (experimental).
     * @param x1 The initial x position.
     * @param y1 The initial y position.
     * @param x2 The ending x position.
     * @param y2 The ending y position.
     * @param col The color to draw with.
     * @param thickness How thick the line is (due to this being an experimental function, it can bug at weird angles.)
     * @param protect If the pixels should be replaced when another player modifies them.
     * @param wars If the pixels should place inside of war zones during wars (will get you banned if mods see it).
     * @param force If the pixel packet should still be sent if it doesn't change the color.
     */
    async drawLine(x1: number, y1: number, x2: number, y2: number, col: number, thickness: number = 1, protect: boolean = false, wars: boolean = false, force: boolean = false) {
        
        this.stats.lines.drawing++;

        await new LineDrawer(this, x1, y1, x2, y2, col, thickness, protect, wars, force).begin();

        this.stats.lines.drawing--;
        this.stats.lines.finished++;

    }

    /** Statistics that are modified internally. Use getStatistics() instead, since it updates other things. */
    stats: IStatistics = defaultStatistics();

    /**
     * Statistics
     * @returns The statistics of the bot.
     */
    getStatistics(): IStatistics {
        // updating values
        this.stats.session.time = Date.now() - this.stats.session.beginTime;
        const timeSinceFirstPixel = Date.now() - this.stats.pixels.placing.first_time;
        this.stats.pixels.placing.per_second = this.stats.pixels.placing.placed / (timeSinceFirstPixel * 0.001);
        return this.stats;
    }

    /**
     * @returns If the chat is loaded or not. (true/false)
     */
    isChatLoaded(): boolean {
        return this.connection.isChatLoaded();
    }

    /**
     * @returns Pixeling rate requested by pixelplace
     */
    getRate(): RateChangePacket {
        return this.rate;
    }

    /**
     * @returns The uid manager.
     */
    getUidManager(): UIDManager {
        return this.uidman;
    }

    /**
     * @returns All war locations and stats on them.
     */
    getAreas(): {[key: string]: IArea} {
        return this.connection.getAreas();
    }

    /**
     * @param name The name of the area. E.g. "United States"
     * @returns An IArea instance containing info on the area.
     */
    getArea(name: string): IArea | null {
        return this.getAreas()[name];
    }

    /**
     * This is used if you want to get the area from a raw packet since the packets give id's rather than names.
     * @param id The id of an area
     * @returns An IArea instance containing info on the area.
     */
    getAreaById(id: number): IArea {
        return this.connection.getAreaById(id);
    }

    /**
     * @returns If a war is occurring (true/false)
     */
    isWarOccurring(): boolean {
        return this.connection.isWarOccurring();
    }

    /**
     * This does not account for the current war zone or if a war is occuring.
     * @param x X position of pixel
     * @param y Y position of pixel
     * @returns If a pixel is in a war zone (true/false)
     */
    isPixelInAnyWarZone(x: number, y: number): boolean {
        const areas = this.getAreas();
        Object.keys(areas).forEach(key => {
            if(this.isPixelInWarZone(key, x, y)) {
                return true;
            } // else ignore
        })
        return false;
    }

    /**
     * This does not account for if a war is occurring.
     * You can check if a pixel is in the current war with isPixelInWarZone(bot.getCurrentWarZone(), x, y)
     * @param name Name of the war zone
     * @param x X position of pixel
     * @param y Y position of pixel
     * @returns If a pixel is within a specific war zone.
     */
    isPixelInWarZone(name: string, x: number, y: number): boolean {
        if(this.boardId != 7) return false;
        const area = this.getAreas()[name];
        if(area == null || !area.xStart) return false;
        return Bounds.isInBounds(area.xStart, area.yStart, area.xEnd, area.yEnd, x, y);
    }

    /**
     * @returns The current war zone. Or "NONE" if a war is not found.
     */
    getCurrentWarZone(): string {
        return this.connection.getCurrentWarZone();
    }

    /**
     * Sets the request headers.
     * @param headers An object of headers.
     */
    setHeaders(headers: (type: HeaderTypes) => OutgoingHttpHeaders) {
        this.headers = headers;
        if(this.connection) {
            this.connection.headers = this.headers;
            this.connection.canvas.headers = this.headers;
        }
    }

}