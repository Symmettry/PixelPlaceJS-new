import { WebSocket } from "ws";
import { ChatCommandSet, ClientPackets, PixelPipeSettings, ServerPackets, SocketEvent, EvalString } from "../SocketData";
import { UUID } from "crypto";
import { SocketHook } from "../SocketHook";
import { Bot } from "../../bot/Bot";
import { RequestHandler } from "./RequestHandler";
import { MenuData, MenuObject } from "../menu/MenuData";
import { convertObject, menuToWire } from "../menu/MenuParser";
import { Color } from "../../util/data/Color";
import { BoardID, BoardTemplate } from "../../util/data/Data";

export class ServerClient {

    private listeners: {[key: string]: ((data: any) => void)[]} = {};

    server: SocketHook;
    ws: WebSocket;
    uuid: UUID;

    boardID!: BoardID;
    userID!: number;
    width!: number;
    height!: number;
    uidManager!: boolean;
    canvasData: Color[] = [];
    username!: string;
    template!: BoardTemplate;

    readyState: number = WebSocket.OPEN;

    bot: Bot | undefined;

    debug: (...data: any) => void;

    private reqHandler: RequestHandler;

    private callListener(event: ClientPackets, data: any) {
        if(!this.listeners[event]) return;
        this.listeners[event].forEach(c => c(data));
    }

    private callbacks: {[key: UUID]: Function} = {};

    constructor(server: SocketHook, ws: WebSocket, uuid: UUID) {
        this.server = server;
        this.ws = ws;
        this.uuid = uuid;

        this.reqHandler = new RequestHandler(this);

        this.debug = (...data: any) => this.server.debug(...data);

        this.ws.on('message', (packet) => {
            const msg = packet.toString();

            const key = msg.charCodeAt(0);
            const data = msg.substring(1);

            if(key != ClientPackets.CANVAS_ONE && key != ClientPackets.CANVAS_TWO && key != ClientPackets.SOCKET_DATA)
                this.debug("Received client packet", ClientPackets[key], "&", data);

            this.callListener(key, data);
        });

        this.ws.on('close', () => {
            this.server.callListener(SocketEvent.DISCONNECTION, this);
        });

        this.onPacket(ClientPackets.INFO, async (info) => {
            const { boardID, userID, width, height, premium, username, template } = JSON.parse(info);

            this.boardID = boardID;
            this.userID = userID;
            this.width = width;
            this.height = height;
            this.uidManager = premium;
            this.username = username;
            this.template = template;

            this.debug("Emit settings", server.settings);
            this.emit(ServerPackets.SETTINGS, JSON.stringify(server.settings));
        });

        this.onPacket(ClientPackets.CANVAS_ONE, (data) => {
            Array.from(data).forEach(p => this.canvasData.push((p as string).charCodeAt(0) as Color));
        });

        this.onPacket(ClientPackets.CANVAS_TWO, async (data) => {
            this.debug("Canvas received, making bot");

            // browserClient is enabled when canvas is sent
            this.bot = new Bot(this, false);
            this.bot.rate = 12;
            this.server.botList.push([this.bot, this]);

            if(!this.server.botResolve || !this.server.botAmount) {
                console.warn("~~WARN~~ Do await socket.bots(amount) to wait for bots to load!");
                return;
            }

            await this.bot.Init();
            this.server.botAmount--;
            if(this.server.botAmount == 0) {
                this.server.botResolve();
            }
        });

        this.onPacket(ClientPackets.REQUEST_CALLBACK, (data) => {
            const [uuid, val] = JSON.parse(data);
            if(!this.callbacks[uuid]) throw new Error(`Unknown callback ID: ${uuid}`);
            this.callbacks[uuid](val);
        });
    }

    private emit(packet: ServerPackets, data: any) {
        if(packet != ServerPackets.SOCKET_SEND) this.debug("Emitting server packet:", ServerPackets[packet], "&", data);
        this.ws.send(String.fromCharCode(packet) + data);
    }

    /** Userscript will eval this */
    sendCode(code: EvalString) {
        this.emit(ServerPackets.CODE, code);
    }

    /**
     * Adds menu data
     */
    sendMenuData(data: MenuData) {
        const [ e, menu, cb ] = menuToWire(data);
        if(e) this.sendCode(e);
        Object.entries(cb).forEach(([uuid, func]) => this.callbacks[uuid as UUID] = func);
        this.emit(ServerPackets.MENU_DATA, menu);
    }

    /**
     * Adds a menu object to the current screen
     */
    addObject(o: MenuObject) {
        const [e, obj, cb] = convertObject(o);
        if(e) this.sendCode(e);
        if(cb) this.callbacks[cb[0] as UUID] = cb[1];
        this.emit(ServerPackets.ADD_TO_MENU, JSON.stringify(obj));
    }

    /**
     * Sets the menu on the userscript to the tagged menu
     */
    changeMenu(menuTag: string) {
        this.emit(ServerPackets.MENU_CHANGE, menuTag);
    }

    /**
     * Sends data through the pixelplace websocket
     */
    send(data: any) {
        this.emit(ServerPackets.SOCKET_SEND, data);
    }

    /**
     * Will emit a fake packet through the pxp socket
     */
    fakeReceive(data: string) {
        this.emit(ServerPackets.CODE, `window.fakeMessage(${data})`);
    }

    /**
     * Pipes pixels to the bot queue with some settings
     */
    pipePixels(settings: PixelPipeSettings = {}) {
        this.reqHandler.pixelPipeSettings = settings;
    }

    /**
     * Allows the listed packets to flow as normal from the user; e.g. user.profile
     */
    allowPackets(...packets: string[]) {
        this.reqHandler.allowPackets(...packets);
    }

    writeCommands(prefix: string, commands: ChatCommandSet) {
        this.reqHandler.writeCommands(prefix, commands);
    }

    /**
     * Sends a fake chat message; will fill in some defaults for stuff like name. Runs using ChatMessagePacket data
     */
    fakeChat(data: {[key: string]: any}) {
        data.username ??= "PPJS";
        data.color ??= 0;
        data.guild ??= "",
        data.message ??= "<no message provided>";
        data.admin ??= true;
        data.mod ??= false;
        data.chatmod ??= false;
        data.premium ??= true;
        data.icons ??= ['admin'];
        data.rainbow ??= false;
        data.xmas ??= false;
        data.halloween ??= false;
        data.channel ??= "global";
        data.golden ??= 0;
        data.mention ??= "";
        data.target ??= "";
        data.type ??= "chat";
        data.snowballed ??= 0;
        data.createdAt ??= new Date().toISOString();

        this.emit(ServerPackets.CODE, `window.fakeChat(${JSON.stringify(data)})`);
    }

    close(code: number) {
        this.ws.close(code);
    }

    /**
     * Listens for a packet
     * @param packet The packet
     * @param callback Callback with the data
     */
    onPacket(packet: ClientPackets, callback: (data: any) => void) {
        if(!this.listeners[packet]) this.listeners[packet] = [];
        this.listeners[packet].push(callback);
    }

    on(str: string, callback: (...any: any[]) => void) {
        if(typeof str != 'string') {
            console.warn(`~~WARN Listening for ${str} on userscript socket.. did you mean onPacket()? (${ClientPackets[str] ?? "?????"})~~`);
        }
        if(str == 'message') {
            this.onPacket(ClientPackets.SOCKET_DATA, callback);
            return;
        }
        this.ws.on(str, callback);
    }

}