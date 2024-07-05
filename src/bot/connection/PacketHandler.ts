import { constant } from "../../util/Constant";
import { IArea } from "../../util/data/Data";
import { ErrorMessages, PPError } from "../../util/data/Errors";
import { AreaFightEndPacket, AreaFightStartPacket, AreaFightZoneChangePacket, CanvasPacket, MessageTuple, PacketResponseMap, PixelPacket, ServerTimePacket, UsernamePacket } from "../../util/packets/PacketResponses";
import { Packets, RECEIVED } from "../../util/packets/Packets";
import { getPalive, getTDelay } from "../../util/ping/PAlive";
import { Protector } from "../../util/Protector";
import { Bot } from "../Bot";
import { Connection } from "./Connection";

export class PacketHandler {

    private connection!: Connection;
    private bot!: Bot;

    private canvasPictureLoaded: boolean = false;
    private canvasValue!: CanvasPacket;

    private tDelay: number = 0;
    private userId: number = -1;

    private authKey!: string;
    private authToken!: string;
    private authId!: string;

    listeners!: Map<string | Packets, [func: (...args: any) => void | ((args: any) => void), boolean][]>;

    constructor(connection: Connection, authKey: string, authToken: string, authId: string) {
        constant(this, 'connection', connection);
        constant(this, 'bot', connection.bot);

        constant(this, 'listeners', new Map());

        this.updateAuth(authKey, authToken, authId);
    }

    updateAuth(authKey: string, authToken: string, authId: string): void {
        this.authKey = authKey;
        this.authToken = authToken;
        this.authId = authId;
    }

    async evaluatePacket(buffer: Buffer) {
        const data: string = buffer.toString(); // buffer -> string

        if(this.listeners.has(Packets.RECEIVED.LIB_RAW)) {
            this.listeners.get(Packets.RECEIVED.LIB_RAW)?.forEach(listener => listener[0](data));
        }
                
        // Gets the data and ID of the response. This is quite ugly but who cares fr!!!
        let index = data.indexOf("{"); // brace
        const cube = data.indexOf("["); // box
        if (index === -1 || (cube < index && cube != -1)) { 
            // if there is no brace or if the box is behind the brace & exists.
            index = cube;
        }
        // if there is a brace/box, we will substring to get the id & json, otherwise we will leave it as is
        const json = index !== -1 ? index : -1;
        const id = json == -1 ? data : data.substring(0, json);

        // if JSON, parse, else keep it
        let message;
        try {
            message = json == -1 ? data.substring(id.length) : JSON.parse(data.substring(json));
        } catch (err) {
            message = data.substring(id.length);
        }
        switch(id) {
            case "0": // socket.io start
                this.connection.send("40");
                break;
            case "40": // socket.io finish
                if(this.authKey == "" && this.authToken == "" && this.authId == "") {
                    await this.connection.newInit(false); // will generate a default auth value
                } else {
                    this.connection.sendInit(this.authKey, this.authToken, this.authId, this.connection.boardId);
                }
                //this.authKey = this.authToken = this.authId = "[REDACTED]";

                setTimeout(() => {
                    if(!this.connection.connected) {
                        console.error("Pixelplace has not responded in 10 seconds! Verify your auth data is correct and that pixelplace is online!");
                    }
                }, 10000);
                break;
            case "2": // socket.io keepalive
                this.connection.send("3");
                break;
            case "42": {// message
                this.handlePXPMessage(message);
            }
        }
    }

