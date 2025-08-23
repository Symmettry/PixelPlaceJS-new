import * as Canvas from "../../util/canvas/Canvas";
import { Bot } from "../Bot";
import WebSocket from "ws";
import { Packets } from "../../util/packets/Packets";
import { IStatistics, IArea, IBotParams, IAuthData, IQueuedPixel } from "../../util/data/Data";
import { constant } from '../../util/Constant.js';
import fs from 'fs';
import path from 'path';
import { PacketHandler } from './PacketHandler.js';
import { CanvasPacket, PacketResponseMap } from "../../util/packets/PacketResponses";
import { HeadersFunc } from "../../PixelPlace";
import { PacketSendMap } from "../../util/packets/PacketSends";
import { NetUtil } from "../../util/NetUtil";
import { SocketHook } from "../../browser/SocketHook";
import { ServerClient } from "../../browser/client/ServerClient";

/**
 * Handles the connection between the bot and pixelplace. Not really useful for the developer.
 */
export class Connection {

    bot!: Bot;

    boardId!: number;
    isWorld: boolean = true;
    canvas!: Canvas.Canvas;

    connected: boolean = false;

    private authKey!: string;
    private authToken!: string;
    private authId!: string;

    stats: IStatistics;

    socket!: WebSocket | ServerClient;

    private econnrefusedTimer: number = 0;

    private netUtil!: NetUtil;

    headers: HeadersFunc;

    private shouldRelog: boolean;

    chatLoaded: boolean = false;

    areas: {[key: string]: IArea} = {};
    warOccurring: boolean = false;
    currentWarZone: string = "NONE";

    packetHandler!: PacketHandler;
    loadResolve!: (value: void | PromiseLike<void>) => void;

    serverClient: ServerClient | undefined;

    constructor(bot: Bot, params: IBotParams | ServerClient, stats: IStatistics, netUtil: NetUtil, headers: HeadersFunc) {
        constant(this, 'bot', bot);

        if(params instanceof ServerClient) {
            this.shouldRelog = false;
            this.serverClient = params;
        } else {
            const botParams = params as IBotParams;
            this.authKey = botParams.authData.authKey;
            this.authToken = botParams.authData.authToken;
            this.authId = botParams.authData.authId;

            this.shouldRelog = botParams.relog || false;
        }

        this.stats = stats;

        this.headers = headers;

        constant(this, 'boardId', params.boardID);

        constant(this, 'netUtil', netUtil);
        constant(this, 'packetHandler', new PacketHandler(this, params));

        this.relog = this.relog.bind(this);
        this.Load = this.Load.bind(this);
    }

    private async relog(): Promise<{ authKey?: string | undefined; authToken?: string | undefined; authId?: string | undefined; }> {
        console.log("~~Refreshing auth data~~");
        try {
            const headers = this.headers('relog', this.boardId);
            headers.cookie += this.generateAuthCookie();

            const res = await fetch("https://pixelplace.io/api/relog.php", {
                headers: headers as HeadersInit,
                method: "GET"
            });
            
            const cookies = res.headers.getSetCookie()?.map((value: string) => value.split(";")[0]);
            if(cookies == null || cookies.length == 0 || cookies[0].startsWith("authKey=deleted")) {
                console.log("Could not relog. Get new auth data and try again.");
                return {};
            }

            const [authId, authKey, authToken] = cookies.map((value: string) => value.split("=")[1]);
            const newAuthData: IAuthData = {authKey, authToken, authId};

            this.packetHandler.updateAuth(newAuthData);
            
            if(authToken != null && authToken != "deleted") {
                fs.writeFileSync(path.join(process.cwd(), `ppjs-relog-authdata-${authKey.substring(0, 5)}.json`), JSON.stringify(newAuthData, null, 4));
                console.log("~~Great! Auth data refreshed and saved~~");
            }

            return newAuthData;
        } catch(err) {
            console.log("Error when getting auth data:", err);
            return {};
        }
    }

