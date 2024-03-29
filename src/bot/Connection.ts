import { getPalive, getTDelay } from '../util/ping/PAlive.js';
import * as Canvas from "../util/Canvas";
import { Bot } from "./Bot";
import WebSocket from "ws";
import { Packets } from "../util/data/Packets";
import { IStatistics } from "../util/data/Data";
import { Protector } from '../util/Protector';
import { constant } from '../util/Constant.js';
import { ErrorMessages, PPError } from '../util/data/Errors.js';
import fs from 'fs';
import path from 'path';

/**
 * Handles the connection between the bot and pixelplace. Not really useful for the developer.
 */
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
    private listeners!: Map<string | Packets, ((...args: unknown[]) => void)[]>;

    private tDelay: number = 0;
    private econnrefusedTimer: number = 0;

    private relog: () => Promise<{ authKey?: string | undefined; authToken?: string | undefined; authId?: string | undefined; }>;

    chatLoaded: boolean = false;

    constructor(bot: Bot, authKey: string, authToken: string, authId: string, boardId: number, stats: IStatistics) {
        this.bot = bot;
        this.authKey = authKey;
        this.authToken = authToken;
        this.authId = authId;
        this.stats = stats;

        constant(this, 'boardId', boardId);

        constant(this, 'listeners', new Map());

        this.relog = this.relogGenerator(this.authKey, this.authToken, this.authId);
        this.Load = this.Load.bind(this);
    }

    private relogGenerator(authKey: string, authToken: string, authId: string): () => Promise<{ authKey?: string | undefined; authToken?: string | undefined; authId?: string | undefined; }> {
        authKey = authKey == "deleted" ? "" : authKey;
        authToken = authToken == "deleted" ? "" : authToken;
        return async () => {
            if(authKey != "") {
                console.log("~~Refreshing auth data~~");
            }
            const authData = `authId=${authId};authKey=${authKey};authToken=${authToken}`;
            try {
                const response = await fetch("https://pixelplace.io/api/relog.php", {
                    method: "GET",
                    headers: {
                        "accept": "application/json",
                        "Cookie": authData
                    },
                    referrer: "https://pixelplace.io/7-pixels-world-war",
                    referrerPolicy: "strict-origin-when-cross-origin",
                    body: null,
                    mode: "cors",
                    credentials: "include"
                })
                const headers: { [key: string]: string } = {};
                response.headers.forEach((value, name) => {
                    headers[name] = value;
                });
                const setCookie = headers['set-cookie'];
                if(setCookie.startsWith("authKey=deleted")) {
                    console.log("Could not relog. Get new auth data and try again.");
                    return {};
                } else {
                    // if an error is thrown from tryna get [][1] it's fine since that's intentional (as it's an error lmao)
                    const authId = (setCookie.match(/authId=([^;]+)/) || [])[1];
                    const authKey = (setCookie.match(/authKey=([^;]+)/) || [])[1];
                    const authToken = (setCookie.match(/authToken=([^;]+)/) || [])[1];
        
                    this.relog = this.relogGenerator(authKey, authToken, authId);

                    const newAuthData = {authKey, authToken, authId};
                    
                    if(authKey != "deleted") {
                        fs.writeFileSync(path.join(process.cwd(), `ppjs-relog-authdata-${newAuthData.authKey.substring(0, 5)}.json`), JSON.stringify(newAuthData, null, 4));
                        console.log("~~Great! Auth data refreshed and saved~~");
                    }
                    return newAuthData;
                }
            } catch(err) {
                console.log("Error when getting auth data:", err);
                return {};
            }
        }
    }

    private async newInit(loggedIn: boolean) {
        const authData = await this.relog();
        if(!authData || Object.keys(authData).length == 0 || !authData.authId) {
            process.exit();
        }
        this.sendInit(loggedIn ? authData.authKey ?? null : null, loggedIn ? authData.authToken ?? null : null, authData.authId, this.boardId);
    }

    private ping() {
        fetch("https://pixelplace.io/api/ping.php", {
            headers:{
                Origin: "https://pixelplace.io/",
                Cookie: `authId=${this.authId};authKey=${this.authKey};authToken=${this.authToken};`
            }
        }).catch(err => {
            console.error(err);
        });
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

    private sendInit(authKey: string | null, authToken: string | null, authId: string, boardId: number): void {
        if(authKey == null && authToken == null) {
            this.send(`42["init",{"authId":"${authId}","boardId":${boardId}}]`);
            return;
        }
        this.send(`42["init",{"authKey":"${authKey}","authToken":"${authToken}","authId":"${authId}","boardId":${boardId}}]`);
    }

    private async evaluatePacket(buffer: Buffer, resolve: (value: void | PromiseLike<void>) => void) {
        const data: string = buffer.toString(); // buffer -> string

        if(this.listeners.has(Packets.LIBRARY.RAW)) {
            this.listeners.get(Packets.LIBRARY.RAW)?.forEach(listener => listener(data));
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
                this.send("40");
                break;
            case "40": // socket.io finish
                if(this.authKey == "" && this.authToken == "" && this.authId == "") {
                    await this.newInit(false); // will generate a default auth value
                } else {
                    this.sendInit(this.authKey, this.authToken, this.authId, this.boardId);
                }
                this.authKey = this.authToken = this.authId = "[REDACTED]";

                setTimeout(() => {
                    if(!this.connected) {
                        console.error("Pixelplace has not responded in 10 seconds! Verify your auth data is correct and that pixelplace is online!");
                    }
                }, 10000);
                break;
            case "2": // socket.io keepalive
                this.send("3");
                break;
            case "42": {// message
                const key = message[0];
                const value = message[1];

                // Packet listeners
                this.listen(key, value);

                this.stats.socket.received++;

                // built-in functions, e.g. keepalive and pixels.
                switch(key) {
                    case Packets.RECEIVED.ERROR: {

                        // process before checking handle errors
                        if(value == PPError.INVALID_AUTH) {
                            this.newInit(true);
                            break;
                        }

                        if(!this.bot.handleErrors)break;
                        const errorMessage = ErrorMessages[value as keyof typeof ErrorMessages];
                        switch(value) {
                            case PPError.LOGGED_OUT:
                                console.error("Auth data was invalid.");
                                process.exit();
                            // eslint-disable-next-line no-fallthrough
                            case PPError.TOO_MANY_INSTANCES:
                            case PPError.TOO_MANY_USERS_INTERNET:
                            case PPError.SELECT_USERNAME:
                            case PPError.PIXELPLACE_DISABLED:
                                console.error(errorMessage);
                                process.exit();
                            // eslint-disable-next-line no-fallthrough
                            case PPError.CANVAS_DISABLED:
                            case PPError.PREMIUM_ENDED_CANVAS:
                            case PPError.PRIVATE_CANVAS:
                            case PPError.NEED_CANVAS_APPROVAL:
                            case PPError.SESSION_EXPIRE:
                            case PPError.CANVAS_TERMINATED:
                            case PPError.SERVERS_FULL_AGAIN:
                            case PPError.SERVERS_FULL_LIMITED_PER_INTERNET:
                            case PPError.SERVERS_FULL_LIMITED_PER_USER:
                            case PPError.SERVER_FULL:
                            case PPError.RELOADING:
                            case PPError.ACCOUNT_DISABLED:
                            case PPError.PAINTING_ARCHIVED:
                                console.error(errorMessage);
                                this.socket.close();
                                break;
                            case PPError.INVALID_COLOR:
                            case PPError.COOLDOWN:
                            case PPError.ERROR_CANVAS_ACCESS_DATA:
                            case PPError.ERROR_CANVAS_DATA:
                            case PPError.INVALID_COORDINATES:
                            case PPError.PLACING_TOO_FAST:
                            case PPError.PREMIUM_COLOR:
                            case PPError.PREMIUM_ISLAND_MESSAGE:
                            case PPError.USER_OFFLINE:
                            case PPError.NEED_TO_BE_CONNECTED:
                            case PPError.MESSAGES_TOO_FAST:
                            case PPError.ACCOUNT_SUSPENDED_FROM_CHAT:
                            case PPError.ACCOUNT_BANNED_FROM_CHAT:
                            case PPError.NEED_USERNAME:
                            case PPError.CANT_SEND_COMMANDS:
                            case PPError.NEED_JOIN_GUILD:
                            case PPError.NEED_PREMIUM:
                            case PPError.GUILD_DISBANDED:
                            case PPError.KICKED_FROM_GUILD:
                                console.error(errorMessage);
                                break;
                        }
                        break;
                    }
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
                        this.send(`42["pong.alive", "${getPalive(this.tDelay)}"]`)
                        break;
                    case Packets.RECEIVED.PIXEL: // pixels
                        if(this.isWorld)this.canvas.loadPixelData(value);
                        if(this.bot.protector)await this.bot.protector.detectPixels(value);
                        
                        // pass the pixel update to the uid manager
                        if(this.bot.getUidManager() && value.length > 0 && value[0].length == 5) {
                            this.bot.getUidManager().onPixels(value);
                        }

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
                        if(this.bot.getUidManager()) {
                            this.bot.getUidManager().onUsername(value.id, value.name);
                        }
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
        if(this.listeners.has(Packets.LIBRARY.ALL)) {
            this.listeners.get(Packets.LIBRARY.ALL)?.forEach(listener => listener(key, value));
        }
    }

    on(key: string | Packets, func: (...args: unknown[]) => void) {
        if(!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key)?.push(func);
    }

    emit(key: Packets, ...value: unknown[]) {
        this.socket.emit(key.toString(), value);
    }
    send(value: Buffer | Uint8Array | string | unknown[]) {
        if(this.listeners.has(Packets.LIBRARY.SENT)) {
            this.listeners.get(Packets.LIBRARY.SENT)?.forEach(listener => listener(value));
        }
        this.socket.send(value);

        // statistics
        this.stats.socket.sent++;
    }
    
}