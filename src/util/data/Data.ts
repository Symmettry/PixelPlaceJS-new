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

export interface IImage {
    x: number;
    y: number;
    path: string;
    mode: Modes | Function,
    protect: boolean;
    force: boolean;
}

export interface IAuthData {
    authKey: string;
    authToken: string;
    authId: string;
}

export interface IRGBColor {
    r: number;
    b: number;
    g: number;
}

export interface IStatistics {
    pixels: {
        placing: {
            placed: number,
            attempted: number,
            failed: number,
            first_time: number,
            per_second: number,
            last_pos: number[],
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