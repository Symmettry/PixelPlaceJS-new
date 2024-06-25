import { Bot } from "../bot/Bot";
import { PixelPacket, PixelPacketData, UsernamePacket } from "./packets/PacketResponses";
import { Packets } from "./packets/Packets";

export default class UIDManager {

    pp: Bot;
    premium: boolean = false;

    uidMap: Map<number, string> = new Map();

    constructor(pp: Bot) {
        this.pp = pp;
    }

    onPixels(pixels: PixelPacket) {
        pixels.forEach((pixel: PixelPacketData) => {
            if(!pixel[4]) return;
            const uid = pixel[4];
            this.register(uid);
            this.premium = true;
        })
    }
    onUsername(packet: UsernamePacket) {
        this.uidMap.set(packet.id, packet.name);
        this.premium = true;
    }

    getUsername(uid: string | number): string | undefined {
        if(!this.premium) {
            console.error(`~~ERROR~~ Attempted access on getUsername(${uid}), but the account is not premium!`);
            return undefined;
        }

        if(typeof uid == 'string')uid = parseFloat(uid);

        const val = this.uidMap.get(uid);
        return val == "---" ? undefined : val;
    }

    register(uid: number) {
        if(this.uidMap.get(uid) != undefined) return;
        
        this.pp.send(`42["${Packets.SENT.USERNAME}",${uid.toString()}]`);
        this.uidMap.set(uid, "---");
    }

}