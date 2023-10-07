export interface IPixel {
    x: number;
    y: number;
    col: number;
    brush: number;
    protect: boolean;
    force: boolean;
}
export interface IStatistics {
    pixels: {
        placing: {
            placed: number,
            attempted: number,
            failed: number,
            protected: number,
            per_second: number,
        },
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
    },
}

export function defaultStatistics(): IStatistics {
    return {
        pixels: {
            placing: {
                placed: 0,
                attempted: 0,
                failed: 0,
                protected: 0,
                per_second: 0,
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
        }
    }
}