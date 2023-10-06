import { getPalive } from '../util/ping/PAlive.js';
import getTDelay from '../util/ping/TDelay.js';
import * as Canvas from '../util/Canvas.js';
import WebSocket from 'ws';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/Packets.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/drawing/Modes.js';

export class Bot {
    
    listeners!: Map<string, Function[]>;

    socket!: WebSocket;

    canvas!: Canvas.Canvas;
    isWorld: boolean = true;

    boardId!: number;
    authKey!: string;
    authToken!: string;
    authId!: string;
    
    pixels!: number[][];

    lastPlaced!: number;

    tDelay: number = 0;

    protector!: Protector;

    constructor(auth: Auth) {
        Object.defineProperty(this, 'authKey', {value: auth.authKey, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authToken', {value: auth.authToken, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authId', {value: auth.authId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'boardId', {value: auth.boardId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'listeners', {value: new Map(), writable: false, enumerable: true, configurable: false});
        
        this.lastPlaced = 0;
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
            
            this.pixels = [];

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
                        if(this.listeners.has(key)) { // if there are listeners for this key
                            this.listeners.get(key)?.forEach(listener => listener(value)); // then send the value!
                        }
                        switch(key) {
                            case Packets.RECEIVED.CHAT_STATS: // sent once initiated
                                if(this.isWorld && !this.protector) {
                                    await this.canvas.init();
                                    this.protector = new Protector(this.canvas.canvasHeight, this.canvas.canvasWidth);
                                    this.protector.detectAll(this);
                                    await this.canvas.loadCanvasPicture();
                                }
                                break;
                            case Packets.RECEIVED.PING_ALIVE: // pixelplace keepalive
                                this.socket.send(`42["pong.alive", "${getPalive(this.tDelay)}"]`)
                                break;
                            case Packets.RECEIVED.PIXEL: // pixels
                                if(this.isWorld)this.canvas.loadCanvasData(value);
                                //if(this.protector)this.protector.detectPixels(this, value);
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

    genPlacementSpeed(): number {
        return Math.floor(Math.random() * 11) + 30;
    }

    async placePixel(x: number, y: number, col: number, brush: number=1, protect: boolean=false, force: boolean=false): Promise<void> {
        const deltaTime = Date.now() - this.lastPlaced;
        var placementSpeed = this.genPlacementSpeed();
        if(deltaTime < placementSpeed) {
            return new Promise<void>(async (resolve, _reject) => {
                setTimeout(async () => {
                    await this.placePixel(x, y, col, brush, protect, force);
                    resolve();
                }, placementSpeed - deltaTime + 1);
            })
        } else {
            return new Promise<void>((resolve, _reject) => {
                if(protect) {
                    this.protector.protect(x, y, col);
                }
                if(!force && this.getPixelAt(x, y) == col) {
                    resolve();
                } else {
                    var data = `[${x}, ${y}, ${col}, ${brush}]`;
                    this.emit("p", data);
                    this.lastPlaced = Date.now();
                    setTimeout(resolve, placementSpeed - (deltaTime - placementSpeed) + 1);
                }
            });
        }
    }

    emit(key: string, value: any): void {
        const data = `42["${key}",${value.toString()}]`;
        this.socket.send(data);
    }
    
    async drawImage(x: number, y: number, path: string, mode: Modes=Modes.LEFT_TO_RIGHT, protect: boolean=false, force: boolean=false): Promise<void> {
        const drawer: ImageDrawer = new ImageDrawer(this, x, y, path, mode, protect, force);
        await drawer.begin();
    }

}