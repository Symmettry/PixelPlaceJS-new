import { Bot } from "./bot/Bot";
import { OutgoingHttpHeaders } from "http2";
import { IBotParams } from "./util/data/Data";

export type HeaderTypes = "canvas-image" | "get-painting" | "socket" | "relog" | "get-user";

export type HeadersFunc = (type: HeaderTypes, boardId: number) => OutgoingHttpHeaders;

/**
 * Contains all bots and handles them.
 */
class PixelPlace {

    bots: Bot[];

    /**
     * Creates a new pixelplace instance and makes bots with all auth data
     * @param params A list of bot parameters.
     * @param autoRestart If the bots should automatically restart when closed.
     * @param handleErrors If the bots should handle errors when received. Invalid auth id is always processed regardless of this value.
     */
    constructor(params: IBotParams[], autoRestart: boolean = true, handleErrors: boolean = true) {
        this.bots = params.map(p => new Bot(p, autoRestart, handleErrors));
    }

    /**
     * In the event that cloudflare is turned on or something, you can do stuff like put cloudflare clearance here.
     * @param headers A function that receives the type and returns header object.
     * @returns this
     */
    setHeaders(headers: HeadersFunc): PixelPlace {
        this.bots.forEach(bot => bot.setHeaders(headers));
        return this;
    }

    /**
     * Sets the headers of the bot to a pre-made one, but changed based on your cookies.
     * @param cookie 
     */
    setCFClearance(cookie: string): PixelPlace {
        return this.setHeaders((type, boardId) => {
            const h: {[key: string]: string} = {
                "accept-language": "en-US,en;q=0.8",
                "priority": "i",
                "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Brave\";v=\"138\"",
                "sec-ch-ua-arch": "\"x86\"",
                "sec-ch-ua-bitness": "\"64\"",
                "sec-ch-ua-full-version-list": "\"Not)A;Brand\";v=\"8.0.0.0\", \"Chromium\";v=\"138.0.0.0\", \"Brave\";v=\"138.0.0.0\"",
                "sec-ch-ua-mobile": "?0",
                "sec-ch-ua-model": "\"\"",
                "sec-ch-ua-platform": "\"Linux\"",
                "sec-ch-ua-platform-version": "\"6.16.1\"",
                "sec-fetch-site": "same-origin",
                "sec-gpc": "1",
                "cookie": `cf_clearance=${cookie}`,
                "Referer": `https://pixelplace.io/${boardId}`
            };
            switch(type) {
                case "socket":
                    h["connection"]    = "Upgrade";
                    break;
                 case "canvas-image":
                    h['accept']        = "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8";
                    h['sec-fetch-dest'] = 'image';
                    h['sec-fetch-mode'] = 'no-cors';
                    break;
                case "get-painting":
                case "get-user":
                case 'relog':
                    h['sec-fetch-dest'] = 'empty';
                    h['sec-fetch-mode'] = 'cors';
                    h['x-requested-with'] = 'XMLHttpRequest';
                    h['accept']        = "application/json, text/javascript, */*; q=0.01";
                    h['priority']  = 'u=1, i';
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