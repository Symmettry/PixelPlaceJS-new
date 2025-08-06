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
     * Sets the headers of the bot to a pre-made one, but changed based on your cookies.
     * @param cookie 
     */
    setCFClearance(cookie: string): PixelPlace {
        return this.setHeaders((type) => {
            const h: {[key: string]: string} = {
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Accept-Language": "en-US,en;q=0.9",
                "Cookie": `cf_clearance=${cookie};`,
                "Priority": "u=1, i",
                "Referer": "https://pixelplace.io/",
                "Sec-Ch-Ua": "\"Brave\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
                "Sec-Ch-Ua-Mobile": "?0",
                "Sec-Ch-Ua-Model": "\"\"",
                "Sec-Ch-Ua-Platform": "\"Windows\"",
                "Sec-Ch-Ua-Platform-Version": "\"10.0.0\"",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Sec-Gpc": "1",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
                "X-Requested-With": "XMLHttpRequest"
            };
            switch(type) {
                case "socket":
                    h["Connection"]    = "Upgrade";
                    h["Cache-Control"] = "no-cache";
                    break;
                 case "canvas-image":
                    h["Cache-Control"] = "no cache";
                    h['Accept']        = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
                    break;
                case "get-painting":
                    h['Accept']        = "application/json, text/javascript, */*; q=0.01";
                    break;
            }
            return h;
        });
    }

    async CallOnBots(foreach: (bot: Bot) => void): Promise<void[]> {
        return Promise.all(this.bots.map(foreach));
    }

    /**
     * Connects all bots
     * @returns A promise that resolves upon the bots connecting.
     */
    async Connect(): Promise<void[]> {
        return this.CallOnBots(bot => bot.Connect());
    }

    /**
     * Loads all bots
     * @returns A promise that resolves upon the bots loading.
     */
    async Load(): Promise<void[]> {
        return this.CallOnBots(bot => bot.Load());
    }

    /**
     * Initiates all the bots; this runs bot.Init() which delegates to bot.Connect() and bot.Load()
     * @returns A promise that resolves upon the bots initiating fully.
     */
    async Init(): Promise<void[]> {
        return this.CallOnBots(bot => bot.Init());
    }

}

export { PixelPlace };