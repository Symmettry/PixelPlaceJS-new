import { constant } from "../../util/Constant";
import { IArea } from "../../util/data/Data";
import { ErrorMessages, PPError } from "../../util/data/Errors";
import { AreaFightEndPacket, AreaFightStartPacket, AreaFightZoneChangePacket, AreasPacket, CanvasPacket, PacketResponseMap, PixelPacket, RateChangePacket, ServerTimePacket, UsernamePacket } from "../../util/packets/PacketResponses";
import { RECEIVED, SENT } from "../../util/packets/Packets";
import { getPalive, getTDelay } from "../../util/ping/PAlive";
import { Bot } from "../Bot";
import { Connection } from "./Connection";
import { PacketListeners } from "./PacketHandler";

export class InternalListeners {

    private bot!: Bot;
    private connection!: Connection;

    private tDelay: ServerTimePacket = 0;

    pixelTime: { [key: string]: number } = {};

    map!: PacketListeners;

    confirmPing: number = -1;

    constructor(bot: Bot, connection: Connection) {

        constant(this, 'map', new Map());

        constant(this, 'bot', bot);
        constant(this, 'connection', connection);

        this.listen(RECEIVED.ERROR, (value: PPError) => {
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
        });

        this.listen(RECEIVED.RATE_CHANGE, (rate: RateChangePacket) => {
            this.bot.rate = rate + 3;

            if(this.bot.checkRate == -2) {
                this.bot.setPlacementSpeed(() => this.bot.rate, true, this.bot.suppress);
            }

            if(this.bot.checkRate < 0 || this.bot.suppress) return;

            if(this.bot.checkRate < this.bot.rate) {
                console.warn(`~~WARN~~ (Rate change) Placement speed under ${this.bot.rate} (Current rate_change value) may lead to rate limit or even a ban! Automatically fix this with setPlacementSpeed(${this.bot.checkRate}, true)`);
            }
        });

        this.listen(RECEIVED.PING_ALIVE, () => {
            this.connection.emit(SENT.PONG_ALIVE, getPalive(this.tDelay, this.bot.userId));
        });

        this.listen(RECEIVED.PIXEL, (pixels: PixelPacket) => {
            if(pixels.length == 0) return;

            if(this.connection.isWorld) this.connection.canvas.loadPixelData(pixels);
            if(this.bot.protector) this.bot.protector.detectPixels(pixels);

            const hasUID = pixels[0].length == 5;
            if(hasUID) {
                // pass the pixel update to the uid manager
                const uidMan = this.bot.getUidManager()
                if(uidMan != null) uidMan.onPixels(pixels);
            }

            if(Date.now() - this.bot.lastPixel > 100) {
                if(this.bot.sustainingLoad > this.bot.loadBarrier) {
                    console.log("Load settled down, back to normal placing.");
                }
                this.bot.sustainingLoad = 0;
            }

            // go through and verify if the pixels the bot placed were actually sent
            this.bot.verifyPixels();
        });

        const CONFIRM_CHECKS = 10, ABOVE_AVG = 50;
        let confirmTimes: number[] = [];
        this.listen(RECEIVED.PIXEL_CONFIRM, ([[x, y]]) => {
            const key = `${x},${y}`;
            if(!this.pixelTime[key]) {
                // owmince bug :(
                //console.log("~~WARN~~ pixel time not set this is a bug this is a bug help help help wahh");
                return;
            }
            const delta = Date.now() - this.pixelTime[key];
            delete this.pixelTime[key];

            if(confirmTimes.length == CONFIRM_CHECKS) {
                this.confirmPing = confirmTimes.reduce((prev, cur) => prev + cur, 0) / CONFIRM_CHECKS;

                const test = this.confirmPing + ABOVE_AVG;
                this.bot.lagAmount = Math.max(0, delta - test);
            } else {
                // for now
                this.confirmPing = delta;
            }

            confirmTimes.push(delta);
            if(confirmTimes.length > CONFIRM_CHECKS) {
                confirmTimes.shift();
            }
        });

        this.listen(RECEIVED.CANVAS, (canvas: CanvasPacket) => {
            this.connection.connected = true;
            this.connection.loadCanvas(canvas);
        });

        this.listen(RECEIVED.SERVER_TIME, (num: ServerTimePacket) => {
            this.tDelay = getTDelay(num);
        });

        this.listen(RECEIVED.USERNAME, (name: UsernamePacket) => {
            // pass the username data to the uid manager
            if(this.bot.getUidManager()) {
                this.bot.getUidManager().onUsername(name);
            }
        });

        this.listen(RECEIVED.USERNAME, () => {
            this.connection.chatLoaded = true;
        });

        this.listen(RECEIVED.AREAS, (areas: AreasPacket) => {
            areas.forEach((element: IArea) => {
                this.connection.areas[element.name] = element;

                if(element.state == 1) {
                    this.connection.currentWarZone = element.name;
                    this.connection.warOccurring = true;
                }
            });
        });

        this.listen(RECEIVED.AREA_FIGHT_START, (start: AreaFightStartPacket) => {
            const area = this.connection.getAreaById(start.id);
            if(area == null) return; // not on /7

            area.fightEndAt = start.fightEndAt;
            area.nextFightAt = start.nextFightAt;
            area.fightType = start.fightType;

            this.connection.warOccurring = true;
            this.connection.currentWarZone = area.name;
        })

        this.listen(RECEIVED.AREA_FIGHT_END, (end: AreaFightEndPacket) => {
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
        });

        this.listen(RECEIVED.AREA_FIGHT_ZONE_CHANGE, (change: AreaFightZoneChangePacket) => {
            if(this.connection.boardId != 7) return;
            
            const area = this.connection.getAreas()[this.connection.getCurrentWarZone()];
            if(area == null) return; // not on /7

            area.xStart = change.xStart;
            area.yStart = change.yStart;
            area.xEnd = change.xEnd;
            area.yEnd = change.yEnd;

            this.bot.sendWarPackets(); // so that it fills in the gap lmao.
        });

    }

    private listen<T extends keyof PacketResponseMap>(key: T, func: (args: PacketResponseMap[T]) => void) {
        if(!this.map.has(key)) this.map.set(key, []);
        this.map.get(key)?.push([func, false]);
    }

}