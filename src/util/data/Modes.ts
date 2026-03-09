import { ImagePixels } from "../drawing/ImageDrawer";
import { Pixel, PixelSetData } from "./Data";

export type DrawHook = (x: number, y: number) => Promise<void>;
export type HypotFunction = (dx: number, dy: number) => number;

export type Coord = [number, number];

// A BaseMode generates coordinates from pixels
export type BaseMode = (pixels: PixelSetData) => Coord[];

// ModeConfig transforms the coordinate order, optionally using hypot or pixel data
export type ModeConfig = (coords: Coord[], pixels: PixelSetData, hypot: HypotFunction, base: BaseMode) => Coord[];

export type DrawingFunction = (pixels: PixelSetData, draw: DrawHook, hypot: HypotFunction) => Promise<void>;

// The composable drawing function
export class Modes {

    private constructor() {}

    static of(base: BaseMode, configs: readonly ModeConfig[] = []): DrawingFunction {
        return async (pixels, draw, hypot) => {
            let coords = base(pixels);
            for (const config of configs) {
                coords = config(coords, pixels, hypot, base);
            }
            for (const [x, y] of coords) {
                await draw(x, y);
            }
        };
    }
}

// -------------------- Base Traversals -------------------- //

export const BaseModes = {
    /**
     * Traverses the image row by row, top to bottom, left to right.
     * Can be used with ModeConfigs.REVERSE and ModeConfigs.REVERSE_ROWS to get other results
     */
    ROWS: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++)
                coords.push([x, y]);
        return coords;
    },

    /**
     * Traverses the image column by column, left to right, top to bottom.
     */
    COLUMNS: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        for (let x = 0; x < pixels.width; x++)
            for (let y = 0; y < pixels.height; y++)
                coords.push([x, y]);
        return coords;
    },

    /**
     * Traverses diagonally from the top-left corner.
     */
    DIAGONAL_TL: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const max = pixels.width + pixels.height - 1;
        for (let d = 0; d < max; d++)
            for (let y = 0; y <= d; y++) {
                const x = d - y;
                if (x < pixels.width && y < pixels.height)
                    coords.push([x, y]);
            }
        return coords;
    },

    /**
     * Traverses diagonally from the top-right corner.
     */
    DIAGONAL_TR: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const max = pixels.width + pixels.height - 1;
        for (let d = 0; d < max; d++)
            for (let y = 0; y <= d; y++) {
                const x = pixels.width - 1 - (d - y);
                if (x >= 0 && y < pixels.height)
                    coords.push([x, y]);
            }
        return coords;
    },

    /**
     * Traverses pixels in a random order.
     * Has some special compatibilities with ModeConfigs
     */
    RANDOM: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++)
                coords.push([x, y]);

        for (let i = coords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coords[i], coords[j]] = [coords[j], coords[i]];
        }

        return coords;
    },

    /**
     * Traverses in a spiral pattern from the center of the image outward.
     */
    CENTER_SPIRAL: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const cx = (pixels.width / 2) | 0;
        const cy = (pixels.height / 2) | 0;

        let x = cx, y = cy;
        let dx = 1, dy = 0;
        let segment = 1, step = 0, changes = 0;
        const total = pixels.width * pixels.height;

        for (let i = 0; i < total; i++) {
            if (x >= 0 && x < pixels.width && y >= 0 && y < pixels.height)
                coords.push([x, y]);

            x += dx;
            y += dy;
            step++;

            if (step === segment) {
                step = 0;
                const t = dx;
                dx = -dy;
                dy = t;
                changes++;
                if ((changes & 1) === 0) segment++;
            }
        }

        return coords;
    },

    /**
     * Traverses the image in concentric square rings from the center.
     */
    SQUARE_RINGS: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const cx = (pixels.width / 2) | 0;
        const cy = (pixels.height / 2) | 0;
        const max = Math.max(cx, cy);

        for (let r = 0; r <= max; r++) {
            for (let x = cx - r; x <= cx + r; x++) {
                const y1 = cy - r, y2 = cy + r;
                if (x >= 0 && x < pixels.width && y1 >= 0) coords.push([x, y1]);
                if (x >= 0 && x < pixels.width && y2 < pixels.height) coords.push([x, y2]);
            }
            for (let y = cy - r + 1; y <= cy + r - 1; y++) {
                const x1 = cx - r, x2 = cx + r;
                if (x1 >= 0 && y >= 0 && y < pixels.height) coords.push([x1, y]);
                if (x2 < pixels.width && y >= 0 && y < pixels.height) coords.push([x2, y]);
            }
        }

        return coords;
    },
} as const;

// -------------------- Config Modifiers -------------------- //

