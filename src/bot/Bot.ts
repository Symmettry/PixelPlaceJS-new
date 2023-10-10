import * as Canvas from '../util/Canvas.js';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/data/Packets.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/drawing/Modes.js';
import { IImage, IPixel, IUnverifiedPixel, IStatistics, defaultStatistics } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';
import { Connection } from './Connection.js';
import { constant } from '../util/Constant.js';

export class Bot {

    protector!: Protector;
    private authKey!: string;
    private authToken!: string;
    private authId!: string;
    private boardId!: number;

    private lastPlaced!: number;
    private prevPlaceValue!: number;

    private sendQueue: Array<IPixel> = [];
    private unverifiedPixels: Array<IUnverifiedPixel> = [];

    autoRestart: boolean;

    uidman: UIDManager;

    private connection!: Connection;

    constructor(auth: Auth, autoRestart: boolean = true) {
        constant(this, 'authKey', auth.authKey);
        constant(this, 'authToken', auth.authToken);
        constant(this, 'authId', auth.authId);

        constant(this, 'boardId', auth.boardId);
        
        this.lastPlaced = 0;
        this.prevPlaceValue = 0;
        this.autoRestart = autoRestart;
        this.uidman = new UIDManager(this);
    }

    getUsername(uid: string | number): string | undefined {
        return this.uidman.getUsername(uid);
    }

    getCanvas(): Canvas.Canvas {
        return this.connection.canvas;
    }

    on(key: string, func: Function): void {
        this.connection.on(key, func);
    }

    async Init(): Promise<void> {
        this.connection = new Connection(this, this.authKey, this.authToken, this.authId, this.boardId, this.stats);
        return this.connection.Init();
    }

    getPixelAt(x: number, y: number): number | undefined {
        return this.connection.canvas.pixelData?.get(x, y);
    }

    getClosestColorId(r: number, g: number, b: number): number {
        return this.connection.canvas?.getClosestColorId(r, g, b);
    }

    verifyPixels() {
        let successful = this.unverifiedPixels.length;
        for (let i = this.unverifiedPixels.length - 1; i >= 0; i--) {
            const pixel = this.unverifiedPixels[i];
            if(this.getPixelAt(pixel.data.x, pixel.data.y) != pixel.data.col) {
                this.sendQueue.push(pixel.data); // pixels were not sent, redo them
                this.connection.canvas?.pixelData?.set(pixel.data.x, pixel.data.y, pixel.originalColor);

                // statistics
                this.stats.pixels.placing.failed++;
                this.stats.pixels.colors[pixel.data.col]--;
                successful--;
            }
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
    private userDefPlaceSpeed: Function = () => 30;

    setPlacementSpeed(arg: Function | number, supress: boolean=false) {
        if(typeof arg == 'function') {
            this.userDefPlaceSpeed = arg;
        } else {
            if(!supress && arg < 20) {
                console.warn(`~~WARN~~ Placement speed under 20 may lead to rate limit or even a ban! (Suppress with setPlacementSpeed(${arg}, true); not recommended)`);
            }
            this.userDefPlaceSpeed = () => arg;
        }
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
        } else {
            throw new Error('Invalid arguments for placePixel.');
        }

        return this.placePixelInternal(pixel);
    }

    // alternative protect in case of bugs
    protect(x: number, y: number, col: number) {
        this.protector.protect(x, y, col);
    }

    private async placePixelInternal(p: IPixel, forcePlacementSpeed: number=-1): Promise<void> {

        if(this.sendQueue.length > 0) {
            const pixel: IPixel | undefined = this.sendQueue.shift();
            if(pixel != null) {
                await this.placePixelInternal(pixel);
            }
        }

        const {x, y, col, brush, protect, force} = p;

        const placementSpeed = forcePlacementSpeed == -1 ? this.getPlacementSpeed() : forcePlacementSpeed;

        if(protect) {
            this.protector.protect(x, y, col);
        }

        const colAtSpot = this.getPixelAt(x, y)
        if((!force && colAtSpot == col)) {
            return;
        }

        const deltaTime = Date.now() - this.lastPlaced;
        if(deltaTime < placementSpeed) {
            return new Promise<void>(async (resolve, _reject) => {
                const newPlacementSpeed = this.getPlacementSpeed();
                setTimeout(async () => {
                    await this.placePixelInternal(p, newPlacementSpeed);
                    resolve();
                }, newPlacementSpeed - deltaTime + 1);
            })
        } else {
            return new Promise<void>(async (resolve, _reject) => {

                const arr: IUnverifiedPixel = {data: {x,y,col,brush,protect,force}, originalColor: colAtSpot || 0};
                this.unverifiedPixels.push(arr);

                this.emit("p", `[${x}, ${y}, ${col}, ${brush}]`);

                this.connection.canvas?.pixelData?.set(x, y, col);
                
                this.lastPlaced = Date.now();
                setTimeout(resolve, placementSpeed - (deltaTime - placementSpeed) + 1);

                // statistics
                this.stats.pixels.placing.attempted++;

                if(!this.stats.pixels.colors[col])this.stats.pixels.colors[col] = 0;
                this.stats.pixels.colors[col]++;
            });
        }
    }

    emit(key: Packets, value: any): void {
        this.connection.emit(key, value);
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
        } else {
            throw new Error('Invalid arguments for drawImage.');
        }
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