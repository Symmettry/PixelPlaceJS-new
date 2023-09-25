import { Canvas } from './util/Canvas.js';
import WebSocket from 'ws';
export declare class PixelPlace {
    listeners: Map<string, Function[]>;
    socket: WebSocket;
    canvas: Canvas;
    boardId: number;
    authKey: string;
    authToken: string;
    authId: string;
    pixels: number[][];
    constructor(authKey: string, authToken: string, authId: string, boardId: number);
    on(key: string, func: Function): void;
    Init(): Promise<void>;
    getPixelAt(x: number, y: number): number | undefined;
    getColorId(r: number, g: number, b: number): number;
    placePixel(x: number, y: number, col: number, brush?: number): Promise<void>;
    emit(key: string, value: any): void;
    drawImage(x: number, y: number, path: string): Promise<void>;
}
export declare enum Packets {
    INIT = "init",
    PIXEL = "p",
    JOIN = "j",
    LEAVE = "l",
    PALIVE = "ping.alive",
    POALIVE = "pong.alive",
    NEW_CHAT_MESSAGE = "chat.user.message",
    DELETE_CHAT_MESSAGE = "chat.system.delete",
    CHAT_LOADED = "chat.messages.loaded",
    CHAT_SEND_MESSAGE = "chat.message",
    CANVAS = "canvas",
    CHAT_STATS = "chat.stats",
    RATE_CHANGE = "rate_change",
    FIGHT_START = "area_fight_start",
    FIGHT_END = "area_fight_end",
    ERROR = "throw.error",
    ITEM_USED = "item.notification.use",
    PREMIUM_MOD = "premium.mod",
    SAVE_TRACKING_CACHE = "save.tracking.cache",
    SAVE_TRACKING_PENDING = "save.tracking.pending",
    QUEUE = "queue",
    SPECIAL_ERROR = "throw.error.special",
    PROTECTION = "protection",
    COOLDOWN = "cooldown",
    COOLDOWN_DOT = "cooldown_dot",
    RELOAD = "reload",
    CANVAS_ACCESS_REQUESTED = "canvas.access.requested",
    USER_PROFILE = "user.profile",
    PAINTING_PLAYERS = "painting.players",
    HOT_PAINTINGS = "hot.paintings",
    COINS_GIFT_NOTIFICATION = "coins.notification.gift",
    GOLDEN_NOTIFICATION = "golden.notification",
    ITEM_NOTIFICATION_SNOWBALL = "item.notification.snowball",
    ITEM_NOTIFICATION_GIFT = "item.notification.gift",
    CHAT_SYSTEM_MESSAGE = "chat.system.message",
    CANVAS_SUCCESS = "canvas.success",
    CANVAS_ALERT = "canvas.alert",
    CHAT_CUSTOM_MESSAGE = "chat.custom.message",
    CHAT_CUSTOM_ANNOUNCE = "chat.custom.announce",
    CHAT_PAINTING_DELETE = "chat.painting.delete",
    CHAT_SYSTEM_DELETE = "chat.system.delete",
    CHAT_MESSAGES_LOADED = "chat.messages.loaded",
    CHAT_COMMAND = "chat.command",
    AREAS = "areas",
    SERVER_TIME = "server_time",
    USERNAME = "username"
}