export const ModeConfigs = {
    /**
     * Reverses the order of all coordinates.
     * Incompatible with: none.
     */
    REVERSE: (coords: Coord[]): Coord[] => coords.slice().reverse(),

    /**
     * Separates pixels into a checkered pattern.
     * Incompatible with: none.
     */
    CHECKERED: (coords: Coord[]): Coord[] => {
        const first: Coord[] = [];
        const second: Coord[] = [];
        for (const [x, y] of coords)
            if ((x + y) & 1) second.push([x, y]);
            else first.push([x, y]);
        return [...first, ...second];
    },

    /**
     * Reverses every other row (snake pattern).
     * Incompatible with: REVERSE_ROWS may produce unexpected results.
     */
    SNAKE: (coords: Coord[], pixels: PixelSetData): Coord[] => {
        const rows: Coord[][] = Array.from({ length: pixels.height }, () => []);
        for (const c of coords) rows[c[1]].push(c);
        const result: Coord[] = [];
        for (let y = 0; y < rows.length; y++)
            result.push(...((y & 1) === 0 ? rows[y] : rows[y].reverse()));
        return result;
    },

    /**
     * Sorts pixels clockwise around the center.
     * Incompatible with: CENTRAL_SORT.
     */
    ANGLE_CW: (coords: Coord[], pixels: PixelSetData): Coord[] => {
        const cx = pixels.width / 2;
        const cy = pixels.height / 2;
        return coords
            .map(c => ({ c, a: Math.atan2(c[1] - cy, c[0] - cx) }))
            .sort((a, b) => a.a - b.a)
            .map(v => v.c);
    },

    /**
     * Sorts pixels counter-clockwise around the center.
     * Incompatible with: CENTRAL_SORT.
     */
    ANGLE_CCW: (coords: Coord[], pixels: PixelSetData): Coord[] => {
        const cx = pixels.width / 2;
        const cy = pixels.height / 2;
        return coords
            .map(c => ({ c, a: Math.atan2(c[1] - cy, c[0] - cx) }))
            .sort((a, b) => b.a - a.a)
            .map(v => v.c);
    },

    /**
     * Sorts pixels by distance from the center (closest first).
     * Incompatible with: ANGLE_CW, ANGLE_CCW.
     */
    CENTRAL_SORT: ((() => {
        const fn: any = (coords: Coord[], pixels: PixelSetData, hypot: HypotFunction, base: BaseMode): Coord[] => {
            const cx = fn.cx ?? Math.floor(pixels.width / 2);
            const cy = fn.cy ?? Math.floor(pixels.height / 2);

            const nhypot =
                base === BaseModes.RANDOM
                    ? (a: number, b: number) => hypot(a, b) + Math.floor(Math.random() * 5) - 3
                    : hypot;

            return coords
                .map(c => ({ c, d: nhypot(c[0] - cx, c[1] - cy) }))
                .sort((a, b) => a.d - b.d)
                .map(v => v.c);
        };

        fn.cx = undefined;
        fn.cy = undefined;

        fn.center = (x: number, y: number) => {
            fn.cx = x;
            fn.cy = y;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),

    /**
     * Sorts pixels by diamond distance from the center.
     * Incompatible with: none.
     */
    DIAMOND_SORT: (coords: Coord[], pixels: PixelSetData): Coord[] => {
        const cx = Math.floor(pixels.width / 2);
        const cy = Math.floor(pixels.height / 2);
        return coords
            .map(c => ({ c, d: Math.abs(c[0] - cx) + Math.abs(c[1] - cy) }))
            .sort((a, b) => a.d - b.d)
            .map(v => v.c);
    },

    /**
     * Reverses each row independently.
     * Incompatible with: SNAKE may produce unexpected results.
     */
    REVERSE_ROWS: (coords: Coord[], pixels: PixelSetData) => {
        const rows: Coord[][] = Array.from({ length: pixels.height }, () => []);
        for (const [x, y] of coords) rows[y].push([x, y]);
        const result: Coord[] = [];
        for (const row of rows) result.push(...row.reverse()); 
        return result;
    },

    OFFSET: ((() => {
        const fn = (coords: Coord[]): Coord[] => {
            const n = coords.length;
            if (n === 0) return coords.slice();

            let realOffset = 0;

            if (fn.offpercent && fn.offpercent > 0) {
                realOffset = Math.floor((n * fn.offpercent) / 100);
            } else if (fn.offset) {
                realOffset = ((fn.offset % n) + n) % n; // normalize negative/overflow
            }

            if (realOffset === 0) return coords.slice();

            return coords.slice(realOffset).concat(coords.slice(0, realOffset));
        };

        fn.offset = 0;
        fn.offpercent = 0;

        fn.percent = (p: number) => {
            if (p < 0 || p > 100) throw new Error("percent must be 0-100");
            fn.offpercent = p;
            return fn;
        };

        fn.amount = (amt: number) => {
            fn.offset = amt;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),  
} as const;