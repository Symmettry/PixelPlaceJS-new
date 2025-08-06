import * as Canvas from "../../util/Canvas";
import { Bot } from "../Bot";
import WebSocket from "ws";
import { Packets } from "../../util/packets/Packets";
import { IStatistics, IArea } from "../../util/data/Data";
import { constant } from '../../util/Constant.js';
import fs from 'fs';
import path from 'path';
import { PacketHandler } from './PacketHandler.js';
import { CanvasPacket, PacketResponseMap } from "../../util/packets/PacketResponses";
import { HeaderTypes } from "../../PixelPlace";
import { OutgoingHttpHeaders } from "http";
import { PacketSendMap } from "../../util/packets/PacketSends";

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

    socket!: WebSocket;

    private econnrefusedTimer: number = 0;

    headers: (type: HeaderTypes) => OutgoingHttpHeaders;

    private relog: () => Promise<{ authKey?: string | undefined; authToken?: string | undefined; authId?: string | undefined; }>;

    chatLoaded: boolean = false;

    areas: {[key: string]: IArea} = {};
    warOccurring: boolean = false;
    currentWarZone: string = "NONE";

    private packetHandler!: PacketHandler;
    loadResolve!: (value: void | PromiseLike<void>) => void;

    constructor(bot: Bot, authKey: string, authToken: string, authId: string, boardId: number, stats: IStatistics, headers: (type: HeaderTypes) => OutgoingHttpHeaders) {
        constant(this, 'bot', bot);

        this.authKey = authKey;
        this.authToken = authToken;
        this.authId = authId;

        this.stats = stats;

        this.headers = headers;

        constant(this, 'boardId', boardId);

        constant(this, 'packetHandler', new PacketHandler(this, authKey, authToken, authId));

        this.relog = this.relogGenerator(this.authKey, this.authToken);
        this.Load = this.Load.bind(this);
    }

    private relogGenerator(authKey: string, authToken: string): () => Promise<{ authKey?: string | undefined; authToken?: string | undefined; authId?: string | undefined; }> {
        authKey = authKey == "deleted" ? "" : authKey;
        authToken = authToken == "deleted" ? "" : authToken;
        return async () => {
            if(authKey != "") {
                console.log("~~Refreshing auth data~~");
            }
            try {
                const headers = this.headers('relog');
                headers.accept = "application/json, text/javascript, */*; q=0.01";
                headers.cookie += this.generateAuthCookie();

                const res = await fetch("https://pixelplace.io/api/relog.php", {
                    headers: headers as HeadersInit,
                    method: "GET"
                });
                
                const cookies = res.headers.getSetCookie()?.map(value => value.split(";")[0]);
                if(cookies == null || cookies.length == 0 || cookies[0].startsWith("authKey=deleted")) {
                    console.log("Could not relog. Get new auth data and try again.");
                    return {};
                }

                const [authId, authKey, authToken] = cookies.map(value => value.split("=")[1]);
                const newAuthData = {authKey, authToken, authId};
        
                this.relog = this.relogGenerator(authKey, authToken);

                this.packetHandler.updateAuth(authKey, authToken, authId);
                
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
    }

    /**
     * Used internally. It gets new auth data.
     */
    async newInit(loggedIn: boolean) {
        const authData = await this.relog();
        if(!authData || Object.keys(authData).length == 0 || !authData.authId) {
            process.exit();
        }
        this.sendInit(loggedIn ? authData.authKey ?? undefined : undefined, loggedIn ? authData.authToken ?? undefined : undefined, authData.authId, this.boardId);
    }

    public generateAuthCookie(): string {
        return `authId=${this.authId};authKey=${this.authKey};authToken=${this.authToken};`;
    }

    async Start() {
        return new Promise<void>((resolve) => this.Connect().then(this.Load).then(resolve));
    }

    async Connect() {

        if(this.socket && this.socket.readyState == 1) throw "Bot already connected.";

        return new Promise<void>((resolve) => {

            // connect to PixelPlace
            this.socket = new WebSocket('wss://pixelplace.io/socket.io/?EIO=4&transport=websocket', {
                headers: {
                    ...this.headers("socket"),
                },
            });

            if(Canvas.hasCanvas(this.boardId)) {
                this.isWorld = false;
            }

            // create the canvas
            this.canvas = Canvas.getCanvas(this.boardId, this.headers);

            this.socket.on('close', () => {
                this.socketClosed();
            });

            this.socket.on('open', async () => {
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
            });

            this.socket.on('error', (error: Error) => {
                this.socketError(error);
                if(error.message.startsWith("connect ECONNREFUSED") && Date.now() - this.econnrefusedTimer > 10000) { // this means it couldn't connect
                    this.econnrefusedTimer = Date.now();
                    this.socket.close();
                    console.error(`Pixelplace was unable to connect! Try checking if pixelplace is online and disabling vpns then verifying that you can connect to pixelplace normally.${this.bot.autoRestart ? " Auto restart is enabled; this will repeat every 10 seconds." : ""}`);
                }
            });
        });
    }

    async Load() {
        if(!this.socket) throw "Bot has not connected yet.";

        return new Promise<void>((resolve) => {
            this.loadResolve = resolve;
            this.socket.on('message', async (buffer: Buffer) => {
                this.stats.socket.received++;
                await this.packetHandler.evaluatePacket(buffer);
            });
        });
    }

    private socketClosed() {
        this.connected = false;
        this.chatLoaded = false;
        if(this.packetHandler.listeners.has(Packets.RECEIVED.LIB_SOCKET_CLOSE)) {
            this.packetHandler.listeners.get(Packets.RECEIVED.LIB_SOCKET_CLOSE)?.forEach(listener => listener[0]());
        }
        if(this.bot.autoRestart) {
            setTimeout(() => this.Start(), 5000);
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

    send(value: Buffer | Uint8Array | string | unknown[]) {
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

}