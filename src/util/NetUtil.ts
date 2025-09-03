import { IncomingMessage, OutgoingHttpHeaders } from "http";
import { Bot } from "../bot/Bot";
import { HeadersFunc } from "../PixelPlace";
import { Color } from "./data/Color";
import { AuctionData, BoardID, BoardTemplate, Icon } from "./data/Data";
import https from 'https';
import { v5 } from "uuid";
import { UUID } from "crypto";

/** YYYY-MM-DD HH:MM:SS */
type CreationDate = `${number}-${number}-${number} ${number}:${number}:${number}`;

/**
 * Painting data. There's a lot. I didn't bother JSDoc'ing some.
 */
export type PaintingData = {
    /** If a lottery is occurring */
    lottery: boolean;

    /** Host data */
    host: {
        /** HTTP Url of site */
        http: "https://pixelplace.io/";
        /** Websocket url of site */
        wss: "pixelplace.io";
    }

    /** Painting data */
    painting: {
        /** Id of the painting */
        id: number;
        /** Some type thing; idk what it is */
        type: number;
        /** Time for auto accept to draw on painting */
        autoAcceptTime: number;
        /** Twitch integration data */
        twitch: {
            /** Twitch name, will be blank if not integrated */
            name: string;
            /** If twitch integration is enabled */
            integration: boolean;
        }
        /** Guild integration data */
        guild: {
            /** Guild name, will be blank if not integrated */
            name: string;
            /** If guild integration is enabled */
            integration: boolean;
        }
        /** Name of the painting */
        name: string;
        /** Url name of the painting; e.g turns "Pixels World War" to "pixels-world-war" */
        slug: string;
        /** Width of the painting */
        width: number;
        /** Height of the painting */
        height: number;
        /** Background color of the painting */
        background: number;
        /** Cooldown on the painting */
        cooldown: number;
        /** Palette. I assume this is for custom color palettes */
        pallete: Color[];
        /** If it's a guild emblem painting */
        isEmblem: boolean;
        /** If it's an avatar painting */
        isAvatar: boolean;
        /** Owner data of the painting */
        owner: {
            /** User id of the owner */
            id: number;
            /** Name of the owner */
            name: string;
        }
        /** Moderators */
        moderators: {
            /** Id of the moderator */
            id: number;
            /** Name of the moderator */
            name: number;
            /** Permissions of the moderator */
            permissions: {
                /** Access to mod tools */
                tools: boolean;
                /** Access to ban */
                ban: boolean;
            }
        }[];
        /** Creation date in format YYYY-MM-DD HH:MM:SS */
        createdAt: CreationDate;
        /** If protection is enabled */
        protection: boolean;
        /** If shop items are enabled */
        shopItems: boolean;
        /** If discord is required to apply */
        discordRequired: boolean;
        /** The rate of the canvas in pixels / second */
        rate: number;
        /** The template used */
        template: BoardTemplate;
        /** The amount of pixels placed on it */
        pixels: number;
        /** If dot detection is enabled */
        dotDetection: boolean;
        /** Brush info */
        brush: {
            /** Size of the brush */
            size: number;
        }
        /** Current status */
        status: number;
        /** If it's nsfw. Idk why this is 0,1 instead of false,true */
        nsfw: 0 | 1;
    }

    /** User data */
    user: {
        /** Your user id, or 0 if connected=false */
        id: number;
        /** Connected status */
        connected: boolean;
        /** Your name or "Guest" if not connected */
        name: string;
        /** Your auth key */
        key: string;
        /** Your guild */
        guild: string;
        /** Guild members. Doesn't work btw. */
        guildMembers: [];
        /** Your pp coins !! */
        ppcoins: number;
        /** Premium status */
        premium: {
            /** If it's active */
            active: boolean;
            /** When it expires */
            expire_at: EpochTimeStamp;
        }
        /** If you are staff */
        isStaff: boolean;
        /** If you're a chat mod */
        isChatMod: boolean;
        /** idfk */
        spinned: boolean;
        /** Your icons */
        icons: Icon[];
        /** Social connection data */
        social: {
            discord: {
                linked: boolean;
                name: string;
            }
            reddit: {
                linked: boolean;
                name: string;
            }
            twitch: {
                linked: boolean;
                name: string;
            }
            youtube: {
                linked: boolean;
                name: string;
            }
        }
        /** OMG unimplemented friends??? */
        friends: null;
        /** This is also null.. probably idk */
        blocked: null;
        /** If you have an email connected */
        hasEmail: boolean;
        /** Rainbow username time, prob expiration date */
        rainbowTime: EpochTimeStamp;
        /** XMAS username time, prob expiration date */
        xmasTime: EpochTimeStamp;
        /** Halloween username time, prob expiration date */
        halloweenTime: EpochTimeStamp;
        /** Event time? idk */
        event: EpochTimeStamp;
        /** Settings */
        settings: {
            displaySocial: boolean;
            painting: {
                isOwner: boolean;
                liveTracking: boolean;
                bot: boolean;
                saveTracking: boolean;
                gridDisplay: boolean;
                lockPainting: boolean;
                protectionFlashing: boolean;
                zoomDisplay: boolean;
                listMaxPaintings: number;
            }
            chat: {
                invisible: boolean;
                timestamps: boolean;
                notifications: boolean;
                guildTags: boolean;
                friendsNotifications: boolean;
                messagesLimit: number;
            }
        }
        /** People you follow who are active accounts */
        activefriends: string[];
        /** People you have blocked who are active accounts */
        activeblocked: string[];
        /** Fav paintings? idfk */
        fav: number;
        /** Forum notification amount */
        forum_notif: number;
    }
    /** The version of the current update */
    update_version: number;
    /** News!! */
    news: {
        id: string;
        date: string;
        title: string;
        description: string;
    }
    /** Shop data */
    shop: {
        itemsOrder: [ 1, 2, 3, 6, 9, 11, 4, 5, 10, 12, 13 ];
        items: {
            1: {
                name: "Pixel Missile";
                description: "Fire this missile on a painting to spread your selected color";
                radius: 35;
                price: 90;
                stock: 1000;
                color: "#1EFF00";
                type: 1;
                display: 1
            };
            2: {
                name: "Pixel Bomb";
                description: "Drop this bomb on a painting to spread your selected color";
                radius: 75;
                price: 145;
                stock: 1000;
                color: "#0070FF";
                type: 1;
                display: 1
            };
            3: {
                name: "Atomic Bomb";
                description: "Drop this Atomic bomb on a painting to spread your selected color";
                radius: 125;
                price: 340;
                stock: 1000;
                color: "#a335ee";
                type: 1;
                display: 1
            };
            7: {
                name: "Guild Bomb";
                description: "Drop your guild emblem on a painting! You don't need to be the guild leader to use it. Click on your guild profile to edit emblem";
                cd: 0;
                radius: 32;
                price: 190;
                stock: 1000;
                color: "#0070FF";
                type: 1;
                display: 0
            };
            6: {
                name: "Rainbow Username";
                description: "Rainbow animation on your username in the chat and on your profile (duration: 1 week)";
                cd: 0;
                radius: 0;
                price: 160;
                stock: 1000;
                color: "#1EFF00";
                type: 3;
                display: 1
            };
            4: {
                name: "1 month - Premium";
                description: "Get a 1 month premium membership for you or a friend";
                cd: 0;
                radius: 0;
                price: 1350;
                stock: 1000;
                color: "#ff8000";
                type: 2;
                display: 1
            };
            5: {
                name: "1 year - Premium";
                description: "Get a 1 year premium membership for you or a friend";
                cd: 0;
                radius: 0;
                price: 15000;
                stock: 1000;
                color: "#E6CC80";
                type: 2;
                display: 1
            };
            8: {
                name: "Avatar Bomb";
                description: "Drop your profile avatar on a painting! Click on your profile to edit your avatar";
                cd: 0;
                radius: 32;
                price: 190;
                stock: 1000;
                color: "#0070FF";
                type: 1;
                display: 0
            };
            9: {
                name: "Name Change";
                description: "Maybe you have become a little too famous, or maybe you just thought of something better. Either way, you can change your username! (Your previous username will still be displayed on your profile for the next 7 days)";
                cd: 0;
                radius: 0;
                price: 540;
                stock: 1000;
                color: "#1EFF00";
                type: 4;
                display: 1
            };
            10: {
                name: "XMAS Username";
                description: "For a limited time, you can buy this XMAS animation for your username in the chat and on your profile (duration after use: 1 week) + 20 snowballs";
                cd: 0;
                radius: 0;
                price: 150;
                stock: 1000;
                color: "#1EFF00";
                type: 3;
                display: 1
            };
            11: {
                name: "3 days - Premium";
                description: "Get a 3 days premium membership for you or a friend";
                cd: 0;
                radius: 0;
                price: 255;
                stock: 1000;
                color: "#8a69f5";
                type: 2;
                display: 1
            };
            12: {
                name: "HALLOWEEN Username";
                description: "For a limited time, you can buy this HALLOWEEN animation for your username in the chat and an alternate fire animation on your profile (duration after use: 1 week). Note: Username in chat will use your selected color. Limited supply, Price increase by 66 at every restock";
                cd: 0;
                radius: 0;
                price: 198;
                stock: 1000;
                color: "#ff9a00";
                type: 3;
                display: 0
            };
            13: {
                name: "Treasure Chest";
                description: "Get a variety of ores and gemstones to be used for frame crafting. In each chest you also have a chance to get items from the shop, even seasonal ones!";
                cd: 0;
                radius: 0;
                price: 1;
                stock: 1000;
                color: "#ffbe00";
                type: 5;
                display: 1
            }
        }
    }
}

