import { Modes } from "../drawing/Modes";

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
export interface IAuthData {
    authKey: string;
    authToken: string;
    authId: string;
}
export interface IImage {
    x: number;
    y: number;
    path: string;
    mode: Modes,
    protect: boolean;
    force: boolean;
}

export interface IStatistics {
    pixels: {
        placing: {
            placed: number,
            attempted: number,
            failed: number,
            per_second: number,
        },
        protection: {
            protected: number,
            repaired: number,
            last_repair: number,
        }
        colors: {
            [color: number]: number,
        }
    },
    images: {
        drawing: number,
        finished: number,
    },
    session: {
        time: number,
        errors: number,
        beginTime: number,
    },
    socket: {
        sent: number,
        received: number,
    }
}

export function defaultStatistics(): IStatistics {
    return {
        pixels: {
            placing: {
                placed: 0,
                attempted: 0,
                failed: 0,
                per_second: 0,
            },
            protection: {
                protected: 0,
                repaired: 0,
                last_repair: 0,
            },
            colors: { },
        },
        images: {
            drawing: 0,
            finished: 0,
        },
        session: {
            time: 0,
            errors: 0,
            beginTime: 0,
        },
        socket: {
            sent: 0,
            received: 0,
        },
    }
}