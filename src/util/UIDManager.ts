import { Bot } from "../bot/Bot";
import { PixelPacket, UsernamePacket } from "./packets/PacketResponses";
import { Packets } from "./packets/Packets";

export default class UIDManager {

    pp: Bot;

    uidMap: Map<number, string> = new Map();

    constructor(pp: Bot) {
        this.pp = pp;
    }

    onPixels(pixels: PixelPacket) {
        pixels.forEach(([,,,,uid]) => {
            if(!uid || uid == 0) return;
            this.register(uid);
        })
    }
    onUsername(packet: UsernamePacket) {
        this.uidMap.set(packet.id, packet.name);
    }

    /**
     * Gets an account username from the uid. Requires the uid manager enabled.
     * @param uid The uid of the account.
     * @returns The username from the uid.
     */
    async getUsername(uid: string | number): Promise<string> {
        if(!this.pp.premium) {
            console.error(`~~ERROR~~ getUsername() called but the account is not premium!`);
            return "";
        }

        if (typeof uid == "string") uid = parseFloat(uid);

        let retries = 50;
        let val = this.uidMap.get(uid);

        if (val == undefined) {
            this.register(uid);
        }

        while ((val == undefined || val == "-") && retries-- > 0) {
            await new Promise<void>((resolve) => setTimeout(resolve, 100));
            val = this.uidMap.get(uid);
        }

        return (val && val != "-") ? val : "";
    }

    register(uid: number) {
        if(this.uidMap.get(uid) != undefined) return;
        
        this.uidMap.set(uid, "-");
        this.pp.emit(Packets.SENT.USERNAME, uid);
    }

}