    /**
     * Used internally. It gets new auth data.
     */
    async newInit(loggedIn: boolean) {
        this.shouldRelog = false;
        const authData = await this.relog();
        if(!authData || Object.keys(authData).length == 0 || !authData.authId) {
            process.exit();
        }
        this.sendInit(
            loggedIn ? authData.authKey ?? undefined : undefined, loggedIn ? authData.authToken ?? undefined : undefined,authData.authId,
            this.boardId
        );
    }

    public generateAuthCookie(): string {
        return `authId=${this.authId};authKey=${this.authKey};authToken=${this.authToken};`;
    }

    async Start() {
        return new Promise<void>((resolve) => this.Connect().then(this.Load).then(resolve));
    }

    private onopen(resolve: () => void) {
        this.connected = true;
        resolve();

        // owicode so esoteric :100: :fire:
        let time = Math.floor(new Date().getTime() / 1e3) + 120;
        setInterval(() => {
            const now = Math.floor(new Date().getTime() / 1e3);
            if(time <= now) {
                this.socket.send(`42["${Packets.SENT.HB}", " "]`);
                time = now + (Math.floor(Math.random() * 20) + 73);
            }
        }, 5e3);
    }

    async Connect() {
        if(this.socket && this.socket.readyState == 1) throw "Bot already connected.";
        return new Promise<void>(async (resolve) => {

            if(Canvas.hasCanvas(this.boardId)) {
                this.isWorld = false;
            }

            if(this.serverClient) {
                this.canvas = Canvas.createFromClient(this.serverClient);
                this.socket = this.serverClient;
                this.onopen(resolve);
                this.stats.session.beginTime = Date.now();
            } else {
                // create the canvas
                this.canvas = Canvas.getCanvas(this.boardId, this.netUtil, this.headers);
                // connect to PixelPlace
                this.socket = new WebSocket('wss://pixelplace.io/socket.io/?EIO=4&transport=websocket', {
                    headers: this.headers("socket", this.boardId),
                });
            }

            this.socket.on('close', (code: number, reason: Buffer) => {
                this.socketClosed(code, reason);
            });

            this.socket.on('open', () => this.onopen(resolve));

            this.socket.on('error', (error: Error) => {
                this.socketError(error);
                if(error.message.startsWith("connect ECONNREFUSED") && Date.now() - this.econnrefusedTimer > 10000) { // this means it couldn't connect
                    this.econnrefusedTimer = Date.now();
                    this.socket.close(4001);
                    console.error(`Pixelplace was unable to connect! Try checking if pixelplace is online and disabling vpns then verifying that you can connect to pixelplace normally.${this.bot.autoRestart ? " Auto restart is enabled; this will repeat every 10 seconds." : ""}`);
                }
            });

            const [userId, premium, username] = await this.canvas.fetchCanvasData();
            if(userId == 0) {
                console.log(`~~WARN~~ This bot is not logged in!`,
                    `${this.bot.params instanceof ServerClient ? `(Userscript bot)` : `(Auth key of '${this.authKey.substring(0, 5)}')`}`);
            }
            this.bot.username = username;
            this.bot.userId = userId;
            this.bot.premium = premium;
        });
    }

    private pingInt: number = 0;

    async Load() {
        if(!this.socket) throw "Bot has not connected yet.";

        return new Promise<void>((resolve) => {
            if(this.serverClient) resolve();
            this.loadResolve = resolve;
            this.socket.on("message", (data: Buffer) => {
                this.stats.socket.received++;
                this.packetHandler.evaluatePacket(data.toString());
            });
        });
    }

    private socketClosed(code: number, reason: Buffer) {
        clearInterval(this.pingInt);

        this.connected = false;
        this.chatLoaded = false;
        if(this.packetHandler.listeners.has(Packets.RECEIVED.LIB_SOCKET_CLOSE)) {
            this.packetHandler.listeners.get(Packets.RECEIVED.LIB_SOCKET_CLOSE)?.forEach(listener => listener[0]([code, reason]));
        }
        if(this.bot.autoRestart) {
            setTimeout(() => this.Start(), 3000);
        }
    }

