import { Color } from "../util/data/Color";
import { CoordSet, IQueuedPixel, Pixel, PlaceResults, PlainPixel, QueueSide } from "../util/data/Data";
import { DrawingMode, sortPixels } from "../util/data/Modes";
import { populate } from "../util/FlagUtil";
import { DelegateMethod } from "ts-delegate";
import { Packets } from "../util/packets/Packets";
import { Bot } from "./Bot";

export class PixelQueue {

    private static alertedDisallow: boolean = false;

    bot: Bot;

    private prevPlaceValue: number = 0;

    private sendQueue: Array<IQueuedPixel> = [];
    private resendQueue: Array<PlainPixel> = [];
    private sendAfterWarDone: Array<Pixel> = [];

    constructor(bot: Bot) {
        this.bot = bot;
    }

    private lastQueueTime: EpochTimeStamp = Date.now();
    private lastVerification: EpochTimeStamp = Date.now();
    queueLoop() {
        if(this.sendQueue.length == 0) {
            if(this.bot.stats.pixels.placing.placed > 0 && Date.now() - this.lastVerification > 100) {
                this.bot.sustainingLoad = Math.floor(Math.max(0, this.bot.sustainingLoad / 3 - 400));
                while(this.bot.currentBarrier > 0 && this.bot.sustainingLoad < this.bot.loadData.increases[this.bot.currentBarrier]) {
                    this.bot.currentBarrier--;
                }
                this.lastVerification = Date.now();
            }
            
            setTimeout(() => this.queueLoop(), 10);
            return;
        }
        this.lastQueueTime = Date.now();
        this.goThroughPixels();
    }

    private getPlacementSpeed() {
        const prevValue = this.prevPlaceValue;
        const newValue = this.userDefPlaceSpeed(prevValue);
        this.prevPlaceValue = newValue;
        return newValue;
    }

    /**
     * This is used internally. Calling this probably won't do anything but I don't recommend it.
     */
    @DelegateMethod()
    sendWarPackets() {
        this.sendAfterWarDone.forEach(pixel => {
            this.resendQueue.push(pixel);
        });
        this.sendAfterWarDone = [];
    }

    private userDefPlaceSpeed: (prevValue?: number) => number = () => 16;

    /**
     * Sets the placement speed of the bot
     * @param arg Either a direct number or a function for the pixeling
     * @param autoFix If the rate should automatically be updated to be rate_change value -- won't do anything if you use a function
     * @param suppress Suppress warnings if the number is below bot.rate
     */
    @DelegateMethod()
    setPlacementSpeed(arg: ((prevValue?: number | undefined) => number) | number, autoFix: boolean=true, suppress: boolean=false): void {
        this.bot.suppress = suppress;
        if(typeof arg == 'number') {
            if(this.bot.rate == -1) {
                console.warn(`~~WARN~~ The rate_change packet has not been received yet, so the placement speed cannot be verified for if it works. You likely shouldn't be setting this value right now.`);
            } else if(!suppress && arg < this.bot.rate) {
                console.warn(`~~WARN~~ Placement speed under ${this.bot.rate} (Current rate_change value) may lead to rate limit or even a ban! (Suppress with setPlacementSpeed(${arg}, ${autoFix}, true); not recommended)`);
            }
            this.userDefPlaceSpeed = () => arg;
            if(autoFix) {
                this.bot.checkRate = -2;
            } else {
                this.bot.checkRate = arg;
            }
            if(arg > this.bot.maxPixelWait) {
                this.bot.maxPixelWait = arg;
            }
            return;
        }
        this.userDefPlaceSpeed = arg as any;
        this.bot.checkRate = -1;
    }
    
    private accurateTimeout(call: () => void, time: number): void {
        if(isNaN(time) || time < 0) {
            console.error(this);
            throw new Error("Sleeping for an invalid amount of time " + time + "!! Something is wrong, pls report with your code and the above text");
        }
        if(time == 0) return call();

        const start = Date.now();
        function loop() {
            const elapsed = Date.now() - start;
            if (elapsed < time) {
                setImmediate(loop);
            } else {
                call();
            }
        }
        setImmediate(loop);
    }

    private resolvePixel(oldCol: Color, queuedPixel: IQueuedPixel): void {
        if(queuedPixel.resolve) queuedPixel.resolve({ pixel: queuedPixel.data, oldColor: oldCol });
        setImmediate(() => this.goThroughPixels());
    }

