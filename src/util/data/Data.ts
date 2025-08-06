import { Modes } from "./Modes";
import { DrawingFunction } from "../drawing/ImageDrawer";
import { Color } from "./Color";

/**
 * Pixel data.
 */
export interface IPixel {
    x: number;
    y: number;
    col: Color;
    brush?: number;
    protect?: boolean;
    wars?: boolean;
    force?: boolean;
}

export interface IUnverifiedPixel {
    data: IPixel;
    originalColor: number;
}
export interface IQueuedPixel {
    data: IPixel;
    speed: number;
    resolve: (value: void | PromiseLike<void>) => void;
}

/**
 * Image data.
 */
export interface IImage {
    x: number;
    y: number;
    path: string;
    mode: Modes | DrawingFunction,
    protect: boolean;
    transparent: boolean;
    wars: boolean;
    force: boolean;
}

/**
 * Represents image data consisting of width, height, and pixel colors.
 * @property width - The width of the image.
 * @property height - The height of the image.
 * @property pixels - The two-dimensional array of pixel colors. Read with data.pixels[x][y]
 */
export type ImageData = {
    width: number,
    height: number,
    pixels: Color[][],
}

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
}

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