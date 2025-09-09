import { ImagePixels } from "../drawing/ImageDrawer";
import { Color } from "./Color";

export type RawFlags = {
    /** Brush to use */
    brush?: number;
    /** Protect pixels */
    protect?: boolean;
    /** If the bot should replace a pixel if it's already protected; defaults to true */
    replaceProtection?: boolean;
    /** Place in wars */
    wars?: boolean;
    /** Force pixel placement even if it's the same color */
    force?: boolean;
    /** Queue input side */
    side?: QueueSide;
    /**
     * If it should respond with a Promise<void> of when it completes
     * 
     * This is useful to set with images/rects/etc. if you want to sort or use queue after without waiting.
     * 
     * Place results when using async will be predicted because it's given immediately
     * 
     * Defaults to true.
     * */
    async?: boolean;
};
export type PixelFlags = RawFlags | { ref: PixelFlags; }

/**
 * Pixel data.
 */
export type Pixel = {
    x: number;
    y: number;
    col: Color;
} & PixelFlags;

export type PlainPixel = Pixel & RawFlags;

export interface IUnverifiedPixel {
    data: Pixel;
    originalColor: number;
}
export interface IQueuedPixel {
    data: PlainPixel;
    speed: number;
    resolve: ((value: PlaceResults) => void | Promise<void>) | null;
}

export type PlaceResults = {
    pixel: Pixel;
    oldColor: Color | null;
} | null;

/** Canvas templates */
export enum BoardTemplate {
    BLANK = 0,
    PIXEL_WORLD_WAR = 1,
    WORLD_WAR_NO_BORDERS = 2,
    USA = 3,
    MEXICO = 4,
    CHINA = 5,
    RUSSIA = 6,
}

/**
 * Represents image data consisting of width, height, and pixel colors.
 * @property width - The width of the image.
 * @property height - The height of the image.
 * @property pixels - The two-dimensional array of pixel colors. Read with data.pixels[x][y]
 */
export type PixelSetData = {
    width: number,
    height: number,
    pixels: ImagePixels,
}

export type CoordSet<T> = { [x: number]: { [y: number]: T } };

export type AuctionData = {
    id: number;
    owner_id: number;
    owner_username: string;
    under_auction: number;
    painting_id: number;
    author_id: number;
    author_username: string;
    /** Icon[] but joined with , */
    author_icons: string;
    frame_id: number;
    gems_id: number;
    current_bid: number;
    current_bid_user_id: number;
    current_bid_username: number;
    auction_expire_time: EpochTimeStamp;
    bids: number;
    sp: number;
    bg: number;
    burned: number;
    created_at: EpochTimeStamp;
};

/**
 * Contains authentication data for pixelplace.
 */
export interface IAuthData {
    /** The authentication key. */
    authKey: string;
    /** The authentication token. */
    authToken: string;
    /** The authentication ID. */
    authId: string;
    /** If the bot should automatically attempt to refresh data if expired. Defaults to true */
    relog?: boolean;
}

/**
 * Bot parameters
 */
export interface IBotParams {
    /** The auth data for logging in */
    authData: IAuthData;
    /** The board ID to connect to */
    boardID: BoardID;
    /** If the auth data should be relogged. */
    relog?: boolean;
}

export type BoardID = number;

/**
 * Contains r,g,b value
 */
export interface IRGBColor {
    /** Red value */
    r: number;
    /** Green value */
    b: number;
    /** Blue value */
    g: number;
}

/**
 * A war area
 */
export interface IArea {
    /** Name of the area */
    name: string;
    /** 0 = not active, 1 = active */
    state: number;
    /** Guild or user that owns it */
    ownedBy: string;
    /** I have no idea. Possibly the guild of the user who won. */
    ownedByGuild?: string;
    /** Previous owner of the area. This will only exist if a war has occurred since the bot started. */
    previousOwner?: string;
    /** Canvas id of the guild or user that owns it */
    canvas: number;
    /** Unix timestamp that the fight ended at */
    fightEndAt: number;
    /** Time till next fight. It will be 0 if a fight hasn't occurred since the bot started, or 900 if one has. */
    nextFightAt: number;
    /** 0 = guild, 1 = user */
    fightType: number;
    /** Stats for each user / guild in the war. Will be empty if a fight hasn't occurred since the bot started */
    stats: {
        /** Guild name */
        guild: string;
        /** Pixels placed */
        pixels: number;
        /** Amount of users involved */
        users: number;
    }[];
    /** Totals of the war. Will be empty if a war has not occurred since the bot started. */
    total: {
        /** Amount of guilds that participated */
        guilds: number;
        /** Amount of pixels placed */
        pixels: number;
        /** Amount of users that participated */
        users: number;
    };
    /** Positions */ xStart: number;
    /** Positions */ yStart: number;
    /** Positions */ xEnd: number;
    /** Positions */ yEnd: number;
    /** Points earned from war */
    points: number;
    /** Unsure. It's probably if the previous owner & new owner are the same. */
    defended?: boolean;
}

