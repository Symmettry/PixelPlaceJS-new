import { getPalive } from './util/PAlive.js';
import { Canvas } from './util/Canvas.js';
import WebSocket from 'ws';
import { ImageDrawer } from './util/ImageDrawer.js';
import * as Protector from "./util/Protector.js";

export class PixelPlace {
    
    listeners!: Map<string, Function[]>;

    socket!: WebSocket;
    canvas!: Canvas;

    boardId!: number;
    authKey!: string;
    authToken!: string;
    authId!: string;
    
    pixels!: number[][];

    constructor(authKey: string, authToken: string, authId: string, boardId: number) {
        Object.defineProperty(this, 'authKey', {value: authKey, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authToken', {value: authToken, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authId', {value: authId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'boardId', {value: boardId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'listeners', {value: new Map(), writable: false, enumerable: true, configurable: false});
    }

    on(key: string, func: Function): void {
        if(!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key)?.push(func);
    }

    async Init(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Connect to PixelPlace
            Object.defineProperty(this, 'socket', {value: new WebSocket('wss://pixelplace.io/socket.io/?EIO=4&transport=websocket'), writable: false, enumerable: true, configurable: false});

            // Create the canvas
            Object.defineProperty(this, 'canvas', {value: new Canvas(this.boardId), writable: false, enumerable: true, configurable: false});
            
            this.pixels = [];

            this.socket.on('open', () => {
                resolve(); // await pp.Init();
            });

            this.socket.on('message', (buffer: Buffer) => {
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
                            case "ping.alive": // pixelplace keepalive
                                this.socket.send(`42["pong.alive", "${getPalive(7)}"]`)
                                break;
                            case "canvas": // why are these 2 separate keys? they do the same thing owmince lol
                            case "p": // pixels
                                this.canvas.loadCanvasData(value);
                                Protector.detect(this, value);
                                break;
                        }
                        break;
                }
            });

            this.socket.on('close', () => {
                console.log('PPJS Closed.');
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

    placePixel(x: number, y: number, col: number, brush: number=1, protect: boolean=false, force: boolean=false): Promise<void> {
        return new Promise<void>((resolve, _reject) => {
            if(protect) {
                Protector.protect(x, y, col);
            }

            if(!force && this.getPixelAt(x, y) == col) {
                resolve();
            } else {
                this.emit("p", `[${x}, ${y}, ${col}, ${brush}]`);

                setTimeout(resolve, 50);
            }
        });
    }

    emit(key: string, value: any): void {
        const data = `42["${key}",${value.toString()}]`;
        this.socket.send(data);
    }
    
    async drawImage(x: number, y: number, path: string, protect: boolean=false, force: boolean=false): Promise<void> {
        const drawer: ImageDrawer = new ImageDrawer(this, x, y, path, protect, force);
        await drawer.begin();
    }

}

enum RECEIVED {
    LEAVE = "l",
    JOIN = "j",
    PING_ALIVE = "ping.alive",
    DELETE_CHAT_MESSAGE = "chat.system.delete",
    CHAT_LOADED = "chat.messages.loaded",
    CHAT_MESSAGE = "chat.user.message",
    CANVAS = "canvas",
    CHAT_STATS = "chat.stats",
    RATE_CHANGE = "rate_change",
    AREA_FIGHT_START = "area_fighT_start",
    AREA_FIGHT_END = "area_fight_end",
    ERROR = "throw.error",
    ITEM_USE_NOTIFICATION = "item.notification.use",
    SPECIAL_ERROR = "throw.error.special",
    PROTECTION = "protection",
    COOLDOWN = "cooldown",
    COOLDOWN_DOT = "cooldown_dot",
    RELOAD = "reload",
    CANVAS_ACCESS_REQUESTED = "canvas.access.requested",
    USER_PROFILE = "user.profile",
    HOT_PAINTINGS = "hot.paintings",
    COINS_GIFT_NOTIFICATION = "coins.notification.gift",
    GOLDEN_NOTIFICATION = "golden.notification",
    SNOWBALL_ITEM_NOTIFICATION = "item.notification.snowball",
    ITEM_NOTIFICATION_GIFT = "item.notification.gift",
    CHAT_SYSTEM_MESSAGe = "chat.system.message",
    CHAT_SYSTEM_DELETE = "chat.system.delete",
}
enum SENT {
    INIT = "init",
    PIXEL = "p",
    PONG_ALIVE = "pong.alive",
    CHAT_MESSAGE = "chat.message",
    USER_PROFILE = "user.profile",
    HOT_PAINTINGS = "hot.paintings",
    SERVER_TIME = "server_time",
    USERNAME = "username",
}
enum UNKNOWN {
    PREMIUM_MOD = "premium.mod",
    SAVE_TRACKING_CACHE = "save.tracking.cache",
    SAVE_TRACKING_PENDING = "save.tracking.pending",
    QUEUE = "queue",
    PAINTING_PLAYERS = "painting.players",
    CANVAS_SUCCESS = "canvas.success",
    CANVAS_ALERT = "canvas.alert",
    CHAT_CUSTOM_MESSAGE = "chat.custom.message",
    CHAT_CUSTOM_ANNOUNCE = "chat.custom.announce",
    CHAT_PAINTING_DELETE = "chat.painting.delete",
    CHAT_COMMAND = "chat.command",
    AREAS = "areas",
}

export class Packets {
    static RECEIVED: typeof RECEIVED = RECEIVED;
    static SENT: typeof SENT = SENT;
    static UNKNOWN: typeof UNKNOWN = UNKNOWN;
}