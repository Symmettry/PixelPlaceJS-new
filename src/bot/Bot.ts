import * as Canvas from '../util/Canvas.js';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/data/Packets.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/data/Modes.js';
import { IImage, IPixel, IUnverifiedPixel, IStatistics, defaultStatistics, IRGBColor, IQueuedPixel } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';
import { Connection } from './Connection.js';
import { constant } from '../util/Constant.js';

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
    private trueQueueSize: number = 0;
    private goingThroughQueue: number = 0;

    autoRestart: boolean;
    handleErrors: boolean;

    uidman: UIDManager;

    private connection!: Connection;
    rate: number = -1;

    constructor(auth: Auth, autoRestart: boolean = true, handleErrors: boolean = true) {
        this.authKey = auth.authKey();
        this.authToken = auth.authToken();
        this.authId = auth.authId();

        constant(this, 'boardId', auth.boardId);
        
        this.autoRestart = autoRestart;
        this.handleErrors = handleErrors;
        this.uidman = new UIDManager(this);

        this.Load = this.Load.bind(this);
        this.Connect = this.Connect.bind(this);
        this.Init = this.Init.bind(this);
    }

    getUsername(uid: string | number): string | undefined {
        return this.uidman.getUsername(uid);
    }

    getCanvas(): Canvas.Canvas {
        return this.connection.canvas;
    }

    on(key: string, func: (...args: unknown[]) => void): void {
        this.connection.on(key, func);
    }

    async Init(): Promise<void> {
        return new Promise<void>((resolve) => this.Connect().then(this.Load).then(resolve));
    }

    async Connect(): Promise<void> {
        this.connection = new Connection(this, this.authKey, this.authToken, this.authId, this.boardId, this.stats);
        this.authKey = this.authToken = this.authId = "[REDACTED]";
        return this.connection.Connect();
    }

    async Load(): Promise<void> {
        if (!this.connection) {
            throw new Error("Connection not initialized.");
        }
        return this.connection.Load();
    }

    getPixelAt(x: number, y: number): number | undefined {
        return this.getCanvas()?.pixelData?.get(x, y);
    }

    getClosestColorId(rgb: IRGBColor): number {
        return this.getCanvas()?.getClosestColorId(rgb);
    }

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

    private userDefPlaceSpeed: (prevValue?: number) => number = () => 16;
    suppress: boolean = false;
    checkRate: number = -2;

    setPlacementSpeed(arg: (prevValue?: number) => number | number, autoFix: boolean=true, suppress: boolean=false) {
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

    async placePixel(...args: [IPixel] | [number, number, number, number?, boolean?, boolean?]): Promise<void> {
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
                force: args[5] as boolean || false
            };
        } else throw new Error('Invalid arguments for placePixel.');

        return this.placePixelInternal(pixel);
    }

    // alternative protect in case of bugs
    protect(x: number, y: number, col: number): void {
        this.protector.protect(x, y, col);
    }

    private resolvePacket(queuedPixel: IQueuedPixel): void {
        this.trueQueueSize--;
        this.goThroughPixels();
        queuedPixel.resolve();
        this.goingThroughQueue--;
    }

    private goThroughPixels(): void {

        if(this.trueQueueSize == 0)return;

        const queuedPixel = this.sendQueue.shift();

        if(queuedPixel == null)return; // shouldn't but just in case

        this.goingThroughQueue++;

        const colAtSpot = this.getPixelAt(queuedPixel.data.x, queuedPixel.data.y);
        if(colAtSpot == null || (!queuedPixel.data.force && colAtSpot == queuedPixel.data.col) || colAtSpot == 65535) { // 65535 is ocean.
            this.resolvePacket(queuedPixel);
            return this.goThroughPixels();
        }

        if(queuedPixel.speed > 0) {
            setTimeout(() => this.sendPixel(queuedPixel, colAtSpot), queuedPixel.speed);
            return;
        }
        this.sendPixel(queuedPixel, colAtSpot);
    }
    private sendPixel(queuedPixel: IQueuedPixel, origCol: number): void {
        const {x, y, col, brush } = queuedPixel.data;

        this.resolvePacket(queuedPixel);

        this.emit(Packets.SENT.PIXEL, `[${x},${y},${col},${brush}]`);
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
        this.trueQueueSize++;
        this.sendQueue.push(p);
        if(this.goingThroughQueue <= 1) {
            this.goThroughPixels();
        }
    }

    private async placePixelInternal(p: IPixel, forcePlacementSpeed: number=-1): Promise<void> {

        const {x, y, col, protect } = p;

        if(x > this.connection.canvas.canvasWidth || x < 0 || y > this.connection.canvas.canvasHeight || y < 0) {
            throw `Out of bounds pixel: ${x},${y}`;
        }

        if(this.resendQueue.length > 0) {
            const pixel: IPixel | undefined = this.resendQueue.shift();
            if(pixel != null) {
                await this.placePixelInternal(pixel);
            }
        }

        const placementSpeed = forcePlacementSpeed == -1 ? this.getPlacementSpeed() : forcePlacementSpeed;

        if(protect) {
            this.protector.protect(x, y, col);
        }

        return new Promise<void>((resolve) => this.addToSendQueue({data: p, speed: placementSpeed, resolve}) );
    }

    emit(key: Packets, value: string): void {
        this.connection.emit(key, value);
    }
    send(value: string | unknown[] | Buffer | Uint8Array): void {
        this.connection.send(value);
    }
    
    async drawImage(...args: [IImage] | [number, number, string, Modes?, boolean?, boolean?]): Promise<void> {
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
                force: args[5] as boolean || false
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

    getStatistics(): IStatistics {
        // updating values
        this.stats.session.time = Date.now() - this.stats.session.beginTime;
        const timeSinceFirstPixel = Date.now() - this.stats.pixels.placing.first_time;
        this.stats.pixels.placing.per_second = this.stats.pixels.placing.placed / (timeSinceFirstPixel * 0.001);
        return this.stats;
    }

}