    private async handlePXPMessage<T extends keyof PacketResponseMap>(message: MessageTuple<T>) {
        const key: T = message[0];

        const value: PacketResponseMap[typeof key] = message[1] as PacketResponseMap[typeof key];
        // Packet listeners pre
        this.listen(key, value, true);

        // built-in functions, e.g. keepalive and pixels.
        switch(key) {
            case Packets.RECEIVED.ERROR: {
                this.handleError(value as PPError);
                break;
            }
            case Packets.RECEIVED.RATE_CHANGE: {

                // off by about 2ms
                this.bot.rate = (value as number) + 2;

                if(this.bot.checkRate == -2) {
                    this.bot.setPlacementSpeed(() => this.bot.rate, true, this.bot.suppress);
                }

                if(this.bot.checkRate < 0 || this.bot.suppress) break;

                if(this.bot.checkRate < this.bot.rate) {
                    console.warn(`~~WARN~~ (Rate change) Placement speed under ${this.bot.rate} (Current rate_change value) may lead to rate limit or even a ban! Automatically fix this with setPlacementSpeed(${this.bot.checkRate}, true)`);
                }
                break;
            }
            case Packets.RECEIVED.CHAT_STATS: { // Although repeated frequently, this is the first packet sent after init, so we'll use it.
                if(this.canvasPictureLoaded || !this.connection.isWorld || this.bot.protector) break;

                this.userId = await this.connection.canvas.Init(this.authId, this.authKey, this.authToken);
                this.bot.protector = new Protector(this.bot, this.connection.stats); // pass in the bot instance & private statistics variable
                await this.connection.canvas.loadCanvasPicture();
                this.canvasPictureLoaded = true;
                if(this.connection.connected) {
                    if(this.canvasValue == null) throw "Something bad happened. Please make an issue report on the github.";
                    this.connection.loadCanvas(this.canvasValue, this.connection.loadResolve);
                }
                break;
            }
            case Packets.RECEIVED.PING_ALIVE: { // pixelplace keepalive
                this.connection.send(`42["${Packets.SENT.PONG_ALIVE}", "${getPalive(this.tDelay, this.userId)}"]`)
                break;
            }
            case Packets.RECEIVED.PIXEL: { // pixels
                if(this.connection.isWorld)this.connection.canvas.loadPixelData(value as PixelPacket);
                if(this.bot.protector)await this.bot.protector.detectPixels(value as PixelPacket);
                
                // pass the pixel update to the uid manager
                if(this.bot.getUidManager() && (value as PixelPacket).length > 0 && (value as PixelPacket)[0].length == 5) {
                    this.bot.getUidManager().onPixels(value as PixelPacket);
                }

                // go through and verify if the pixels the bot placed were actually sent
                this.bot.verifyPixels();
                break;
            }
            case Packets.RECEIVED.CANVAS: { // canvas
                this.connection.connected = true;
                this.canvasValue = value as CanvasPacket;
                if(this.canvasPictureLoaded) {
                    this.connection.loadCanvas(value as CanvasPacket, this.connection.loadResolve);
                }
                break;
            }
            case Packets.RECEIVED.SERVER_TIME: {
                this.tDelay = getTDelay(value as ServerTimePacket); // ping.alive stuff
                break;
            }
            case Packets.RECEIVED.USERNAME: {
                // pass the username data to the uid manager
                if(this.bot.getUidManager()) {
                    this.bot.getUidManager().onUsername(value as UsernamePacket);
                }
                break;
            }
            case Packets.RECEIVED.CHAT_LOADED: {
                this.connection.chatLoaded = true;
                break;
            }
            case Packets.RECEIVED.AREAS: {
                (value as IArea[]).forEach((element: IArea) => {
                    this.connection.areas[element.name] = element;

                    if(element.state == 1) {
                        this.connection.currentWarZone = element.name;
                        this.connection.warOccurring = true;
                    }
                });
                break;
            }
            case Packets.RECEIVED.AREA_FIGHT_START: {
                const start: AreaFightStartPacket = value as AreaFightStartPacket;
                const area = this.connection.getAreaById(start.id);
                if(area == null) return; // not on /7

                area.fightEndAt = start.fightEndAt;
                area.nextFightAt = start.nextFightAt;
                area.fightType = start.fightType;

                this.connection.warOccurring = true;
                this.connection.currentWarZone = area.name;
                break;
            }
            case Packets.RECEIVED.AREA_FIGHT_END: {
                const end: AreaFightEndPacket = value as AreaFightEndPacket;
                const area = this.connection.getAreaById(end.id);
                if(area == null) return; // not on /7

                area.defended = end.defended;
                area.ownedBy = end.ownedBy;
                area.ownedByGuild = end.ownedByGuild;
                area.previousOwner = end.previousOwner;
                area.fightType = end.fightType;
                area.points = end.points;
                area.stats = end.stats;
                area.total = end.total;
                area.nextFightAt = end.nextFight; // owi, why? why nextFight and not nextFightAt like your areas packet???? WHY?! Basically the only reason I can't do area = value!
                area.canvas = end.canvas;

                this.connection.warOccurring = false;
                
                this.bot.sendWarPackets();
                break;
            }
            case Packets.RECEIVED.AREA_FIGHT_ZONE_CHANGE: {
                const change = value as AreaFightZoneChangePacket;
                const area = this.connection.getAreas()[this.connection.getCurrentWarZone()];
                if(area == null) return; // not on /7

                area.xStart = change.xStart;
                area.yStart = change.yStart;
                area.xEnd = change.xEnd;
                area.yEnd = change.yEnd;

                this.bot.sendWarPackets(); // so that it fills in the gap lmao.
            }
        }
        // Packet listeners post
        this.listen(key, value, false);
    }

    private handleError(value: PPError) {
        // process before checking handle errors
        if(value == PPError.INVALID_AUTH) {
            this.connection.newInit(true);
            return;
        }

        if(!this.bot.handleErrors) return;
        const errorMessage = ErrorMessages[value as keyof typeof ErrorMessages];
        switch(value) {
            case PPError.LOGGED_OUT:
                console.error("Auth data was invalid; will retry.");
                this.connection.socket.close();
                break;
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
            case PPError.NEED_USERNAME:
                console.error(errorMessage);
                this.connection.socket.close();
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
            case PPError.CANT_SEND_COMMANDS:
            case PPError.NEED_JOIN_GUILD:
            case PPError.NEED_PREMIUM:
            case PPError.GUILD_DISBANDED:
            case PPError.KICKED_FROM_GUILD:
                console.error(errorMessage);
                break;
        }
    }

    private listen<T extends keyof RECEIVED>(key: RECEIVED[T], value: unknown, pre: boolean) {
        // per-key
        if(this.listeners.has(key)) { // if there are listeners for this key
            this.listeners.get(key)?.forEach(listener => listener[1] == pre && listener[0](value)); // then send the value!
        }
        // all-keys
        if(this.listeners.has(Packets.RECEIVED.LIB_ALL)) {
            this.listeners.get(Packets.RECEIVED.LIB_ALL)?.forEach(listener => listener[1] == pre && listener[0](key, value));
        }
    }

}
