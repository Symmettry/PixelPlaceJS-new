import { getPalive } from '../util/ping/PAlive.js';
import getTDelay from '../util/ping/TDelay.js';
import * as Canvas from "../util/Canvas";
import { Bot } from "./Bot";
import WebSocket from "ws";
import { Packets } from "../util/data/Packets";
import { IStatistics } from "../util/data/Data";
import { Protector } from '../util/Protector';

export class Connection {

    private bot: Bot;

    private isWorld: boolean = true;

    private boardId!: number;
    private authKey!: string;
    private authToken!: string;
    private authId!: string;

    private listeners!: Map<string, Function[]>;

    private tDelay: number = 0;

    private socket!: WebSocket;

    packets: Array<[string, any]> | undefined;

    private stats: IStatistics;

    canvas!: Canvas.Canvas;

    constructor(bot: Bot, authKey: string, authToken: string, authId: string, boardId: number, stats: IStatistics) {
        this.bot = bot;
        this.authKey = authKey;
        this.authToken = authToken;
        this.authId = authId;
        this.stats = stats;

        Object.defineProperty(this, 'boardId', {value: boardId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'listeners', {value: new Map(), writable: false, enumerable: true, configurable: false});
    }

    Init() {
        return new Promise<void>((resolve, _reject) => {
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
                                if(this.isWorld && !this.bot.protector) {
                                    await this.canvas.init();
                                    this.bot.protector = new Protector(this.bot, this.stats); // pass in the bot instance & private statistics variable
                                    await this.canvas.loadCanvasPicture();
                                }
                                break;
                            case Packets.RECEIVED.PING_ALIVE: // pixelplace keepalive
                                this.socket.send(`42["pong.alive", "${getPalive(this.tDelay)}"]`)
                                break;
                            case Packets.RECEIVED.PIXEL: // pixels
                                if(this.isWorld)this.canvas.loadCanvasData(value);
                                if(this.bot.protector)await this.bot.protector.detectPixels(value);
                                
                                // pass the pixel update to the uid manager
                                this.bot.uidman.onPixels(value);

                                // go through and verify if the pixels the bot placed were actually sent
                                this.bot.verifyPixels();
                                break;
                            case Packets.RECEIVED.CANVAS: // canvas
                                if(this.isWorld)this.canvas.loadCanvasData(value);
                                this.stats.session.beginTime = Date.now();
                                resolve();
                                loadedCanvas = true;
                                break;
                            case Packets.RECEIVED.SERVER_TIME:
                                this.tDelay = getTDelay(value);
                                break;
                            case Packets.RECEIVED.USERNAME:
                                // pass the username data to the uid manager
                                this.bot.uidman.onUsername(value.id, value.name);
                                break;
                        }
                        break;
                }
            });

            this.socket.on('close', () => {
                if(this.listeners.has(Packets.LIBRARY.SOCKET_CLOSE)) {
                    this.listeners.get(Packets.LIBRARY.SOCKET_CLOSE)?.forEach(listener => listener());
                }
                if(this.bot.autoRestart) {
                    this.Init();
                }
            });

            this.socket.on('error', (error: Error) => {
                if(this.listeners.has(Packets.LIBRARY.ERROR)) {
                    this.listeners.get(Packets.LIBRARY.ERROR)?.forEach(listener => listener());
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

    on(key: string, func: Function) {
        if(!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key)?.push(func);
        if(key != Packets.ALL) {
            this.on(Packets.ALL, func);
        }

        if(Date.now() - this.stats.session.beginTime < 500) {
            this.packets?.forEach(packetData => {
                this.listen(packetData[0], packetData[1]);
            });
            this.packets = undefined;
        }
    }

    emit(key: Packets, value: any) {
        const data = `42["${key}",${value.toString()}]`;
        this.socket.send(data);

        // statistics
        this.stats.socket.sent++;
    }
    
}