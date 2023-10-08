import { getPalive } from '../util/ping/PAlive.js';
import getTDelay from '../util/ping/TDelay.js';
import * as Canvas from '../util/Canvas.js';
import WebSocket from 'ws';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/data/Packets.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/drawing/Modes.js';
import { IImage, IPixel, IStatistics, defaultStatistics } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';

export class Bot {
    
    private socket!: WebSocket;
    private listeners!: Map<string, Function[]>;

    private canvas!: Canvas.Canvas;
    private protector!: Protector;
    private isWorld: boolean = true;

    private boardId!: number;
    private authKey!: string;
    private authToken!: string;
    private authId!: string;

    private tDelay: number = 0;

    private lastPlaced!: number;
    private prevPlaceValue!: number;

    private sendQueue: Array<IPixel> = [];
    private unverifiedPixels: Array<IPixel> = [];

    private autoRestart: boolean;

    private uidman: UIDManager;

    private beginTime: number = -1;
    private packets: Array<[string, any]> | undefined;

    constructor(auth: Auth, autoRestart: boolean = true) {
        Object.defineProperty(this, 'authKey', {value: auth.authKey, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authToken', {value: auth.authToken, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authId', {value: auth.authId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'boardId', {value: auth.boardId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'listeners', {value: new Map(), writable: false, enumerable: true, configurable: false});
        
        this.lastPlaced = 0;
        this.prevPlaceValue = 0;
        this.autoRestart = autoRestart;
        this.uidman = new UIDManager(this);
    }

    getUsername(uid: string | number): string | undefined {
        return this.uidman.getUsername(uid);
    }

    getCanvas(): Canvas.Canvas {
        return this.canvas;
    }

    on(key: string, func: Function): void {
        if(!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key)?.push(func);
        if(key != Packets.ALL) {
            this.on(Packets.ALL, func);
        }

        if(Date.now() - this.beginTime < 500) {
            this.packets?.forEach(packetData => {
                this.listen(packetData[0], packetData[1]);
            });
            this.packets = undefined;
        }
    }

    async Init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Connect to PixelPlace
            this.socket = new WebSocket('wss://pixelplace.io/socket.io/?EIO=4&transport=websocket');

            if(Canvas.hasCanvas(this.boardId)) {
                this.isWorld = false;
            }

            // Create the canvas
            this.canvas = Canvas.getCanvas(this.boardId);

            this.packets = [];
            let loadedCanvas = false;

            // currently redundant
            //this.socket.on('open', () => {
            //});

            this.socket.on('message', async (buffer: Buffer) => {
                const data: string = buffer.toString(); // buffer -> string
                
                // Gets the data and ID of the response
                let index = data.indexOf("{");
                const cube = data.indexOf("[");
                if (index === -1 || (cube < index && cube != -1)) {
                    index = cube;
                }
                const json = index !== -1 ? index : -1; 
                const id = json == -1 ? data : data.substring(0, json);

                // if JSON, parse, else keep it
                const message = json == -1 ? data.substring(id.length) : JSON.parse(data.substring(json));
                switch(id) {
                    case "0": // socket.io start
                        this.socket.send("40");
                        break;
                    case "40": // socket.io finish
                        this.socket.send(`42["init",{"authKey":"${this.authKey}","authToken":"${this.authToken}","authId":"${this.authId}","boardId":${this.boardId}}]`);
                        break;
                    case "2": // socket.io keepalive
                        this.socket.send("3");
                        break;
                    case "42": // message
                        const key = message[0];
                        const value = message[1];

                        // Packet listeners
                        this.listen(key, value);

                        if(!loadedCanvas) {
                            this.packets?.push([key, value]);
                        }

                        this.stats.socket.received++;

                        // built-in functions, e.g. keepalive and pixels.
                        switch(key) {
                            case Packets.RECEIVED.CHAT_STATS: // sent once initiated
                                if(this.isWorld && !this.protector) {
                                    await this.canvas.init();
                                    this.protector = new Protector(this, this.stats); // pass in the bot instance & private statistics variable
                                    await this.canvas.loadCanvasPicture();
                                }
                                break;
                            case Packets.RECEIVED.PING_ALIVE: // pixelplace keepalive
                                this.socket.send(`42["pong.alive", "${getPalive(this.tDelay)}"]`)
                                break;
                            case Packets.RECEIVED.PIXEL: // pixels
                                if(this.isWorld)this.canvas.loadCanvasData(value);
                                if(this.protector)await this.protector.detectPixels(value);
                                
                                // pass the pixel update to the uid manager
                                this.uidman.onPixels(value);

                                // go through and verify if the pixels the bot placed were actually sent
                                this.verifyPixels();
                                break;
                            case Packets.RECEIVED.CANVAS: // canvas
                                if(this.isWorld)this.canvas.loadCanvasData(value);
                                this.beginTime = Date.now();
                                resolve();
                                loadedCanvas = true;
                                break;
                            case Packets.RECEIVED.SERVER_TIME:
                                this.tDelay = getTDelay(value);
                                break;
                            case Packets.RECEIVED.USERNAME:
                                // pass the username data to the uid manager
                                this.uidman.onUsername(value.id, value.name);
                                break;
                        }
                        break;
                }
            });

            this.socket.on('close', () => {
                if(this.listeners.has(Packets.API.SOCKET_CLOSE)) {
                    this.listeners.get(Packets.API.SOCKET_CLOSE)?.forEach(listener => listener());
                }
                if(this.autoRestart) {
                    this.Init();
                }
            });

            this.socket.on('error', (error: Error) => {
                if(this.listeners.has(Packets.API.ERROR)) {
                    this.listeners.get(Packets.API.ERROR)?.forEach(listener => listener());
                }

                // statistics
                this.stats.session.errors++;
            });
        });
    }

