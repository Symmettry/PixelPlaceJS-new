import { WebSocketServer } from "ws";
import { BrowserSettings, SocketEvent } from "./SocketData";
import { ServerClient } from "./client/ServerClient";
import { randomUUID, UUID } from "crypto";
import { Bot } from "../bot/Bot";

export class SocketHook {

    private listeners: {[key: string]: ((data: any) => void)[]} = {};
    private started: boolean = false;

    connections: {[key: UUID]: ServerClient} = {};

    settings: BrowserSettings;
    server!: WebSocketServer;
    port: number;

    botResolve!: () => void;
    botAmount!: number;
    botList: [Bot, ServerClient][] = [];

    constructor(port: number, settings: BrowserSettings) {
        this.port = port;
        this.settings = settings;
    }

    debug(...data: any) {
        if(!this.settings.debugger) return;
        if(this.settings.lineClears) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }
        for(const str of data) process.stdout.write(str + " ");
        process.stdout.write("\n");
    }

    callListener(event: SocketEvent, data: any) {
        this.debug("Event emitted:", SocketEvent[event], "&",data);
        if(!this.listeners[event]) return;
        this.listeners[event].forEach(c => c(data));
    }

    async start() {
        this.debug("Starting");
        return new Promise<void>((resolve, reject) => {
            if(this.started) return reject(`Server already started`);
            this.started = true;

            this.server = new WebSocketServer({ port: this.port });

            this.server.once('listening', () => {
                this.debug(`~~Browser socket opened on port ${this.port}~~`);
                resolve();
            });

            this.server.on('connection', u => {
                const uuid = randomUUID();
                (u as any).uuid = uuid;
                this.debug(`~~Connection ${uuid}~~`);

                const client = new ServerClient(this, u, uuid);
                this.connections[uuid] = client;
                this.callListener(SocketEvent.CONNECTION, client);
            });

            this.server.on('error', (err) => {
                console.error(`~~Browser socket error: ${err}~~`);
            });

            this.server.on('close', () => {
                this.debug("~~Browser socket closed~~");
            });

            this.on(SocketEvent.DISCONNECTION, (socket) => {
                this.debug(`~~Disconnection ${socket.uuid}~~`);
                delete this.connections[socket.uuid];
                this.botAmount++;
                this.botList.splice(this.botList.findIndex(b => b == socket.bot), 1);
            });
        });
    }

    on(event: SocketEvent, callback: (data: any) => void): void {
        if(!this.listeners[event]) this.listeners[event] = [];
        this.listeners[event].push(callback);
    }

    /**
     * Waits for the specified amount of bots to connect; requires browserClient: true
     */
    bots(amount: number, callback: (bots: [Bot, ServerClient][]) => void): void {
        if(!this.settings.browserClient) throw new Error(`Browser client not enabled!`);
        this.botResolve = () => callback(this.botList);
        this.botAmount = amount;
    }

}
