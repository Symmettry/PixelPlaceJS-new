import * as Canvas from '../util/canvas/Canvas.js';
import { Image, ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/packets/Packets.js";
import { Pixel, IStatistics, defaultStatistics, IQueuedPixel, IArea, IBotParams, IDebuggerOptions, QueueSide, PlaceResults, PlainPixel, CoordSet, BoardID } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';
import { Connection } from './connection/Connection.js';
import { constant, delegate, Delegate, DelegateStatic, delegateStatic } from '../util/Helper.js';
import { TextData, TextWriter } from '../util/drawing/fonts/TextWriter.js';
import { Line, LineDrawer } from '../util/drawing/LineDrawer.js';
import { PacketResponseMap, PixelPacket, RateChangePacket } from '../util/packets/PacketResponses.js';
import { HeadersFunc, HeaderTypes, SystemParameters } from '../PixelPlace.js';
import { OutgoingHttpHeaders } from 'http';
import { Color } from '../util/data/Color.js';
import { PacketSendMap } from '../util/packets/PacketSends.js';
import { NetUtil, PaintingData, UserData } from '../util/NetUtil';
import { ServerClient } from '../browser/client/ServerClient.js';
import { Animation, AnimationDrawer } from '../util/drawing/AnimationDrawer.js';
import { GeometryDrawer, Outline, Rectangle } from '../util/drawing/GeometryDrawer.js';
import { UUID } from 'crypto';
import { PixelQueue } from './PixelQueue.js';
import { DrawingMode } from '../util/data/Modes.js';

export type LoadData = {
    barriers: number[];
    increases: number[];
    reset: number;
    failSafe: number;
}

export const LoadPresets: Record<string, LoadData> = {
    FAST:    { barriers: [0, 24, 100],            increases: [-12, 0, 1],     reset: 500,  failSafe: 1000/6  },
    DEFAULT: { barriers: [0, 50, 250, 500],       increases: [0, 1, 2, 3],    reset: 1500, failSafe: 1000/10 },
    SAFE:    { barriers: [0, 100, 250, 500, 100], increases: [0, 1, 3, 4, 5], reset: 3000, failSafe: 1000/10 },
}

/**
 * Pixelplace bot instance.
 * 
 * Contains helper functions etc.
 */
// @ts-expect-error delegation priorities
export class Bot implements
    Delegate<[Protector, UIDManager, Connection, Canvas.Canvas, NetUtil, PixelQueue]>,
    DelegateStatic<[typeof GeometryDrawer, typeof LineDrawer, typeof TextWriter, typeof ImageDrawer,
                    typeof Canvas.Canvas, typeof NetUtil, typeof AnimationDrawer], Bot>
{
    boardId!: BoardID;

    sysParams: SystemParameters;

    // ! it's set with setHeaders()
    headers!: HeadersFunc;

    private debugger: boolean = false;
    private debuggerOptions: IDebuggerOptions = {};

    private pixelQueue: PixelQueue;

    params: IBotParams | ServerClient;

    /** If the bot is ratelimited. */
    ratelimited: boolean = false;
    /** Amount of time ratelimited for. */
    ratelimitTime: number = 0;

    /** Max time a pixel will be waiting for. Setting place rate will increase this if it's higher. */
    maxPixelWait: number = 100;

    /** Amount of detected new lag ms; based on pixel confirm response times */
    lagAmount: number = 0;
    /** Ms to increase pixels when lagging; per lag amount ms */
    lagIncreasePerMs: number = 1;

    /** Amount of sustained packets */
    sustainingLoad: number = 0;
    
    /** Current load barrier index */
    currentBarrier: number = 0;
    /** Current load data */
    loadData: LoadData = LoadPresets.DEFAULT;

    /** Shouldn't be edited by the user. This is the rate change packet. */
    rate: RateChangePacket = -1;

    /** The user id of the bot */
    userId: number = -1;
    /** Username of the bot */
    username: string = "Guest";
    /** If the bot is premium */
    premium: boolean = false;
    /** Special pixel queue info */
    specialQueueInfo: { amount: number; time: number | Function; start: number; } | null = null;

    /** Statistics that are modified internally. Use getStatistics() instead, since it updates other things. */
    stats: IStatistics = defaultStatistics();

    // Connection
    private connection: Connection | null = null;

    // Net util
    private netUtil: NetUtil;

    // UID Manager 
    uidMan!: UIDManager;

    // Pixel Queue
    suppress: boolean = false;
    checkRate: number = -2;

    /**
     * Creates a bot instance
     */
    constructor(params: IBotParams | ServerClient, sysParams: SystemParameters) {
        this.params = params;

        if(!this.params.boardID) {
            throw new Error("Key 'boardID' not present in bot parameters!");
        }

        constant(this, 'boardId', params.boardID);

        this.netUtil = new NetUtil(this, this.headers);
        this.pixelQueue = new PixelQueue(this);
        delegate(this, [this.netUtil, this.pixelQueue, new Protector(this)]);
        delegateStatic(this, [GeometryDrawer, LineDrawer, TextWriter, ImageDrawer, Canvas.Canvas, NetUtil, AnimationDrawer]);
        
        this.sysParams = sysParams;
        this.sysParams.exitOnClose      ??= false;
        this.sysParams.autoRestart      ??= true;
        this.sysParams.handleErrors     ??= true;
        this.sysParams.warnRuleBreakage ??= true;

        this.Load = this.Load.bind(this);
        this.Connect = this.Connect.bind(this);
        this.Init = this.Init.bind(this);

        this.setHeaders((type: HeaderTypes) => {
            const headers: OutgoingHttpHeaders = {};
            switch(type) {
                case 'get-painting':
                case 'get-user':
                case 'relog':
                    headers.accept = 'application/json, text/javascript, */*; q=0.01'
                    break;
                case 'canvas-image':
                    headers.accept = 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8';
                    break;
                case 'socket':
                    headers.connection = 'Upgrade';
                    headers["Cache-Control"] = "no-cache";
                    break;
            }
            return headers;
        });

        this.pixelQueue.queueLoop();
    }

    setLoadData(data: LoadData) {
        this.loadData = data;
    }

    /**
     * Initiates the bot.
     * @returns A promise that will resolve once the bot connects and is fully loaded.
     */
    async Init(): Promise<void> {
        return new Promise<void>((resolve) => this.Connect().then(this.Load).then(resolve));
    }

    /**
     * Connects the bot to pixelplace.
     * @returns A promise that will resolve once the socket opens.
     */
    async Connect(): Promise<void> {
        this.connection = new Connection(this, this.params, this.stats, this.netUtil, this.headers);
        delegate(this, [this.connection]);
        await this.connection.Connect();
        if(this.debugger) this.addDebuggerInternal();
    }

    /**
     * Loads the bot fully. This should always be ran directly after Connect() or the bot won't function.
     * @returns A promise that will resolve once the bot is fully loaded.
     */
    async Load(): Promise<void> {
        if (!this.connection) {
            throw new Error("Connection not initialized.");
        }
        return this.connection.Load();
    }

    /**
     * Statistics
     * @returns The statistics of the bot.
     */
    getStatistics(): IStatistics {
        // updating values
        this.stats.session.time = Date.now() - this.stats.session.beginTime;
        const timeSinceFirstPixel = Date.now() - this.stats.pixels.placing.first_time;
        this.stats.pixels.placing.per_second = this.stats.pixels.placing.placed / (timeSinceFirstPixel * 0.001);
        this.stats.pixels.placing.ping = this.connection!.getConfirmPing();
        return this.stats;
    }

    /**
     * @returns Pixeling rate requested by pixelplace
     */
    getRate(): RateChangePacket {
        return this.rate;
    }

    /**
     * Sets the request headers. This will automatically add the auth cookie.
     * @param headers An object of headers.
     */
    setHeaders(ogFunc: HeadersFunc) {
        const headersFunc = (type: HeaderTypes) => {
            const data = ogFunc(type, this.boardId);
            data.cookie = this.connection!.generateAuthCookie() + " " + data.cookie;
            return data;
        };

        this.headers = headersFunc;
        this.netUtil.headers = this.headers;
        if(this.isConnected && this.isConnected()) {
            this.connection!.headers = this.headers;
            this.connection!.canvas.headers = this.headers;
        }
    }

    private wipeLine() {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }

    private addDebuggerInternal() {
        this.on(Packets.RECEIVED.LIB_RAW, (message) => {
            if(message.startsWith('42["p",[')) {
                if(this.debuggerOptions.ignorePixelPacket) return;
                if(this.debuggerOptions.shrinkPixelPacket) {
                    message = message.substring(0, 60) + (message.length > 60 ? "..." : "");
                }
            }

            if(this.debuggerOptions.lineClears) this.wipeLine();
            process.stdout.write(`\x1b[41m⬇ ${message} \x1b[0m\n`);
        });
        this.on(Packets.RECEIVED.LIB_SENT, (message) => {
            if(message.startsWith('42["p",[')) {
                if(this.debuggerOptions.ignorePixelPacket) return;
            }

            if(this.debuggerOptions.lineClears) this.wipeLine();
            process.stdout.write(`\x1b[42m⬆ ${message} \x1b[0m\n`);
        });
    }

    /**
     * Adds a listener for all sent and received packets
     */
    addDebugger(settings: IDebuggerOptions = {}): void {
        this.debugger = true;
        this.debuggerOptions = settings;
        if(this.isConnected()) {
            this.addDebuggerInternal();
        }
    }

    /**
     * Gets the connection instance
     * 
     * This does not verify the bot is connected, you can use await connection.verify(); for that
     */
    getConnection(): Connection {
        if(!this.connection) {
            throw new Error("Not connected yet!");
        }
        return this.connection;
    }
    
    // Delegations //

    // ---------------- Connection ----------------
    declare isConnected: () => boolean;

    declare emit: <T extends keyof PacketSendMap>(type: T, value?: PacketSendMap[T]) => Promise<void>;
    declare send: (value: string | unknown[] | Buffer | Uint8Array) => Promise<void>;

    declare on: <T extends keyof PacketResponseMap>(key: T, func: (args: PacketResponseMap[T]) => void, pre?: boolean) => void;

    declare getCurrentWarZone: () => string;
    declare isPixelInWarZone: (name: string, x: number, y: number) => boolean;
    declare isPixelInAnyWarZone: (x: number, y: number) => boolean;
    declare isWarOccurring: () => boolean;

    declare getArea: (name: string) => IArea | null;
    declare getAreaById: (id: number) => IArea;
    declare getAreas: () => { [key: string]: IArea; };
    
    declare isChatLoaded: () => boolean;

    declare queuedPixels: () => number;

    // ---------------- Canvas ----------------
    declare getPixelAt: (x: number, y: number) => Color | undefined;
    declare getRegionAt: (x: number, y: number) => Canvas.RegionData;
    declare isValidPosition: (x: number, y: number) => boolean;
    declare isValidColor: (col: number) => boolean;
    declare getRandomColor: () => Color;
    declare getClosestColorId: (r: number, g: number, b: number, _?: number) => Color | null;

    // ---------------- Protector ----------------
    declare updateProtection: (protect: boolean, x: number, y: number, col: Color) => void;
    declare detectPixels: (pixels: PixelPacket) => void;
    declare protect: (x: number, y: number, col: Color | null, replaceProtection?: boolean) => void;
    declare unprotect: (x: number, y: number) => void;
    declare getProtectedColor: (x: number, y: number) => number | undefined;
    declare isProtected: (x: number, y: number) => boolean;

    // ---------------- Net util ----------------
    declare getUniquePlayerId: (name: string) => Promise<UUID>;
    declare getUserData: (name: string, reload?: boolean) => Promise<UserData | null>;
    declare getPaintingData: (canvasId: number, reload?: boolean, connected?: boolean) => Promise<PaintingData | null>;
    declare getCanvasUrl: (canvasId: number) => string;

    // ---------------- UID Manager ----------------
    declare getUsername: (uid: string | number) => Promise<string>;

    // ---------------- Geometry Drawer ----------------
    declare drawRect: (rect: Rectangle) => Promise<PlaceResults[][]>;
    declare drawOutline: (outline: Outline) => Promise<PlaceResults[][]>;

    // ---------------- Line Drawer ----------------
    declare drawLine: (line: Line) => Promise<void>;

    // ---------------- Text Writer ----------------
    declare drawText: (text: TextData) => Promise<[number, number]>;

    // ---------------- Image Drawer ----------------
    declare drawImage: (image: Image) => Promise<PlaceResults[][]>;

    // ---------------- Animation Drawer ----------------
    declare playAnimation: (animation: Animation) => Promise<AnimationDrawer>;

    // ---------------- Pixel Queue ----------------
    declare sortQueue: (mode: DrawingMode) => void;
    declare readQueue: () => readonly IQueuedPixel[];
    declare placePixel: (upixel: Pixel) => Promise<PlaceResults>;
    declare setPlacementSpeed: (arg: ((prevValue?: number | undefined) => number) | number, autoFix?: boolean, suppress?: boolean) => void;
    declare sendWarPackets: () => void;
    declare addToSendQueue: (p: IQueuedPixel) => void;
}
