import { Bot } from "../bot/Bot";
import { Packets } from "./data/Packets";

export default class UIDManager {

    pp: Bot;
    premium: boolean = false;

    uidMap: Map<number, string> = new Map();

    constructor(pp: Bot) {
        this.pp = pp;
    }

    onPixels(pixels: number[][]) {
        pixels.forEach((pixel: number[]) => {
            if(pixel.length == 5) {
                const uid = pixel[4];
                this.register(uid);
                this.premium = true;
            }
        })
    }
    onUsername(id: number, name: string) {
        this.uidMap.set(id, name);
        this.premium = true;
    }

    getUsername(uid: string | number): string | undefined {
        if(!this.premium) {
            console.error(`~~ERROR~~ Attempted access on getUsername(${uid}), but the account is not premium!`);
            return undefined;
        } else {
            if(typeof uid == 'string')uid = parseFloat(uid);
            const val = this.uidMap.get(uid);
            return val == "---" ? undefined : val;
        }
    }

    register(uid: number) {
        if(this.uidMap.get(uid) == undefined) {
            this.pp.emit(Packets.SENT.USERNAME, uid);
            this.uidMap.set(uid, "---");
        }
    }

}