/**
 * User data. These are self-explanatory.
 */
export type UserData = {
    pixelite_ores: number;
    background_id: BoardID;
    gold_mine_level: number;
    gold_dynamite_level: number;
    gold_ores: number;
    copper_ores: number;
    iron_ores: number;
    pyrite_ores: number;
    emerald_stones: number;
    sapphire_stones: number;
    ruby_stones: number;
    /** 0 for no golden. 1 for golden. */
    golden: 0 | 1;
    gold_bars: number;
    battlePoints: number;
    guild_rank: 0 | 1 | 2 | 3;
    username: string;
    settings: string;
    followers: number;
    bio: string;
    createdAt: string;
    lastLogin: string;
    halloweenTime: number;
    xmasTime: number;
    rainbowTime: number;
    lastAction: number;
    pixels: number;
    pixelPerSeconds: string;
    admin: 0 | 1;
    mod: 0 | 1;
    chatmod: 0 | 1;
    guild: string;
    vip: 0 | 1;
    premiumIcon: string;
    othersIcons: string[] | null;
    status: 0 | 1 | 2;
    canvas: BoardID;
    previousUsername: string | null;
    previousUsernameTime: number;
    banReason: string | null;
    /** This is [] if nothing.. but an object of... array indexes... to social... what the fuck is this shit */
    social: [] | {[key: string] : string};
    framed: AuctionData[];
    guild_rank_1_title: string;
    guild_rank_2_title: string;
    guild_rank_3_title: string;
};