    private listen(key: string, value: any) {
        // per-key
        if(this.listeners.has(key)) { // if there are listeners for this key
            this.listeners.get(key)?.forEach(listener => listener(value)); // then send the value!
        }
        // all-keys
        if(this.listeners.has(Packets.ALL)) {
            this.listeners.get(Packets.ALL)?.forEach(listener => listener(key, value));
        }
    }

    getPixelAt(x: number, y: number): number | undefined {
        return this.canvas.pixelData?.get(x, y);
    }

    getColorId(r: number, g: number, b: number): number {
        return this.canvas.getColorId(r, g, b);
    }

    verifyPixels() {
        for (let i = this.unverifiedPixels.length - 1; i >= 0; i--) {
            const pixel = this.unverifiedPixels[i];
            if(this.getPixelAt(pixel.x, pixel.y) != pixel.col) {
                this.sendQueue.push(pixel); // pixels were not sent, redo them
                this.unverifiedPixels.splice(i, 1);

                // statistics
                this.stats.pixels.placing.failed++;
                this.stats.pixels.placing.placed--;
                this.stats.pixels.colors[pixel.col]--;
            }
        }
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
        if(!force && this.getPixelAt(x, y) == col) {
            return new Promise<void>((resolve, _reject) => resolve);
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

                const arr: IPixel = {x,y,col,brush,protect,force};
                this.unverifiedPixels.push(arr);

                this.emit("p", `[${x}, ${y}, ${col}, ${brush}]`);
                
                this.lastPlaced = Date.now();
                setTimeout(resolve, placementSpeed - (deltaTime - placementSpeed) + 1);

                // statistics
                this.stats.pixels.placing.attempted++;
                this.stats.pixels.placing.placed++;

                if(!this.stats.pixels.colors[col])this.stats.pixels.colors[col] = 0;
                this.stats.pixels.colors[col]++;
            });
        }
    }

    emit(key: Packets, value: any): void {
        const data = `42["${key}",${value.toString()}]`;
        this.socket.send(data);

        // statistics
        this.stats.socket.sent++;
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
        this.stats.session.time = Date.now() - this.beginTime;
        this.stats.pixels.placing.per_second = this.stats.pixels.placing.placed / (this.stats.session.time / 1000);
        return this.stats;
    }

}