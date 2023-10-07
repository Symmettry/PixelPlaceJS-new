import { Bot } from "../bot/Bot";

export default class UIDManager {

    pp: Bot;

    // warnings if the account isnt premium.
    hasWarned: number = 0;

    uidMap: Map<string, string> = new Map();

    constructor(pp: Bot) {
        this.pp = pp;
    }

    onPixels(pixels: number[][]) {
        pixels.forEach((pixel: number[]) => {
            if(pixel.length == 5) {
                let uid = pixel[4];
                this.register(uid.toString());
            } else {
                if(Date.now() - this.hasWarned >= 10000) {
                    console.log("~~WARNING~~ User ID manager has been enabled on the bot, but the account is not premium! (It will not receive UIDs, this message will repeat every 10 seconds)");
                    this.hasWarned = Date.now();
                }
            }
        })
    }
    onUsername(id: string, name: string) {
        this.uidMap.set(id, name);
    }

    getUsername(uid: string | number): string | undefined {
        if(typeof uid == 'number')uid = uid.toString();
        return this.uidMap.get(uid);
    }

    register(uid: string) {
        this.pp.emit("u", uid);
        this.uidMap.set(uid, "---");
    }

}