import * as Canvas from '../util/canvas/Canvas.js';
import { Image, ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/packets/Packets.js";
import { Pixel, IStatistics, defaultStatistics, IRGBColor, IQueuedPixel, IArea, IBotParams, IDebuggerOptions, QueueSide, PlaceResults, BoardTemplate, PlainPixel, CoordSet, BoardID } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';
import { Connection } from './connection/Connection.js';
import { constant } from '../util/Constant.js';
import { Bounds } from '../util/Bounds.js';
import { TextData, TextWriter } from '../util/drawing/fonts/TextWriter.js';
import { Line, LineDrawer } from '../util/drawing/LineDrawer.js';
import { PacketResponseMap, RateChangePacket } from '../util/packets/PacketResponses.js';
import { HeadersFunc, HeaderTypes } from '../PixelPlace.js';
import { OutgoingHttpHeaders } from 'http';
import { Color } from '../util/data/Color.js';
import { PacketSendMap } from '../util/packets/PacketSends.js';
import { NetUtil, PaintingData, UserData } from '../util/NetUtil.js';
import { ServerClient } from '../browser/client/ServerClient.js';
import { Animation, AnimationDrawer } from '../util/drawing/AnimationDrawer.js';
import { GeometryDrawer, Outline, Rectangle } from '../util/drawing/GeometryDrawer.js';
import { populate } from '../util/FlagUtil.js';
import { DrawingMode, sortPixels } from '../util/data/Modes.js';

/**
 * The pixelplace bot.
 */
export class Bot {

    private static alertedDisallow: boolean = false;

    protector!: Protector;
    boardId!: BoardID;

    private prevPlaceValue: number = 0;

    private sendQueue: Array<IQueuedPixel> = [];
    private resendQueue: Array<PlainPixel> = [];
    private sendAfterWarDone: Array<Pixel> = [];

    autoRestart: boolean;
    handleErrors: boolean;

    private uidman!: UIDManager;

    // ! it's set with setHeaders()
    headers!: HeadersFunc;

    private debugger: boolean = false;
    private debuggerOptions: IDebuggerOptions = {};

    private connection: Connection | null = null;

    params: IBotParams | ServerClient;

    private netUtil: NetUtil;

    /** If the bot is ratelimited. */
    ratelimited: boolean = false;
    /** Amount of time ratelimited for. */
    ratelimitTime: number = 0;

    /** Adds a fail safe for pixel packets per second, will shut the bot off if it sends more than this in a second */
    failSafe: number = 1000/10;

    /** Max time a pixel will be waiting for. Setting place rate will increase this if it's higher. */
    maxPixelWait: number = 100;

    /** Amount of detected new lag ms; based on pixel confirm response times */
    lagAmount: number = 0;
    /** Ms to increase pixels when lagging; per lag amount ms */
    lagIncreasePerMs: number = 1;

    /** Amount of sustained packets */
    sustainingLoad: number = 0;
    
    /** Current load barrier index */
    currentBarrier: number = 0;
    /** Amount of sustained packet load to cause increases */
    loadBarriers: number[] = [0,100,150,200,500];
    /** Slowdown amount in ms after sustained load passes barriers */
    loadIncreases: number[] = [0,1,3,4,5];
    /** Will reset load to 0 after passing this; this works fine because detected rate is lower after it's been slowed down for a while. */
    loadReset: number = 1500;

    /** Shouldn't be edited by the user. This is the rate change packet. */
    rate: RateChangePacket = -1;

    /** The user id of the bot */
    userId: number = -1;
    /** Username of the bot */
    username: string = "Guest";
    /** If the bot is premium */
    premium: boolean = false;
    /** Special pixel queue info */
    specialQueueInfo: { amount: number; time: number | Function; start: number; } | null = null;

    /**
     * Creates a bot instance
     * @param auth Auth data for pixelplace
     * @param autoRestart If the bot should restart when it closes. Defaults to true
     * @param handleErrors If errors should be handled when received -- invalid auth id will be processed regardless of this value. Defaults to true
     */
    constructor(params: IBotParams | ServerClient, autoRestart: boolean = true, handleErrors: boolean = true) {
        this.params = params;

        if(!this.params.boardID) {
            throw new Error("Key 'boardID' not present in bot parameters!");
        }

        this.netUtil = new NetUtil(this, this.headers);

        this.setHeaders((type: HeaderTypes) => {
            const headers: OutgoingHttpHeaders = {};
            switch(type) {
                case 'get-painting':
                case 'get-user':
                case 'relog':
                    headers.accept = 'application/json, text/javascript, */*; q=0.01'
                    break;
                case 'canvas-image':
                    headers.accept = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
                    break;
                case 'socket':
                    headers.connection = 'Upgrade';
                    headers["Cache-Control"] = "no-cache";
                    break;
            }
            return headers;
        });

        constant(this, 'boardId', params.boardID);
        constant(this, 'protector', new Protector(this));
        
        this.autoRestart = autoRestart;
        this.handleErrors = handleErrors;

        this.Load = this.Load.bind(this);
        this.Connect = this.Connect.bind(this);
        this.Init = this.Init.bind(this);

        this.queueLoop();
    }

    private lastQueueTime: EpochTimeStamp = Date.now();
    private lastVerification: EpochTimeStamp = Date.now();
    private queueLoop() {
        if(this.sendQueue.length == 0) {
            if(this.stats.pixels.placing.placed > 0 && Date.now() - this.lastVerification > 100) {
                this.sustainingLoad = Math.floor(Math.max(0, this.sustainingLoad / 3 - 400));
                while(this.currentBarrier > 0 && this.sustainingLoad < this.loadIncreases[this.currentBarrier]) {
                    this.currentBarrier--;
                }
                this.lastVerification = Date.now();
            }
            
            setTimeout(() => this.queueLoop(), 10);
            return;
        }
        this.lastQueueTime = Date.now();
        this.goThroughPixels();
    }

    /**
     * @returns amount of pixels in queue
     */
    queuedPixels(): number {
        return this.getConnection().waitingOn();
    }

    /**
     * Gets an account username from the uid. Requires the uid manager enabled.
     * @param uid The uid of the account.
     * @returns The username from the uid.
     */
    getUsername(uid: string | number): Promise<string> {
        if(!this.uidman) {
            throw "This bot does not have the uid manager enabled. new Auth(authObj, boardId, true)";
        }
        return this.uidman.getUsername(uid);
    }

    /**
     * Gets user data
     * @param name Name of the user
     * @param reload If it should reload or return the cached value when called again. Defaults to false
     */
    async getUserData(name: string, reload: boolean=false): Promise<UserData | null> {
        return this.netUtil.getUserData(name, reload);
    }
    
    /**
     * Gets painting data
     * @param canvasId The canvas to get painting data of
     * @param reload If it should reload or return the cached value when called again. Defaults to false.
     * @param connected Connected or not. Not too useful. Defaults to true.
     */
    async getPaintingData(canvasId: number, reload: boolean=false, connected: boolean=true): Promise<PaintingData | null> {
        return this.netUtil.getPaintingData(canvasId, reload, connected);
    }

    /**
     * @returns true if the bot is connected
     */
    connected(): boolean  {
        return this.connection != null && this.connection.connected;
    }

    getConnection(): Connection {
        if(!this.connected()) {
            throw new Error("Not connected yet!")
        }
        return this.connection!;
    }

    /**
     * Canvas
     * @returns The canvas the bot is on.
     */
    getCanvas(): Canvas.Canvas {
        return this.getConnection().canvas;
    }

    /**
     * Enables a listener for a packet. When the packet is received, the function will be called.
     * @param packet The packet to listen for.
     * @param func The function to execute upon receiving it.
     * @param pre If true, the function will be called before ppjs processes it (only applies to 42[] packets). Defaults to false.
     */
    on<T extends keyof PacketResponseMap>(packet: T, func: (args: PacketResponseMap[T]) => void, pre: boolean = false): void {
        this.getConnection().on(packet, func, pre);
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
        this.connection = new Connection(this, this.params, this.stats, this.netUtil, this.headers);
        await this.connection.Connect();
        if(this.debugger) this.addDebuggerInternal();
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
    getClosestColorId(r: number, g: number, b: number): Color {
        return Canvas.Canvas.getClosestColorId(r, g, b)!;
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
    setPlacementSpeed(arg: ((prevValue?: number | undefined) => number) | number, autoFix: boolean=true, suppress: boolean=false): void {
        this.suppress = suppress;
        if(typeof arg == 'number') {
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
            if(arg > this.maxPixelWait) {
                this.maxPixelWait = arg;
            }
            return;
        }
        this.userDefPlaceSpeed = arg as any;
        this.checkRate = -1;
    }

    /**
     * Directly protects a pixel. It can help with certain bugs.
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @param col The color of the pixel.
     */
    protect(x: number, y: number, col: Color | null, replaceProtection: boolean = true): void {
        this.protector.protect(x, y, col, replaceProtection);
    }
    
    private accurateTimeout(call: () => void, time: number): void {
        if(isNaN(time) || time < 0) {
            console.error(this);
            throw new Error("Sleeping for an invalid amount of time!! Something is wrong, pls report with your code and the above text");
        }
        time += Math.floor(Math.random() * 3);

        const start = Date.now();
        function loop() {
            const elapsed = Date.now() - start;
            if (elapsed < time) {
                setImmediate(loop);
            } else {
                call();
            }
        }
        setImmediate(loop);
    }

    private resolvePixel(oldCol: Color, queuedPixel: IQueuedPixel): void {
        if(queuedPixel.resolve) queuedPixel.resolve({ pixel: queuedPixel.data, oldColor: oldCol });
        setImmediate(() => this.goThroughPixels());
    }

    /**
     * Internal use only
     */
    goThroughPixels(): void {

        if(this.sendQueue.length == 0) {
            this.lastVerification = Date.now();
            this.queueLoop();
            return;
        }

        if(Date.now() - this.lastQueueTime > 400 && Date.now() - this.connection!.timeSinceConfirm() > 1000) {
            console.log("~~PIXELPLACE LAGGING~~");
            setTimeout(() => {
                this.lastVerification = Date.now();
                this.queueLoop();
            }, 2000);
            return;
        }

        let colAtSpot: Color | undefined;
        let queuedPixel: IQueuedPixel | undefined;
        do {
            if(queuedPixel != undefined && queuedPixel.resolve) queuedPixel.resolve({ pixel: queuedPixel.data, oldColor: colAtSpot! });
            queuedPixel = this.sendQueue.shift();
            colAtSpot = queuedPixel ? this.getPixelAt(queuedPixel.data.x, queuedPixel.data.y) : undefined;
        } while ((colAtSpot == undefined || colAtSpot == Color.OCEAN || queuedPixel == undefined
            || (!queuedPixel.data.force && colAtSpot == queuedPixel.data.col))
            && this.sendQueue.length > 0);

        if(queuedPixel == undefined) {
            this.lastVerification = Date.now();
            this.queueLoop();
            return;
        }

        const {x, y, protect, wars } = queuedPixel.data;

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
            this.resolvePixel(colAtSpot!, queuedPixel)
            return;
        }

        this.sustainingLoad++;
        if(this.sustainingLoad >= this.loadReset) {
            this.sustainingLoad = 0;
        }
        if(this.sustainingLoad > this.loadBarriers[this.currentBarrier]) {
            if(this.currentBarrier != this.loadBarriers.length - 1 && this.sustainingLoad > this.loadBarriers[this.currentBarrier + 1]) {
                this.currentBarrier++;
            }
        } else if (this.currentBarrier > 0) {
            this.currentBarrier--;
        }
        queuedPixel.speed += this.loadIncreases[this.currentBarrier];

        queuedPixel.speed += this.lagAmount * this.lagIncreasePerMs;

        if(this.ratelimited) queuedPixel.speed += 100;

        if(this.specialQueueInfo) {
            const { amount, time, start } = this.specialQueueInfo;
            const isFunc = typeof time == 'function';
            if(isFunc || Date.now() - start < time) {
                if(amount < 0) {
                    const call = () => {
                        this.sendQueue.unshift(queuedPixel);
                        this.goThroughPixels();
                    };
                    if(isFunc) time(call);
                    else setTimeout(call, time);
                    return;
                }
                queuedPixel.speed += amount;
            } else {
                this.specialQueueInfo = null;
            }
        }

        this.accurateTimeout(() => this.sendPixel(queuedPixel), Math.min(queuedPixel.speed, this.maxPixelWait));
        return;
    }

    lastPixel: number = Date.now();

    private sendPixel(queuedPixel: IQueuedPixel): void {
        if(!this.connected()) {
            this.lastVerification = Date.now();
            this.queueLoop();
            setTimeout(() => {
                this.addToSendQueue(queuedPixel);
            }, 2000);
            return;
        }

        const {x, y, col, brush = 1, wars = false, force = false, protect = false} = queuedPixel.data;

        const colAtSpot = this.getPixelAt(x, y);
        const skipped = ((!force && colAtSpot == col) || colAtSpot == null || colAtSpot == Color.OCEAN)
                            || (!wars && this.isWarOccurring() && this.isPixelInWarZone(this.getCurrentWarZone(), x, y));

        this.resolvePixel(colAtSpot!, queuedPixel);

        if(skipped) {
            return;
        }

        this.connection!.timePixel(queuedPixel);
        this.emit(Packets.SENT.PIXEL, [x, y, col == Color.OCEAN ? -100 : col, brush]);
        this.lastPixel = Date.now();

        // statistics
        const pixelStats = this.stats.pixels;

        pixelStats.placing.attempted++;

        pixelStats.placing.last_pos[0] = x;
        pixelStats.placing.last_pos[1] = y;

        if(!pixelStats.colors[col])pixelStats.colors[col] = 0;
        pixelStats.colors[col]++;

        if(pixelStats.placing.first_time == -1) pixelStats.placing.first_time = Date.now();

        if(protect) {
            // most accurate i can get it sigh
            pixelStats.protection.repaired++;
            pixelStats.protection.last_repair = Date.now();
        }
    }

    /**
     * Internal use only
     */
    addToSendQueue(p: IQueuedPixel): void {
        if(!p.data.side || p.data.side == QueueSide.BACK) this.sendQueue.push(p);
        else this.sendQueue.unshift(p);
    }

    /**
     * @returns if an x,y is on the canvas
     */
    isValidPosition(x: number, y: number): boolean {
        return this.getCanvas()?.isValidPosition(x, y);
    }

    /**
     * Places a pixel
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @param col The color of the pixel.
     * @param brush The brush to place the pixel. Defaults to 1.
     * @param protect Whether the pixel should be replaced when changed. Defaults to false.
     * @param wars Whether the pixel should be placed if it's in a war zone during a war. Defaults to false (will get you banned if a mod sees).
     * @param force Whether the pixel packet should still be sent even if it won't change the color. Defaults to false.
     * @returns A promise that resolves upon the pixel being sent.
     */
    async placePixel(upixel: Pixel): Promise<PlaceResults> {
        const pixel = populate(upixel);
        const {x, y, col, protect, async } = pixel;

        if(!this.isValidPosition(x, y)) {
            console.log("~~WARN~~ Skipping invalid position: ", x, y);
            return Promise.resolve(null);
        }

        if(!Canvas.Canvas.isValidColor(col)) {
            console.log("~~WARN~~ Skipping invalid color: ", col, ", at", x, y);
            return Promise.resolve(null);
        }

        const colAtSpot = this.getPixelAt(x, y);
        if(colAtSpot == Color.OCEAN) {
            return Promise.resolve(null);
        }

        if(this.getCanvas().boardTemplate == BoardTemplate.PIXEL_WORLD_WAR) {
            const region = this.getRegionAt(x, y);
            if(!Bot.alertedDisallow && !region.canBot) {
                Bot.alertedDisallow = true;
                console.warn(`~~WARN~~ You are botting in a disallowed area: ${region.name} @ (${x},${y})\nThis warning will not repeat again.`);
            } else if(!this.premium && region.name == "Premium Island") {
                console.warn(`~~WARN~~ Your account is not premium, and the bot tried to place at ${x},${y} on Premium Island.`);
                return Promise.resolve(null);
            }
        }

        if(!this.isProtected(x, y) || pixel.replaceProtection) {
            this.protector.updateProtection(protect!, x, y, col);
        } else {
            return Promise.resolve({ pixel, oldColor: this.protector.getColor(x, y)! });
        }

        if(this.resendQueue.length > 0) {
            const pixel: PlainPixel | undefined = this.resendQueue.shift();
            if(pixel != null) {
                const p = this.placePixel(pixel);
                if(pixel.async) await p;
            }
        }

        if(this.sendQueue.length == 0 && colAtSpot == col) {
            return Promise.resolve({ pixel, oldColor: col });
        }

        if(async) {
            return new Promise<PlaceResults>((resolve) => this.addToSendQueue({data: pixel, speed: this.getPlacementSpeed(), resolve}) );
        }
        this.addToSendQueue({data: pixel, speed: this.getPlacementSpeed(), resolve: null})
        return Promise.resolve({ pixel, oldColor: this.getPixelAt(x, y) } as PlaceResults);
    }

    /**
     * Sorts the current queue with a drawing mode
     * 
     * You can take advantage of this by adding a bunch of pixels into queue with async: false, then sort.
     */
    sortQueue(mode: DrawingMode) {
        const pixels = this.sendQueue.map(n => n.data);
        const map: CoordSet<IQueuedPixel> = {};
        for(const qp of this.sendQueue) {
            const {x, y} = qp.data;
            map[x] ??= {};
            map[x][y] = qp;
        }
        this.sendQueue = sortPixels(pixels, map, mode);
    }

    /**
     * Sends a value through the socket. It's recommended to use emit() over this.
     * @param value The value to send.
     */
    send(value: string | unknown[] | Buffer | Uint8Array): void {
        this.getConnection().send(value);
    }

    /**
     * Emits a packet type and value through the socket.
     * @param type Packet type.
     * @param value Value. If not set, no value will be sent through other than the packet name.
     */
    emit<T extends keyof PacketSendMap>(type: T, value?: PacketSendMap[T]): void {
        this.getConnection().emit(type, value);
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
     * @returns A promise that resolves once the image is done drawing, contains place results for all placed pixels.
     */
    async drawImage(image: Image): Promise<PlaceResults[][]> {
        this.stats.images.drawing++;

        const res = await new ImageDrawer(this, image).begin();

        this.stats.images.drawing--;
        this.stats.images.finished++;

        return res;
    }

    /**
     * Plays an animation. If repeats is -1, it'll play forever and will skip the await. You can then use AnimationDrawer#stop
     */
    async playAnimation(animation: Animation): Promise<AnimationDrawer> {
        this.stats.animations.playing++;

        const drawer = new AnimationDrawer(this, animation);
        await drawer.draw();

        this.stats.animations.playing--;
        this.stats.animations.finished++;

        return drawer;
    }

    /**
     * Draws text.
     * @param text Data for the text
     * @returns The ending position of the text.
     */
    async drawText(text: TextData): Promise<[number, number]> {
        return await new TextWriter(this, text).begin();
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
    async drawLine(line: Line) {
        
        this.stats.lines.drawing++;

        await new LineDrawer(this, line).begin();

        this.stats.lines.drawing--;
        this.stats.lines.finished++;

    }

    readQueue(): readonly IQueuedPixel[] {
        return this.sendQueue as readonly IQueuedPixel[];
    }

    /**
     * Draws a rectangle
     * @param x X position of rectangle
     * @param y Y position of rectangle
     * @param width width of rectangle
     * @param height height of rectangle
     * @param color color or function that maps x,y to color
     */
    async drawRect(rect: Rectangle): Promise<PlaceResults[][]> {
        return GeometryDrawer.drawRect(this, rect);
    }

    async drawOutline(outline: Outline): Promise<PlaceResults[][]> {
        return GeometryDrawer.drawOutline(this, outline);
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
        this.stats.pixels.placing.ping = this.connection!.getConfirmPing();
        return this.stats;
    }

    /**
     * @returns If the chat is loaded or not. (true/false)
     */
    isChatLoaded(): boolean {
        return this.getConnection().isChatLoaded();
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
        return this.getConnection().getAreas();
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
        return this.getConnection().getAreaById(id);
    }

    /**
     * @returns If a war is occurring (true/false)
     */
    isWarOccurring(): boolean {
        return this.getConnection().isWarOccurring();
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
        return this.getConnection().getCurrentWarZone();
    }

    /**
     * Sets the request headers. This will automatically add the auth cookie.
     * @param headers An object of headers.
     */
    setHeaders(ogFunc: HeadersFunc) {
        const headersFunc = (type: HeaderTypes) => {
            const data = ogFunc(type, this.boardId);
            data.cookie = this.connection!.generateAuthCookie() + " " + data.cookie;
            return data;
        };

        this.headers = headersFunc;
        this.netUtil.headers = this.headers;
        if(this.connected()) {
            this.connection!.headers = this.headers;
            this.connection!.canvas.headers = this.headers;
        }
    }

    private wipeLine() {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }

    private addDebuggerInternal() {
        this.on(Packets.RECEIVED.LIB_RAW, (message) => {
            if(message.startsWith('42["p",[')) {
                if(this.debuggerOptions.ignorePixelPacket) return;
                if(this.debuggerOptions.shrinkPixelPacket) {
                    message = message.substring(0, 60) + (message.length > 60 ? "..." : "");
                }
            }

            if(this.debuggerOptions.lineClears) this.wipeLine();
            process.stdout.write(`\x1b[41m⬇ ${message} \x1b[0m\n`);
        });
        this.on(Packets.RECEIVED.LIB_SENT, (message) => {
            if(message.startsWith('42["p",[')) {
                if(this.debuggerOptions.ignorePixelPacket) return;
            }

            if(this.debuggerOptions.lineClears) this.wipeLine();
            process.stdout.write(`\x1b[42m⬆ ${message} \x1b[0m\n`);
        });
    }

    /**
     * Adds a listener for all sent and received packets
     */
    addDebugger(settings: IDebuggerOptions = {}): void {
        this.debugger = true;
        this.debuggerOptions = settings;
        if(this.connected()) {
            this.addDebuggerInternal();
        }
    }

    /**
     * Generates a random color
     */
    getRandomColor(): Color {
        return Canvas.Canvas.getRandomColor();
    }

    /**
     * @returns If the spot is protected or not
     */
    isProtected(x: number, y: number): boolean {
        return this.protector.getColor(x, y) != undefined;
    }

    /**
     * Gets the regional data for a pixel
     * 
     * This only works on canvas 7.
     * 
     * Region data has the name, botting status, and repairing status.
     */
    getRegionAt(x: number, y: number): Canvas.RegionData {
        return this.getCanvas()?.getRegionAt(x, y);
    }

    /**
     * Creates the UID manager. This is internal use.
     */
    createUIDMan() {
        if(!this.premium) throw new Error(`Cannot create when not premium.`);
        if(this.uidman) throw new Error(`Uid manager already exists.`);
        this.uidman = new UIDManager(this);
    }

}