    private socketError(error: Error) {
        if(this.packetHandler.listeners.has(Packets.RECEIVED.LIB_ERROR)) {
            this.packetHandler.listeners.get(Packets.RECEIVED.LIB_ERROR)?.forEach(listener => listener[0](error));
        }

        // statistics
        this.stats.session.errors++;
    }

    /**
     * Loads canvas data.
     */
    async loadCanvas(value: CanvasPacket) {
        if(this.isWorld) this.canvas.loadCanvasData(value);
        this.stats.session.beginTime = Date.now();

        this.canvas.resolve(this.loadResolve);
    }

    sendInit(authKey: string | undefined, authToken: string | undefined, authId: string, boardId: number): void {
        if(this.shouldRelog) {
            this.newInit(true);
            return;
        }
        if(authKey == null && authToken == null) {
            this.emit(Packets.SENT.INIT, { authId, boardId });
            return;
        }
        this.emit(Packets.SENT.INIT, { authKey, authToken, authId, boardId });
    }

    on<T extends keyof PacketResponseMap>(key: T, func: (args: PacketResponseMap[T]) => void, pre: boolean) {
        if(!this.packetHandler.listeners.has(key)) this.packetHandler.listeners.set(key, []);
        this.packetHandler.listeners.get(key)?.push([func, pre]);
    }

    private pixelsThisSecond: number = 0;
    private lastReset: number = Date.now();

    send(value: Buffer | Uint8Array | string | unknown[]) {
        // full fail safe
        if(value.toString().startsWith('42["p",[')) {
            if(Date.now() - this.lastReset > 1000) {
                this.lastReset += 1000;
                this.pixelsThisSecond = 0;
            }
            if(++this.pixelsThisSecond > this.bot.failSafe) {
                console.log(`~~Fail safe triggered: ${this.pixelsThisSecond}/${this.bot.failSafe}~~`);
                process.exit();
            }
        }
        try {
            if(this.packetHandler.listeners.has(Packets.RECEIVED.LIB_SENT)) {
                this.packetHandler.listeners.get(Packets.RECEIVED.LIB_SENT)?.forEach(listener => listener[0](value));
            }
            this.socket.send(value);

            // statistics
            this.stats.socket.sent++;
        } catch(err) {
            console.log("An error occurred when sending packets to pixelplace. Check your internet connection.");
        }
    }

    emit<T extends keyof PacketSendMap>(type: T, value?: PacketSendMap[T]) {
        if(value == null) {
            this.send(`42["${type}"]`);
            return;
        }
        this.send(`42["${type}",${JSON.stringify(value)}]`)
    }

    getAreas(): {[key: string]: IArea} {
        return this.areas;
    }
    
    getAreaById(id: number): IArea {
        return this.areas[Object.keys(this.areas)[id]] || {};
    }

    isWarOccurring(): boolean {
        return this.warOccurring;
    }

    isChatLoaded(): boolean {
        return this.chatLoaded;
    }

    getCurrentWarZone(): string {
        return this.currentWarZone;
    }

    /**
     * For internal use. Times an x,y packet to acknowledge the confirm
     */
    timePixel(p: IQueuedPixel): boolean {
        const timings = this.packetHandler.internalListeners.pixelTime;
        const key = `${p.data.x},${p.data.y}`;
        const existed = timings.hasOwnProperty(key);
        timings[key] = [Date.now(), p];
        return !existed;
    }

    /**
     * Returns the number of pixels being waited for confirmation
     */
    waitingOn(): number {
        return Object.keys(this.packetHandler.internalListeners.pixelTime).length;
    }

    /**
     * @returns the average ping for packet confirmation
     */
    getConfirmPing(): number {
        return this.packetHandler.internalListeners.confirmPing;
    }

    hasPixelTime(x: number, y: number): boolean {
        return this.packetHandler.internalListeners.pixelTime.hasOwnProperty(`${x},${y}`);
    }

    timeSinceConfirm(): number {
        return this.packetHandler.internalListeners.lastPixelPacket;
    }

}