const NAMESPACE = "pixelplacejs-new";

export class NetUtil {
    private static extCache: {[key: string]: any} = {};

    private paintingCache: {[key: string]: PaintingData} = {};
    private userCache: {[key: string]: UserData} = {};

    private bot: Bot;

    headers: HeadersFunc;

    constructor(bot: Bot, headersFunc: HeadersFunc) {
        this.headers = headersFunc;
        this.bot = bot;
    }

    private async notOkay(data: Response): Promise<null> {
        const text = await data.text();
        if(text.includes("Just a moment...")) {
            throw new Error("Cloudflare authentication is invalid! pp#setCFClearance('cookie')");
        }
        throw new Error("Invalid user data received!!\n" + text);
    }

    /**
     * Gets painting data
     * @param canvasId The canvas to get painting data of
     * @param reload If it should reload or return the cached value when called again. Defaults to false.
     * @param connected Connected or not. Not too useful. Defaults to true.
     */
    async getPaintingData(canvasId: number, reload: boolean=false, connected: boolean=true): Promise<PaintingData | null> {
        if(this.paintingCache[canvasId] && !reload) return this.paintingCache[canvasId];

        const data = await fetch("https://pixelplace.io/api/get-painting.php?id=" + canvasId + "&connected=" + (connected ? 1 : 0), {
            "headers": this.headers("get-painting", this.bot.boardId) as HeadersInit,
            "body": null,
            "method": "GET",
        });
        if(!data.ok) {
            return this.notOkay(data);
        }

        return (await data.json()) as PaintingData;
    }

    /**
     * Gets user data
     * @param name Name of the user
     * @param reload If it should reload or return the cached value when called again. Defaults to false
     */
    async getUserData(name: string, reload: boolean=false): Promise<UserData | null> {
        name = name.toLowerCase();
        if(this.userCache[name] && !reload) return this.userCache[name];

        const data = await fetch("https://pixelplace.io/api/get-user.php?username=" + name, {
            "headers": this.headers("get-user", this.bot.boardId) as HeadersInit,
            "body": null,
            "method": "GET",
        });
        if(!data.ok) {
            return this.notOkay(data);
        }

        return (await data.json()) as UserData;
    }
    
    /**
     * Creates a unique player id based on a user's name.
     * 
     * This utilizes the creation date of the account, which is unique for all players, and converts it into a UUID
     * 
     * This is deterministic, and the same name will always give the same UUID regardless of session.
     */
    async getUniquePlayerId(name: string): Promise<UUID> {
        const data: UserData | null = await this.getUserData(name);
        if(data == null) throw `User data is null for user: ${name}`;

        return v5(data.createdAt, NAMESPACE) as UUID;
    }

    static async getUrl(url: string, headers: OutgoingHttpHeaders) {
        if(this.extCache[url]) return this.extCache[url];
        return new Promise<Buffer>((resolve, reject) => {
            https.get(url, { headers }, (response: IncomingMessage) => {
                const chunks: Buffer[] = [];
                response.on('data', (chunk: Buffer) => { chunks.push(chunk); });
                response.on('end', () => { resolve(this.extCache[url] = Buffer.concat(chunks)); });
                response.on('error', (error: Error) => { reject(error); });
            });
        });
    }

    /**
     * Gets the url to a canvas image png;
     * 
     * This will automatically convert canvas 0 to blank.png as done in pixelplace normally.
     * 
     * This will also add Date.now() for caching
     */
    static getCanvasUrl(canvasId: number): string {
        return canvasId == 0 ? `https://pixelplace.io/img/blank.png` : `https://pixelplace.io/canvas/${canvasId}.png?t=${Math.floor(Date.now() / 1000)}`
    }

}