export interface IDebuggerOptions {
    /** Will shrink the pixel packets being received */
    shrinkPixelPacket?: boolean;
    /** Ignores printing send/recieve of pixel packet */
    ignorePixelPacket?: boolean;
    /** Clears console line when logging; useful for some debug stuff. */
    lineClears?: boolean;
};

/**
 * Brush types. Notice that only normal pixeling is actually like fully working. Owicode
 */
export enum BrushTypes {
    NORMAL = 1,
    PROTECT = 2,
    REPLACE = 3,
    FILL = 4,
}

/** Side of the pixel queue to add pixels to */
export enum QueueSide {
    /** Adds them to front, they will be placed asap */
    FRONT,
    /** Adds to the back, they will be placed after all others*/
    BACK,
}

/**
 * Contains statistics data for pixelplace.
 */
export interface IStatistics {
    /** Statistics related to pixels. */
    pixels: {
        /** Statistics relating to placing pixels. */
        placing: {
            /** Number of pixels successfully placed. */
            placed: number
            /** Number of pixel placement attempts. */
            attempted: number,
            /** Number of failed pixel placement attempts. */
            failed: number,
            /** Timestamp of the first pixel placement. */
            first_time: number,
            /** Average pixels placed per second. */
            per_second: number,
            /** Last pixel placement position. */
            last_pos: number[],
            /** Pixel confirm ping */
            ping: number,
        },
        /** Statistics related to pixel protection. */
        protection: {
            /** Number of pixels protected. */
            protected: number,
            /** Number of pixels repaired. */
            repaired: number,
            /** Timestamp of the last pixel repair. */
            last_repair: number,
        },
        /** Object mapping color codes to pixel counts. */
        colors: {
            [color: number]: number,
        },
    },
    /** Statistics related to images. */
    images: {
        /** Number of images being drawn. */
        drawing: number,
        /** Number of finished images. */
        finished: number,
    },
    /** Statistics related to text. */
    text: {
        /** Number of texts being drawn. */
        drawing: number,
        /** Number of finished text. */
        finished: number,
    },
    /** Statistics related to lines. */
    lines: {
        /** Number of lines being drawn. */
        drawing: number,
        /** Number of finished lines. */
        finished: number,
    },
    /** Statistics related to animations. */
    animations: {
        /** Number of animations being played */
        playing: number,
        /** Number of animations finished */
        finished: number,
    },
    /** Statistics related to the session. */
    session: {
        /** Total session time. */
        time: number,
        /** Number of errors during the session. */
        errors: number,
        /** Timestamp of session start. */
        beginTime: number,
    },
    /** Statistics related to the socket. */
    socket: {
        /** Number of messages sent over the socket. */
        sent: number,
        /** Number of messages received over the socket. */
        received: number,
    },
}

export function defaultStatistics(): IStatistics {
    return {
        pixels: {
            placing: {
                placed: 0,
                attempted: 0,
                failed: 0,
                first_time: -1,
                per_second: -1,
                last_pos: [-1, -1],
                ping: -1,
            },
            protection: {
                protected: 0,
                repaired: 0,
                last_repair: -1,
            },
            colors: { },
        },
        images: {
            drawing: 0,
            finished: 0,
        },
        text: {
            drawing: 0,
            finished: 0,
        },
        animations: {
            playing: 0,
            finished: 0,
        },
        lines: {
            drawing: 0,
            finished: 0,
        },
        session: {
            time: -1,
            errors: 0,
            beginTime: -1,
        },
        socket: {
            sent: 0,
            received: 0,
        },
    }
}