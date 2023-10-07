import { Bot } from "../bot/Bot";

export default class UIDManager {

    pp: Bot;
    premium: boolean;

    // warnings if the account isnt premium.
    hasWarned: number = 0;

    uidMap: Map<string, string> = new Map();

    constructor(pp: Bot, premium: boolean) {
        this.pp = pp;
        this.premium = premium; // If the bot is marked as not premium, we can do a warning
    }

    onPixels(pixels: number[][]) {
        pixels.forEach((pixel: number[]) => {
            if(pixel.length == 5) {
                if(this.premium) {
                    const uid = pixel[4];
                    this.register(uid);
                } else if (Date.now() - this.hasWarned >= 10000) {
                    console.warn("~~WARN~~ The account was marked as not premium in auth, but it is premium! new Auth({...}, boardId, true); (This message will repeat every 10 seconds)");
                    this.hasWarned = Date.now();
                }
            } else if(this.premium && Date.now() - this.hasWarned >= 10000) {
                console.warn("~~WARN~~ The account was marked as premium in auth, but it is not premium! (It will not receive UIDs which is the isPremium feature; this message will repeat every 10 seconds)");
                this.hasWarned = Date.now();
            }
        })
    }
    onUsername(id: string, name: string) {
        this.uidMap.set(id, name);
    }

    getUsername(uid: string | number): string | undefined {
        if(!this.premium) {
            console.warn(`~~WARN~~ Attempted access on getUsername(${uid}), but the account was not amrked premium in auth! new Auth({...}, boardId, true);`);
            return undefined;
        } else {
            if(typeof uid == 'number')uid = uid.toString();
            const val = this.uidMap.get(uid);
            return val == "---" ? undefined : val;
        }
    }

    register(uid: number) {
        if(this.uidMap.get(uid.toString()) == undefined) {
            this.pp.emit("u", uid);
            this.uidMap.set(uid.toString(), "---");
        }
    }

}