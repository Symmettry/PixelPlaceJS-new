import { Bot } from "./bot/Bot";
import { Auth } from "./bot/Auth";
import { OutgoingHttpHeaders } from "http2";

export type HeaderTypes = "canvas-image" | "get-painting" | "socket" | "relog";

/**
 * Contains all bots and handles them.
 */
class PixelPlace {

    bots: Bot[];

    /**
     * Creates a new pixelplace instance and makes bots with all auth data
     * @param auths A list of auth data for the bots.
     * @param autoRestart If the bots should automatically restart when closed.
     * @param handleErrors If the bots should handle errors when received. Invalid auth id is always processed regardless of this value.
     */
    constructor(auths: Auth[], autoRestart: boolean = true, handleErrors: boolean = true) {
        this.bots = [];
        auths.forEach(auth => {
            this.bots.push(new Bot(auth, autoRestart, handleErrors)); // create each bot instance
        });
    }

    /**
     * In the event that cloudflare is turned on or something, you can do stuff like put cloudflare clearance here.
     * @param headers A function that receives the type and returns header object.
     * @returns this
     */
    setHeaders(headers: (type: HeaderTypes) => OutgoingHttpHeaders): PixelPlace {
        this.bots.forEach(bot => {
            bot.setHeaders(headers);
        });
        return this;
    }

    /**
     * Initiates all the bots
     * @returns A promise that resolves upon the bots initiating fully.
     */
    async Init(): Promise<void> {
        return new Promise<void>((resolve) => {
            Promise.all(this.bots.map(bot => bot.Init())).then(() => setTimeout(resolve, 3000));
        });
    }

}

export { PixelPlace };