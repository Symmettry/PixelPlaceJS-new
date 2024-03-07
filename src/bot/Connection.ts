import { getPalive, getTDelay } from '../util/ping/PAlive.js';
import * as Canvas from "../util/Canvas";
import { Bot } from "./Bot";
import WebSocket from "ws";
import { Packets } from "../util/data/Packets";
import { IStatistics } from "../util/data/Data";
import { Protector } from '../util/Protector';
import { constant } from '../util/Constant.js';

export class Connection {

    private bot: Bot;

    private boardId!: number;
    private isWorld: boolean = true;
    canvas!: Canvas.Canvas;

    private authKey!: string;
    private authToken!: string;
    private authId!: string;

    private stats: IStatistics;

    private socket!: WebSocket;
    private connected: boolean = false;
    private canvasPictureLoaded: boolean = false;
    private canvasValue!: number[][];
    private listeners!: Map<string, ((...args: unknown[]) => void)[]>;

    private tDelay: number = 0;
    private econnrefusedTimer: number = 0;

    chatLoaded: boolean = false;

    constructor(bot: Bot, authKey: string, authToken: string, authId: string, boardId: number, stats: IStatistics) {
        this.bot = bot;
        this.authKey = authKey;
        this.authToken = authToken;
        this.authId = authId;
        this.stats = stats;

        constant(this, 'boardId', boardId);

        constant(this, 'listeners', new Map());
    }

    private ping() {
        fetch("https://pixelplace.io/api/ping.php", {
            headers:{
                Origin: "https://pixelplace.io/",
                Cookie: `authId=${this.authId};authKey=${this.authKey};authToken=${this.authToken};`
            }
        })
    }

    async Start() {
        return new Promise<void>((resolve) => this.Connect().then(this.Load).then(resolve));
    }

    async Connect() {

        if(this.socket && this.socket.readyState == 1) throw "Bot already connected.";

        return new Promise<void>((resolve) => {
            // connect to PixelPlace
            this.socket = new WebSocket('wss://pixelplace.io/socket.io/?EIO=4&transport=websocket');

            if(Canvas.hasCanvas(this.boardId)) {
                this.isWorld = false;
            }

            // create the canvas
            this.canvas = Canvas.getCanvas(this.boardId);

            this.socket.on('close', () => {
                this.socketClosed();
            });

            this.socket.on('open', () => {
                resolve();
            });

            this.socket.on('error', (error: Error) => {
                this.socketError(error);
                if(error.message.startsWith("connect ECONNREFUSED") && Date.now() - this.econnrefusedTimer > 10000) { // this means it couldn't connect
                    this.econnrefusedTimer = Date.now();
                    this.socket.close();
                    console.error(`Pixelplace was unable to connect! Try checking if pixelplace is online and disabling vpns then verifying that you can connect to pixelplace normally.${this.bot.autoRestart ? " Auto restart is enabled; this will repeat every 10 seconds if continuing." : ""}`);
                }
            });
        });
    }

    async Load() {

        if(!this.socket) throw "Bot has not connected yet.";

        return new Promise<void>((resolve) => {
            this.socket.on('message', async (buffer: Buffer) => {
                await this.evaluatePacket(buffer, resolve);
            });
        });
    }

    private socketClosed() {
        this.connected = false;
        this.chatLoaded = false;
        if(this.listeners.has(Packets.LIBRARY.SOCKET_CLOSE)) {
            this.listeners.get(Packets.LIBRARY.SOCKET_CLOSE)?.forEach(listener => listener());
        }
        if(this.bot.autoRestart) {
            setTimeout(() => this.Start(), 1000);
        }
    }

    private socketError(error: Error) {
        if(this.listeners.has(Packets.LIBRARY.ERROR)) {
            this.listeners.get(Packets.LIBRARY.ERROR)?.forEach(listener => listener(error));
        }

        // statistics
        this.stats.session.errors++;
    }

    private async loadCanvas(value: number[][], resolve: (value: void | PromiseLike<void>) => void) {
        if(this.isWorld)await this.canvas.loadCanvasData(value);
        this.stats.session.beginTime = Date.now();

        setInterval(this.ping, 250000);

        setTimeout(resolve, 1000);
    }