    applySpeedChanges(queuedPixel: IQueuedPixel): number {
        this.bot.sustainingLoad++;
        if(this.bot.sustainingLoad >= this.bot.loadData.reset) {
            this.bot.sustainingLoad = 0;
        }
        if(this.bot.sustainingLoad > this.bot.loadData.barriers[this.bot.currentBarrier]) {
            if(this.bot.currentBarrier != this.bot.loadData.barriers.length - 1 && this.bot.sustainingLoad > this.bot.loadData.barriers[this.bot.currentBarrier + 1]) {
                this.bot.currentBarrier++;
            }
        } else if (this.bot.currentBarrier > 0) {
            this.bot.currentBarrier--;
        }
        queuedPixel.speed += this.bot.loadData.increases[this.bot.currentBarrier];

        queuedPixel.speed += this.bot.lagAmount * this.bot.lagIncreasePerMs;

        if(this.bot.ratelimited) queuedPixel.speed += 100;

        if(this.bot.specialQueueInfo) {
            const { amount, time, start } = this.bot.specialQueueInfo;
            const isFunc = typeof time == 'function';
            if(isFunc || Date.now() - start < time) {
                if(amount < 0) {
                    const call = () => {
                        this.sendQueue.unshift(queuedPixel);
                        this.goThroughPixels();
                    };
                    if(isFunc) time(call);
                    else setTimeout(call, time);
                    return Infinity;
                }
                queuedPixel.speed += amount;
            } else {
                this.bot.specialQueueInfo = null;
            }
        }
        return queuedPixel.speed;
    }

    goThroughPixels(): void {

        if(this.sendQueue.length == 0) {
            this.lastVerification = Date.now();
            this.queueLoop();
            return;
        }

        if(Date.now() - this.lastQueueTime > 400 && Date.now() - this.bot.getConnection().timeSinceConfirm() > 1000) {
            console.log("~~PIXELPLACE LAGGING~~");
            setTimeout(() => {
                this.lastVerification = Date.now();
                this.queueLoop();
            }, 2000);
            return;
        }

        let colAtSpot: Color | undefined;
        let queuedPixel: IQueuedPixel | undefined;
        do {
            if(queuedPixel != undefined && queuedPixel.resolve) queuedPixel.resolve({ pixel: queuedPixel.data, oldColor: colAtSpot! });
            queuedPixel = this.sendQueue.shift();
            colAtSpot = queuedPixel ? this.bot.getPixelAt(queuedPixel.data.x, queuedPixel.data.y) : undefined;
        } while ((colAtSpot == undefined || colAtSpot == Color.OCEAN || queuedPixel == undefined
            || (!queuedPixel.data.force && colAtSpot == queuedPixel.data.col))
            && this.sendQueue.length > 0);

        if(queuedPixel == undefined) {
            this.lastVerification = Date.now();
            this.queueLoop();
            return;
        }

        const {x, y, protect, wars } = queuedPixel.data;

        const skippedWar = !wars && this.bot.isWarOccurring() && this.bot.isPixelInWarZone(this.bot.getCurrentWarZone(), x, y);
        if(skippedWar) {
            if(protect) {
                let updated = false;
                for (let i = 0; i < this.sendAfterWarDone.length; i++) {
                    if (this.sendAfterWarDone[i].x === queuedPixel.data.x && this.sendAfterWarDone[i].y === queuedPixel.data.y) {
                        this.sendAfterWarDone[i].col = queuedPixel.data.col;
                        updated = true;
                        break;
                    }
                }

                if (!updated) {
                    this.sendAfterWarDone.push(queuedPixel.data);
                }
            }
            this.resolvePixel(colAtSpot!, queuedPixel)
            return;
        }

        queuedPixel.speed = this.applySpeedChanges(queuedPixel);
        if(queuedPixel.speed == Infinity) return;

        this.accurateTimeout(() => this.sendPixel(queuedPixel), Math.max(0, Math.min(queuedPixel.speed, this.bot.maxPixelWait)));
        return;
    }

    lastPixel: number = Date.now();

    private async sendPixel(queuedPixel: IQueuedPixel): Promise<void> {
        if(!this.bot.isConnected()) {
            this.bot.getConnection().verify().then(() => {
                this.lastVerification = Date.now();
                this.addToSendQueue(queuedPixel);
                this.queueLoop();
            });
            return;
        }

        const {x, y, col, brush = 1, wars = false, force = false, protect = false} = queuedPixel.data;

        const colAtSpot = this.bot.getPixelAt(x, y);
        const skipped = ((!force && colAtSpot == col) || colAtSpot == null || colAtSpot == Color.OCEAN)
                            || (!wars && this.bot.isWarOccurring() && this.bot.isPixelInWarZone(this.bot.getCurrentWarZone(), x, y));

        this.resolvePixel(colAtSpot!, queuedPixel);

        if(skipped) {
            return;
        }

        this.bot.getConnection().timePixel(queuedPixel);
        await this.bot.emit(Packets.SENT.PIXEL, [x, y, col == Color.OCEAN ? -100 : col, brush]);
        this.lastPixel = Date.now();

        // statistics
        const pixelStats = this.bot.stats.pixels;

        pixelStats.placing.attempted++;

        pixelStats.placing.last_pos[0] = x;
        pixelStats.placing.last_pos[1] = y;

        if(!pixelStats.colors[col])pixelStats.colors[col] = 0;
        pixelStats.colors[col]++;

        if(pixelStats.placing.first_time == -1) pixelStats.placing.first_time = Date.now();

        if(protect) {
            // most accurate i can get it sigh
            pixelStats.protection.repaired++;
            pixelStats.protection.last_repair = Date.now();
        }
    }

