import { ServerClient } from "../../browser/client/ServerClient";
import { constant } from "../../util/Helper";
import { Color } from "../../util/data/Color";
import { IArea, IQueuedPixel } from "../../util/data/Data";
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

    private tDelay: number = 0;

    pixelTime: { [key: string]: [number, IQueuedPixel][] } = {};

    map!: PacketListeners;

    confirmPing: number = -1;

    lastPixelPacket: number = Date.now();

    constructor(bot: Bot, connection: Connection) {

        constant(this, 'map', new Map());

        constant(this, 'bot', bot);
        constant(this, 'connection', connection);

        this.listen(RECEIVED.ERROR, (value: PPError) => {
            // process before checking handle errors
            if(this.bot.params instanceof ServerClient && value == PPError.INVALID_AUTH) {
                this.connection.newInit(true);
                return;
            }

            if(!this.bot.sysParams.handleErrors) return;
            
            const errorMessage = ErrorMessages[value as keyof typeof ErrorMessages];
            switch(value) {
                case PPError.LOGGED_OUT:
                    console.error("Auth data was invalid; will retry.");
                    this.connection.socket.close(4002);
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
                    this.connection.socket.close(4003);
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
                case PPError.RATELIMITED:
                    this.bot.ratelimited = true;
                    console.error("~~BOT RATELIMITED~~");
                    break;
            }
        });

        this.listen(RECEIVED.CHAT_CUSTOM_MESSAGE, (msg) => {
            if(!this.bot.ratelimited) return;
            this.bot.ratelimitTime = parseFloat(msg.substring("Time left: ".length).slice(0, -1))
            setTimeout(() => {
                this.bot.ratelimited = false;
                this.bot.ratelimitTime = 0;
                console.log("~~RATELIMIT OVER~~");
            }, this.bot.ratelimitTime * 1000 + 3000);
        });

        this.listen(RECEIVED.RATE_CHANGE, (rate: RateChangePacket) => {
            this.bot.rate = 12;

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

        let missileDelay = false;
        this.listen(RECEIVED.NOTIFICATION_ITEM_USE, (i) => {
            if(i.itemName.includes("Pixel")){
                missileDelay = true;
            }
        });

        const PIXEL_PACKET_TIME = 50;
        this.listen(RECEIVED.PIXEL, async (pixels: PixelPacket) => {
            if(this.connection.isWorld) this.connection.canvas.loadPixelData(pixels);

            const now = Date.now();

            const deltaTime = now - this.lastPixelPacket;
            this.lastPixelPacket = now;

            if(deltaTime < PIXEL_PACKET_TIME + 20) {
                this.bot.lagAmount = Math.max(0, this.bot.lagAmount / 2 - 10);
            }

            for(const [key, timings] of Object.entries(this.pixelTime)) {
                for(const [time, queuedPixel] of timings) {
                    if(now - time < 500) continue;
                    this.pixelTime[key].splice(this.pixelTime[key].findIndex(n => n[1] == queuedPixel), 1);
                    this.bot.addToSendQueue(queuedPixel);
                    this.bot.stats.pixels.placing.failed++;
                }
            }

            if(pixels.length == 0) return;

            if(this.bot.premium) {
                // pass the pixel update to the uid manager
                this.bot.uidMan.onPixels(pixels);
            }

            if(missileDelay && pixels.find(n => n[4] === 0)) {
                missileDelay = false;

                // wait a delay so that we repair n stuff a bit later
                await new Promise<void>((resolve) => setTimeout(resolve, 3000));
            }

            this.bot.detectPixels(pixels);
        });

        const CONFIRM_CHECKS = 10, ABOVE_AVG = 20;
        let confirmTimes: number[] = [], avg = 0;
        this.listen(RECEIVED.PIXEL_CONFIRM, ([[x,y]]) => {

            const key = `${x},${y}`;
            if(!this.pixelTime[key] || this.pixelTime[key].length == 0) {
                // owmince bug :(
                //console.log("~~WARN~~ pixel time not set this is a bug this is a bug help help help wahh");
                return;
            }

            this.bot.stats.pixels.placing.placed++;

            const [t, p] = this.pixelTime[key].shift()!;

            const delta = Date.now() - t;
            this.connection!.canvas!.pixelData!.set(x, y, p.data.col);

            if(confirmTimes.length == CONFIRM_CHECKS) {
                this.confirmPing = avg;

                const test = this.confirmPing + ABOVE_AVG;
                this.bot.lagAmount = this.bot.lagAmount * 0.1 + Math.max(0, delta - test);
            } else {
                // for now
                this.confirmPing = delta;
            }

            const time = delta / CONFIRM_CHECKS;
            confirmTimes.push(time);
            avg += time;
            if(confirmTimes.length > CONFIRM_CHECKS) {
                avg -= confirmTimes.shift()!;
            }
        });

        this.listen(RECEIVED.CANVAS, (canvas: CanvasPacket) => {
            this.connection.connected = true;
            this.connection.loadCanvas(canvas);
        });

        this.listen(RECEIVED.CANVAS_ALERT, (msg) => {
            console.log("~~CANVAS ALERT~~ " + msg);
        })

        this.listen(RECEIVED.SERVER_TIME, (num: ServerTimePacket) => {
            this.tDelay = getTDelay(num);
        });

        this.listen(RECEIVED.USERNAME, (name: UsernamePacket) => {
            // pass the username data to the uid manager
            this.bot.uidMan.onUsername(name);
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