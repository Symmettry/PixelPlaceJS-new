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
        placed: number,
        protected: number,
        per_second: number,
    },
    images: {
        drawing: number,
        finished: number,
    },
    session: {
        time: number,
    }
}

export function defaultStatistics(): IStatistics {
    return {
        pixels: {
            placed: 0,
            protected: 0,
            per_second: 0,
        },
        images: {
            drawing: 0,
            finished: 0,
        },
        session: {
            time: 0,
        }
    }
}