    /**
     * Internal use only
     */
    @DelegateMethod()
    addToSendQueue(p: IQueuedPixel): void {
        if(!p.data.side || p.data.side == QueueSide.BACK) this.sendQueue.push(p);
        else this.sendQueue.unshift(p);
    }

    /**
     * Places a pixel
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @param col The color of the pixel.
     * @param brush The brush to place the pixel. Defaults to 1.
     * @param protect Whether the pixel should be replaced when changed. Defaults to false.
     * @param wars Whether the pixel should be placed if it's in a war zone during a war. Defaults to false (will get you banned if a mod sees).
     * @param force Whether the pixel packet should still be sent even if it won't change the color. Defaults to false.
     * @returns A promise that resolves upon the pixel being sent.
     */
    @DelegateMethod()
    async placePixel(upixel: Pixel): Promise<PlaceResults> {
        const pixel = populate(upixel);
        const {x, y, col, protect, async } = pixel;

        if(!this.bot.isValidPosition(x, y)) {
            console.log("~~WARN~~ Skipping invalid position: ", x, y);
            return Promise.resolve(null);
        }

        if(!this.bot.isValidColor(col)) {
            console.log("~~WARN~~ Skipping invalid color: ", col, ", at", x, y);
            return Promise.resolve(null);
        }

        const colAtSpot = this.bot.getPixelAt(x, y);
        if(colAtSpot == Color.OCEAN) {
            return Promise.resolve(null);
        }

        if(this.bot.boardId == 7 && this.bot.sysParams.warnRuleBreakage) {
            const region = this.bot.getRegionAt(x, y);
            if(!PixelQueue.alertedDisallow && !region.canBot) {
                PixelQueue.alertedDisallow = true;
                console.warn(`~~WARN~~ You are botting in a disallowed area: ${region.name} @ (${x},${y})\nThis warning will not repeat again.`);
            } else if(!this.bot.premium && region.name == "Premium Island") {
                console.warn(`~~WARN~~ Your account is not premium, and the bot tried to place at ${x},${y} on Premium Island.`);
                return Promise.resolve(null);
            }
        }

        if(!this.bot.isProtected(x, y) || pixel.replaceProtection) {
            this.bot.updateProtection(protect!, x, y, col);
        } else {
            return Promise.resolve({ pixel, oldColor: this.bot.getPixelAt(x, y)! });
        }

        if(this.resendQueue.length > 0) {
            const pixel: PlainPixel | undefined = this.resendQueue.shift();
            if(pixel != null) {
                const p = this.placePixel(pixel);
                if(pixel.async) await p;
            }
        }

        if(this.sendQueue.length == 0 && colAtSpot == col) {
            return Promise.resolve({ pixel, oldColor: col });
        }

        if(async) {
            return new Promise<PlaceResults>((resolve) => this.addToSendQueue({data: pixel, speed: this.getPlacementSpeed(), resolve}) );
        }
        this.addToSendQueue({data: pixel, speed: this.getPlacementSpeed(), resolve: null})
        return Promise.resolve({ pixel, oldColor: this.bot.getPixelAt(x, y) } as PlaceResults);
    }

    /**
     * Sorts the current queue with a drawing mode
     * 
     * You can take advantage of this by adding a bunch of pixels into queue with async: false, then sort.
     */
    @DelegateMethod()
    sortQueue(mode: DrawingMode) {
        const pixels = this.sendQueue.map(n => n.data);
        const map: CoordSet<IQueuedPixel> = {};
        for(const qp of this.sendQueue) {
            const {x, y} = qp.data;
            map[x] ??= {};
            map[x][y] = qp;
        }
        this.sendQueue = sortPixels(pixels, map, mode);
    }

    @DelegateMethod()
    readQueue(): readonly IQueuedPixel[] {
        return this.sendQueue as readonly IQueuedPixel[];
    }

}