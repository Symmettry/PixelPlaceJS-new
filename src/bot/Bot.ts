import * as Canvas from '../util/Canvas.js';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/data/Packets.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/data/Modes.js';
import { IImage, IPixel, IUnverifiedPixel, IStatistics, defaultStatistics, IRGBColor, IQueuedPixel, IArea } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';
import { Connection } from './Connection.js';
import { constant } from '../util/Constant.js';
import { Bounds } from '../util/Bounds.js';

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

    private connection!: Connection;
    rate: number = -1;

    /**
     * Creates a bot instance
     * @param auth Auth data for pixelplace
     * @param autoRestart If the bot should restart when it closes. Defaults to true
     * @param handleErrors If errors should be handled when received -- invalid auth id will be processed regardless of this value. Defaults to true
     */
    constructor(auth: Auth, autoRestart: boolean = true, handleErrors: boolean = true) {
        this.authKey = auth.authKey();
        this.authToken = auth.authToken();
        this.authId = auth.authId();

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
     */
    on(packet: string | Packets, func: (...args: unknown[]) => void): void {
        this.connection.on(packet, func);
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
        this.connection = new Connection(this, this.authKey, this.authToken, this.authId, this.boardId, this.stats);
        this.authKey = this.authToken = this.authId = "[REDACTED]";
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
    getPixelAt(x: number, y: number): number | undefined {
        return this.getCanvas()?.pixelData?.get(x, y);
    }

    /**
     * Gets the closest color to an r,g,b value
     * @param rgb The rgb values. {r,g,b}
     * @returns The closest color to rgb
     */
    getClosestColorId(rgb: IRGBColor): number {
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
    onWarFinish() {
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
    async placePixel(...args: [IPixel] | [number, number, number, number?, boolean?, boolean?, boolean?]): Promise<void> {
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

    private goThroughPixels(): void {

        const queuedPixel = this.sendQueue.shift();

        if(queuedPixel == null) return; // shouldn't but just in case

        this.goingThroughQueue++;

        const {x, y, col, protect, wars, force} = queuedPixel.data;

        const colAtSpot = this.getPixelAt(x, y);

        const skippedColor = (!force && colAtSpot == col) || colAtSpot == null || colAtSpot == 65535 // 65535 is ocean.
        if(skippedColor) {
            return this.resolvePacket(queuedPixel);
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
        setTimeout(() => this.sendPixel(queuedPixel, colAtSpot), queuedPixel.speed);
        return;
    }
    private lastPixel: number = Date.now();
    private nextSubtract: number = 0;
    private sendPixel(queuedPixel: IQueuedPixel, origCol: number): void {

        this.nextSubtract = 0;
        if(this.checkRate != -1) {
            const deltaTime = Date.now() - this.lastPixel;
            this.nextSubtract = Math.min(deltaTime - queuedPixel.speed, 0);
            this.lastPixel = Date.now();
        }

        const {x, y, col, brush } = queuedPixel.data;

        this.resolvePacket(queuedPixel);

        this.send(`42["${Packets.SENT.PIXEL}", [${x},${y},${col},${brush}]]`);
        this.connection.canvas?.pixelData?.set(x, y, col);

        const arr: IUnverifiedPixel = {data: queuedPixel.data, originalColor: origCol || 0};
        this.unverifiedPixels.push(arr);

        // statistics
        this.stats.pixels.placing.attempted++;

        this.stats.pixels.placing.last_pos[0] = x;
        this.stats.pixels.placing.last_pos[1] = y;

        if(!this.stats.pixels.colors[col])this.stats.pixels.colors[col] = 0;
        this.stats.pixels.colors[col]++;
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
            throw `Out of bounds pixel: ${x},${y}`;
        }

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
     * Sends a value through the socket.
     * @param value The value to send.
     */
    send(value: string | unknown[] | Buffer | Uint8Array): void {
        this.connection.send(value);
    }
    
    /**
     * Draws an image.
     * @param x The x coordinate of the left.
     * @param y The y coordinate of the top.
     * @param path The path of the image.
     * @param mode The mode to draw. Can also be DrawingFunction.
     * @param protect If the pixels should be replaced when changed.
     * @param wars If the pixels should place inside of war zones during wars (will get you banned if mods see it)
     * @param force If the pixel packet should still be sent if it doesn't change the color.
     * @returns A promise that resolves once the image is done drawing.
     */
    async drawImage(...args: [IImage] | [number, number, string, Modes?, boolean?, boolean?, boolean?]): Promise<void> {
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
                wars: args[5] as boolean || false,
                force: args[6] as boolean || false
            };
        } else throw new Error('Invalid arguments for drawImage.');
        
        if(this.stats.pixels.placing.first_time == -1) this.stats.pixels.placing.first_time = Date.now();
        return this.drawImageInternal(image);
    }
    
    private async drawImageInternal(image: IImage) {
        this.stats.images.drawing++;

        const drawer: ImageDrawer = new ImageDrawer(this, image);
        await drawer.begin();

        this.stats.images.drawing--;
        this.stats.images.finished++;
    }

    private stats: IStatistics = defaultStatistics();

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
    getRate(): number {
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
        if(!area.xStart) return false;
        return Bounds.isInBounds(area.xStart, area.yStart, area.xEnd, area.yEnd, x, y)
    }

    /**
     * @returns The current war zone. Or "NONE" if a war is not found.
     */
    getCurrentWarZone(): string {
        return this.connection.getCurrentWarZone();
    }

}