import { getPalive } from '../util/ping/PAlive.js';
import getTDelay from '../util/ping/TDelay.js';
import * as Canvas from '../util/Canvas.js';
import WebSocket from 'ws';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/Packets.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/drawing/Modes.js';
import { Pixel } from '../util/Pixel.js';

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

    private sendQueue: Array<Pixel> = [];
    private unverifiedPixels: Array<Pixel> = [];

    constructor(auth: Auth) {
        Object.defineProperty(this, 'authKey', {value: auth.authKey, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authToken', {value: auth.authToken, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authId', {value: auth.authId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'boardId', {value: auth.boardId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'listeners', {value: new Map(), writable: false, enumerable: true, configurable: false});
        
        this.lastPlaced = 0;
    }

    getCanvas(): Canvas.Canvas {
        return this.canvas;
    }

    on(key: string, func: Function): void {
        if(!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key)?.push(func);
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

            // currently redundant
            this.socket.on('open', () => {
            
            });

            this.socket.on('message', async (buffer: Buffer) => {
                var data: string = buffer.toString(); // buffer -> string
                
                // Gets the data and ID of the response
                let index = data.indexOf("{");
                var cube = data.indexOf("[");
                if (index === -1 || (cube < index && cube != -1)) {
                    index = cube;
                }
                const json = index !== -1 ? index : -1; 
                var id = json == -1 ? data : data.substring(0, json);

                // if JSON, parse, else keep it
                var message = json == -1 ? data.substring(id.length) : JSON.parse(data.substring(json));
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
                        var key = message[0];
                        var value = message[1];

                        // Packet listeners
                        // per-key
                        if(this.listeners.has(key)) { // if there are listeners for this key
                            this.listeners.get(key)?.forEach(listener => listener(value)); // then send the value!
                        }
                        // all-keys
                        if(this.listeners.has(Packets.ALL)) {
                            this.listeners.get(Packets.ALL)?.forEach(listener => listener(value));
                        }

                        // built-in functions, e.g. keepalive and pixels.
                        switch(key) {
                            case Packets.RECEIVED.CHAT_STATS: // sent once initiated
                                if(this.isWorld && !this.protector) {
                                    await this.canvas.init();
                                    this.protector = new Protector(this.canvas.canvasHeight, this.canvas.canvasWidth);
                                    await this.canvas.loadCanvasPicture();
                                }
                                break;
                            case Packets.RECEIVED.PING_ALIVE: // pixelplace keepalive
                                this.socket.send(`42["pong.alive", "${getPalive(this.tDelay)}"]`)
                                break;
                            case Packets.RECEIVED.PIXEL: // pixels
                                if(this.isWorld)this.canvas.loadCanvasData(value);
                                if(this.protector)await this.protector.detectPixels(this, value);
                                  
                                // go through and verify if the pixels were actually sent
                                this.verifyPixels(value);  
                                break;
                            case Packets.RECEIVED.CANVAS: // canvas
                                if(this.isWorld)this.canvas.loadCanvasData(value);
                                resolve();
                                break;
                            case Packets.RECEIVED.SERVER_TIME:
                                this.tDelay = getTDelay(value);
                                break;
                        }
                        break;
                }
            });

            this.socket.on('close', () => {
                console.log('PPJS Closed, restarting');
                this.Init();
            });

            this.socket.on('error', (error: Error) => {
                console.error('PPJS error:', error);
                reject(); // error, reject promise
            });
        });
    }

    getPixelAt(x: number, y: number): number | undefined {
        return this.canvas.pixelData?.get(x, y);
    }

    getColorId(r: number, g: number, b: number): number {
        return this.canvas.getColorId(r, g, b);
    }

    verifyPixels(value: Array<number[]>) {
        this.unverifiedPixels = this.unverifiedPixels.filter((pixel) => {
            return !value.some((numArr: number[]) => {
                return numArr[0] === pixel.x && numArr[1] === pixel.y && numArr[2] === pixel.col;
            });
        });
        for (let i = this.unverifiedPixels.length - 1; i >= 0; i--) {
            const pixel = this.unverifiedPixels[i];
            this.sendQueue.push(pixel); // pixels were not sent, redo them
        }
    }

    getPlacementSpeed: Function = () => 30;

    setPlacementSpeed(arg: Function | number, supress: boolean=false) {
        if(typeof arg == 'function') {
            this.getPlacementSpeed = arg;
        } else {
            if(!supress && arg < 20) {
                console.log(`WARN: Placement speed under 20 may lead to rate limit or even a ban! (Supress with setPlacementSpeed(${arg}, true))`);
            }
            this.getPlacementSpeed = () => arg;
        }
    }

    async placePixel(...args: [Pixel] | [number, number, number, number?, boolean?, boolean?]): Promise<void> {
        let pixel: Pixel;

        if (args.length === 1 && typeof args[0] === 'object') {
            pixel = args[0] as Pixel;
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

    private async placePixelInternal(p: Pixel, checkQueue: boolean=true): Promise<void> {
        const {x, y, col, brush, protect, force} = p;

        if(protect) {
            this.protector.protect(x, y, col);
        }
        if(!force && this.getPixelAt(x, y) == col) {
            return new Promise<void>((resolve, _reject) => resolve);
        }

        const deltaTime = Date.now() - this.lastPlaced;
        if(deltaTime < this.getPlacementSpeed()) {
            return new Promise<void>(async (resolve, _reject) => {
                setTimeout(async () => {
                    await this.placePixelInternal(p, checkQueue);
                    resolve();
                }, this.getPlacementSpeed() - deltaTime + 1);
            })
        } else {
            return new Promise<void>(async (resolve, _reject) => {
                if(checkQueue) {
                    while(this.sendQueue.length > 0) {
                        const pixel: Pixel | undefined = this.sendQueue.shift();
                        if(pixel != null) {
                            await this.placePixelInternal(pixel, false);
                        }
                    }
                }
                var arr: Pixel = {x,y,col,brush,protect,force};

                this.unverifiedPixels.push(arr);

                this.emit("p", `[${x}, ${y}, ${col}, ${brush}]`);

                this.lastPlaced = Date.now();
                setTimeout(resolve, this.getPlacementSpeed() - (deltaTime - this.getPlacementSpeed()) + 1);
            });
        }
    }

    emit(key: Packets, value: any): void {
        const data = `42["${key}",${value.toString()}]`;
        console.log(data);
        this.socket.send(data);
    }
    
    async drawImage(x: number, y: number, path: string, mode: Modes=Modes.LEFT_TO_RIGHT, protect: boolean=false, force: boolean=false): Promise<void> {
        const drawer: ImageDrawer = new ImageDrawer(this, x, y, path, mode, protect, force);
        await drawer.begin();
    }

}