    private async evaluatePacket(buffer: Buffer, resolve: (value: void | PromiseLike<void>) => void) {
        const data: string = buffer.toString(); // buffer -> string

        if(this.listeners.has(Packets.RAW)) {
            this.listeners.get(Packets.RAW)?.forEach(listener => listener(data));
        }
                
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
                if(this.authKey == "-") {
                    this.socket.send(`42["init",{"authKey":undefined,"authToken":undefined,"authId":undefined,"boardId":${this.boardId}}]`);
                } else {
                    this.socket.send(`42["init",{"authKey":"${this.authKey}","authToken":"${this.authToken}","authId":"${this.authId}","boardId":${this.boardId}}]`);
                }

                setTimeout(() => {
                    if(!this.connected) {
                        console.error("Pixelplace has not responded in 10 seconds! Verify your auth data is correct and that pixelplace is online!");
                    }
                }, 10000);
                break;
            case "2": // socket.io keepalive
                this.socket.send("3");
                break;
            case "42": {// message
                const key = message[0];
                const value = message[1];

                // Packet listeners
                this.listen(key, value);

                this.stats.socket.received++;

                // built-in functions, e.g. keepalive and pixels.
                switch(key) {
                    case Packets.RECEIVED.RATE_CHANGE:
                        this.bot.rate = value;

                        if(this.bot.checkRate == -2) {
                            this.bot.setPlacementSpeed(value, true, this.bot.suppress);
                        }

                        if(this.bot.checkRate < 0 || this.bot.suppress) break;

                        if(this.bot.checkRate < value) {
                            console.warn(`~~WARN~~ (Rate change) Placement speed under ${value} (Current rate_change value) may lead to rate limit or even a ban! Automatically fix this with setPlacementSpeed(${this.bot.checkRate}, true)`);
                        }
                        break;
                    case Packets.RECEIVED.CHAT_STATS: // Although repeated frequently, this is the first packet sent after init, so we'll use it.
                        if(!this.isWorld || this.bot.protector) break;

                        await this.canvas.Init();
                        this.bot.protector = new Protector(this.bot, this.stats); // pass in the bot instance & private statistics variable
                        await this.canvas.loadCanvasPicture();
                        this.canvasPictureLoaded = true;
                        if(this.connected) {
                            if(this.canvasValue == null) throw "Something bad happened. Please make an issue report on the github.";
                            this.loadCanvas(this.canvasValue, resolve);
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
                    case Packets.RECEIVED.CANVAS: { // canvas
                        this.connected = true;
                        this.canvasValue = value;
                        if(this.canvasPictureLoaded) {
                            return this.loadCanvas(value, resolve);
                        }
                        break;
                    }
                    case Packets.RECEIVED.SERVER_TIME:
                        this.tDelay = getTDelay(value); // ping.alive stuff
                        break;
                    case Packets.RECEIVED.USERNAME:
                        // pass the username data to the uid manager
                        this.bot.uidman.onUsername(value.id, value.name);
                        break;
                    case Packets.RECEIVED.CHAT_LOADED:
                        this.chatLoaded = true;
                        break;
                }
                break;
            }
        }
    }

    private listen(key: string, value: unknown) {
        // per-key
        if(this.listeners.has(key)) { // if there are listeners for this key
            this.listeners.get(key)?.forEach(listener => listener(value)); // then send the value!
        }
        // all-keys
        if(this.listeners.has(Packets.ALL)) {
            this.listeners.get(Packets.ALL)?.forEach(listener => listener(key, value));
        }
    }

    on(key: string, func: (...args: unknown[]) => void) {
        if(!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key)?.push(func);
    }

    emit(key: Packets, value: string) {
        const data = `42["${key}",${value}]`;
    
        this.send(data);
    }
    send(value: Buffer | Uint8Array | string | unknown[]) {
        this.socket.send(value);

        // statistics
        this.stats.socket.sent++;
    }
    
}