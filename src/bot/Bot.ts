import * as Canvas from '../util/canvas/Canvas.js';
import { ImageDrawer } from '../util/drawing/ImageDrawer.js';
import { Protector } from "../util/Protector.js";
import { Packets } from "../util/packets/Packets.js";
import { IStatistics, defaultStatistics, IBotParams, IDebuggerOptions, BoardID } from '../util/data/Data.js';
import UIDManager from '../util/UIDManager.js';
import { Connection } from './connection/Connection.js';
import { delegate, Delegate, DelegateStatic, delegateStatic, OmitFirst } from 'ts-delegate';
import { TextWriter } from '../util/drawing/fonts/TextWriter.js';
import { LineDrawer } from '../util/drawing/LineDrawer.js';
import { RateChangePacket } from '../util/packets/PacketResponses.js';
import { HeadersFunc, HeaderTypes, SystemParameters } from '../PixelPlace.js';
import { OutgoingHttpHeaders } from 'http';
import { NetUtil } from '../util/NetUtil';
import { ServerClient } from '../browser/client/ServerClient.js';
import { AnimationDrawer } from '../util/drawing/AnimationDrawer.js';
import { GeometryDrawer } from '../util/drawing/GeometryDrawer.js';
import { PixelQueue } from './PixelQueue.js';
import { constant } from '../util/Helper.js';
import { InternalListeners } from './connection/InternalListeners.js';
import { FontData } from '../util/drawing/fonts/Font.js';

/**
 * Pixelplace bot instance.
 * 
 * Contains helper functions etc.
 */
export class Bot implements
    Delegate<[Protector, UIDManager, Connection, Canvas.Canvas, NetUtil, PixelQueue, InternalListeners]>,
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
    netUtil: NetUtil;

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
                case 'get-data':
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
        if(this.isConnected && this.isConnected()) {
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
    declare isConnected: Connection['isConnected'];

    declare emit: Connection['emit'];
    declare send: Connection['send'];

    declare on: Connection['on'];

    declare getCurrentWarZone: Connection['getCurrentWarZone'];
    declare isPixelInWarZone: Connection['isPixelInWarZone'];
    declare isPixelInAnyWarZone: Connection['isPixelInAnyWarZone'];
    declare isWarOccurring: Connection['isWarOccurring'];

    declare getArea: Connection['getArea'];
    declare getAreaById: Connection['getAreaById'];
    declare getAreas: Connection['getAreas'];

    declare isChatLoaded: Connection['isChatLoaded'];

    declare queuedPixels: Connection['queuedPixels'];

    declare bombPixels: Connection['bombPixels'];

    // ---------------- Canvas ----------------
    declare readonly canvasWidth: Canvas.Canvas['canvasWidth'];
    declare readonly canvasHeight: Canvas.Canvas['canvasHeight'];
    declare getPixelAt: Canvas.Canvas['getPixelAt'];
    declare getRegionAt: Canvas.Canvas['getRegionAt'];
    declare isValidPosition: Canvas.Canvas['isValidPosition'];
    declare getCanvasData: Canvas.Canvas['getCanvasData'];
    declare getColorIds: Canvas.Canvas['getColorIds'];
    declare createImage: Canvas.Canvas['createImage'];
    declare getItemData: Canvas.Canvas['getItemData'];
    declare isValidColor: typeof Canvas.Canvas.isValidColor;
    declare getRandomColor: typeof Canvas.Canvas.getRandomColor;
    declare getClosestColorId: typeof Canvas.Canvas.getClosestColorId;

    // ---------------- Protector ----------------
    declare updateProtection: Protector['updateProtection'];
    declare detectPixels: Protector['detectPixels'];
    declare protect: Protector['protect'];
    declare unprotect: Protector['unprotect'];
    declare getProtectedColor: Protector['getProtectedColor'];
    declare isProtected: Protector['isProtected'];

    // ---------------- Net util ----------------
    declare getUniquePlayerId: NetUtil['getUniquePlayerId'];
    declare getUserData: NetUtil['getUserData'];
    declare getPaintingData: NetUtil['getPaintingData'];
    declare getCoinIsland: NetUtil['getCoinIsland'];
    declare getCanvasUrl: typeof NetUtil.getCanvasUrl;

    // ---------------- UID Manager ----------------
    declare getUsername: UIDManager['getUsername'];

    // ---------------- Geometry Drawer ----------------
    declare drawRect: OmitFirst<typeof GeometryDrawer.drawRect>;
    declare drawOutline: OmitFirst<typeof GeometryDrawer.drawOutline>;

    // ---------------- Line Drawer ----------------
    declare drawLine: OmitFirst<typeof LineDrawer.drawLine>;

    // ---------------- Text Writer ----------------
    declare drawText: OmitFirst<typeof TextWriter.drawText>;
    declare getTextLength: typeof TextWriter.getTextLength;

    // ---------------- Image Drawer ----------------
    declare drawImage: OmitFirst<typeof ImageDrawer.drawImage>;

    // ---------------- Animation Drawer ----------------
    declare playAnimation: OmitFirst<typeof AnimationDrawer.playAnimation>;

    // ---------------- Pixel Queue ----------------
    declare readonly loadData: PixelQueue['loadData'];
    declare sortQueue: PixelQueue['sortQueue'];
    declare readQueue: PixelQueue['readQueue'];
    declare placePixel: PixelQueue['placePixel'];
    declare setPlacementSpeed: PixelQueue['setPlacementSpeed'];
    declare sendWarPackets: PixelQueue['sendWarPackets'];
    declare addToSendQueue: PixelQueue['addToSendQueue'];
    declare finishQueue: PixelQueue['finishQueue'];
    declare setLoadData: PixelQueue['setLoadData'];

    // ---------------- Internal Listeners ----------------
    declare isNewChat: InternalListeners['isNewChat'];

}
