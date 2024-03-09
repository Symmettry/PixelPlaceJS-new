import { Modes } from "./Modes";
import { DrawingFunction } from "../drawing/ImageDrawer";

/**
 * Pixel data.
 */
export interface IPixel {
    x: number;
    y: number;
    col: number;
    brush: number;
    protect: boolean;
    force: boolean;
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
    force: boolean;
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
 * Contains statistics data for pixelplace.
 */
export interface IStatistics {
    /** Statistics related to pixels. */
    pixels: {
        /** Statistics relating to placing pixels. */
        placing: {
            placed: number, /** Number of pixels successfully placed. */
            attempted: number, /** Number of pixel placement attempts. */
            failed: number, /** Number of failed pixel placement attempts. */
            first_time: number, /** Timestamp of the first pixel placement. */
            per_second: number, /** Average pixels placed per second. */
            last_pos: number[], /** Last pixel placement position. */
        },
        /** Statistics related to pixel protection. */
        protection: {
            protected: number, /** Number of pixels protected. */
            repaired: number, /** Number of pixels repaired. */
            last_repair: number, /** Timestamp of the last pixel repair. */
        },
        /** Statistics related to colors used. */
        colors: {
            [color: number]: number, /** Object mapping color codes to pixel counts. */
        },
    },
    /** Statistics related to images. */
    images: {
        drawing: number, /** Number of images being drawn. */
        finished: number, /** Number of finished images. */
    },
    /** Statistics related to the session. */
    session: {
        time: number, /** Total session time. */
        errors: number, /** Number of errors during the session. */
        beginTime: number, /** Timestamp of session start. */
    },
    /** Statistics related to the socket. */
    socket: {
        sent: number, /** Number of messages sent over the socket. */
        received: number, /** Number of messages received over the socket. */
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