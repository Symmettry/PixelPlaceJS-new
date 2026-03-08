import { ImagePixels } from "../drawing/ImageDrawer";
import { Color } from "./Color";
import { CoordSet, Pixel, PixelSetData } from "./Data";

export type DrawHook = (x: number, y: number) => Promise<void>;
export type HypotFunction = (dx: number, dy: number) => number;

/**
 * Represents a function that will take the pixels and call draw() in the order it draws. This is used for images and for sorting queue.
 * @param pixels - The pixel array to draw
 * @param draw - A function that marks the drawing of that x,y at that time
 * @param hypot - Optional, uses performant hypot when drawn that way.
 * @returns A promise which resolves when the image is done drawing.
 */
export type DrawingFunction = (
    pixels: PixelSetData,
    draw: DrawHook,
    hypot: HypotFunction,
) => Promise<void>;

export type DrawingMode = Modes | DrawingFunction;
/**
 * Image drawing modes. The x,y coordinates are still top left regardless of the mode.
 */
export enum Modes {

    /** Starts from the top left and goes right then down. */
    TOP_LEFT_TO_RIGHT = 0,

    /** Starts from the top right and goes left then down. */
    TOP_RIGHT_TO_LEFT = 1,

    /** Starts from the bottom left and goes right then up. */
    BOTTOM_LEFT_TO_RIGHT = 2,

    /** Starts from the bottom right and goes left then up. */
    BOTTOM_RIGHT_TO_LEFT = 3,

    /** Starts from the top left then goes down then right. */
    LEFT_TOP_TO_BOTTOM = 4,

    /** Starts from the bottom left then goes up then right. */
    LEFT_BOTTOM_TO_TOP = 5,

    /** Starts from the top right then goes down then left. */
    RIGHT_TOP_TO_BOTTOM = 6,

    /** Starts from the bottom right then goes up then left. */
    RIGHT_BOTTOM_TO_TOP = 7,

    /** Draws from the center outward in a circular distance order. */
    FROM_CENTER = 8,

    /** Draws from the outside inward toward the center in circular distance order. */
    TO_CENTER = 9,

    /** Draws from the center outward using a diamond distance metric. */
    FROM_DIAMOND = 10,

    /** Draws from the outside inward using a diamond distance metric. */
    TO_DIAMOND = 11,

    /** Checkerboard pattern starting with the first tile. */
    CHECKERED = 12,

    /** Checkerboard pattern starting with the opposite tile. */
    CHECKERED_OFF = 13,

    /** Randomized pixel order using a shuffle. */
    RAND = 14,

    /** Alternates horizontal direction every row. */
    SNAKE_HORIZONTAL = 15,

    /** Alternates vertical direction every column. */
    SNAKE_VERTICAL = 16,

    /** Draws along diagonals starting from the top-left corner. */
    DIAGONAL_TOP_LEFT = 17,

    /** Draws along diagonals starting from the top-right corner. */
    DIAGONAL_TOP_RIGHT = 18,

    /** Expands outward from the center in square rings. */
    SQUARE_RINGS_OUT = 19,

    /** Contracts inward toward the center in square rings. */
    SQUARE_RINGS_IN = 20,

    /** Draws the outer frame first and collapses inward. */
    EDGES_TO_CENTER = 21,

    /** Starts at the center and expands outward frame by frame. */
    CENTER_TO_EDGES = 22,

    /** Spiral starting at the center moving outward. */
    CENTER_SPIRAL_OUT = 23,

    /** Spiral starting at the edges moving inward. */
    CENTER_SPIRAL_IN = 24,

    /** Rotational sweep clockwise around the center. */
    ANGLE_SWEEP_CW = 25,

    /** Rotational sweep counter-clockwise around the center. */
    ANGLE_SWEEP_CCW = 26,
}

export const drawingStrategies: { [key in Modes]: DrawingFunction } = {

    [Modes.TOP_LEFT_TO_RIGHT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++)
                await draw(x, y);
    },

    [Modes.TOP_RIGHT_TO_LEFT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = 0; y < pixels.height; y++)
            for (let x = pixels.width - 1; x >= 0; x--)
                await draw(x, y);
    },

    [Modes.BOTTOM_LEFT_TO_RIGHT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = pixels.height - 1; y >= 0; y--)
            for (let x = 0; x < pixels.width; x++)
                await draw(x, y);
    },

    [Modes.BOTTOM_RIGHT_TO_LEFT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = pixels.height - 1; y >= 0; y--)
            for (let x = pixels.width - 1; x >= 0; x--)
                await draw(x, y);
    },

    [Modes.LEFT_TOP_TO_BOTTOM]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = 0; x < pixels.width; x++)
            for (let y = 0; y < pixels.height; y++)
                await draw(x, y);
    },

    [Modes.LEFT_BOTTOM_TO_TOP]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = 0; x < pixels.width; x++)
            for (let y = pixels.height - 1; y >= 0; y--)
                await draw(x, y);
    },

    [Modes.RIGHT_TOP_TO_BOTTOM]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = pixels.width - 1; x >= 0; x--)
            for (let y = 0; y < pixels.height; y++)
                await draw(x, y);
    },

    [Modes.RIGHT_BOTTOM_TO_TOP]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = pixels.width - 1; x >= 0; x--)
            for (let y = pixels.height - 1; y >= 0; y--)
                await draw(x, y);
    },

    [Modes.CHECKERED]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let pass = 0; pass < 2; pass++)
            for (let y = 0; y < pixels.height; y++)
                for (let x = 0; x < pixels.width; x++)
                    if (((x + y) & 1) === pass)
                        await draw(x, y);
    },

    [Modes.CHECKERED_OFF]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let pass = 0; pass < 2; pass++)
            for (let y = 0; y < pixels.height; y++)
                for (let x = 0; x < pixels.width; x++)
                    if (((x + y) & 1) !== pass)
                        await draw(x, y);
    },

    [Modes.RAND]: async (pixels: PixelSetData, draw: DrawHook) => {
        const total = pixels.width * pixels.height;
        const coords = new Array(total);

        for (let i = 0; i < total; i++)
            coords[i] = i;

        for (let i = total - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coords[i], coords[j]] = [coords[j], coords[i]];
        }

        for (let i = 0; i < total; i++) {
            const x = coords[i] % pixels.width;
            const y = (coords[i] / pixels.width) | 0;
            await draw(x, y);
        }
    },

    [Modes.SNAKE_HORIZONTAL]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = 0; y < pixels.height; y++) {
            if ((y & 1) === 0) {
                for (let x = 0; x < pixels.width; x++)
                    await draw(x, y);
                continue;
            }

            for (let x = pixels.width - 1; x >= 0; x--)
                await draw(x, y);
        }
    },

    [Modes.SNAKE_VERTICAL]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = 0; x < pixels.width; x++) {
            if ((x & 1) === 0) {
                for (let y = 0; y < pixels.height; y++)
                    await draw(x, y);
                continue;
            }

            for (let y = pixels.height - 1; y >= 0; y--)
                await draw(x, y);
        }
    },

    [Modes.DIAGONAL_TOP_LEFT]: async (pixels: PixelSetData, draw: DrawHook) => {
        const max = pixels.width + pixels.height - 1;

        for (let d = 0; d < max; d++)
            for (let y = 0; y <= d; y++) {
                const x = d - y;
                if (x >= pixels.width || y >= pixels.height) continue;
                await draw(x, y);
            }
    },

    [Modes.DIAGONAL_TOP_RIGHT]: async (pixels: PixelSetData, draw: DrawHook) => {
        const max = pixels.width + pixels.height - 1;

        for (let d = 0; d < max; d++)
            for (let y = 0; y <= d; y++) {
                const x = pixels.width - 1 - (d - y);
                if (x < 0 || y >= pixels.height) continue;
                await draw(x, y);
            }
    },

    [Modes.SQUARE_RINGS_OUT]: async (pixels: PixelSetData, draw: DrawHook) => {
        const cx = (pixels.width / 2) | 0;
        const cy = (pixels.height / 2) | 0;
        const max = Math.max(cx, cy);

        for (let r = 0; r <= max; r++) {

            for (let x = cx - r; x <= cx + r; x++) {
                const y1 = cy - r;
                const y2 = cy + r;

                if (x >= 0 && x < pixels.width && y1 >= 0)
                    await draw(x, y1);

                if (x >= 0 && x < pixels.width && y2 < pixels.height)
                    await draw(x, y2);
            }

            for (let y = cy - r + 1; y <= cy + r - 1; y++) {
                const x1 = cx - r;
                const x2 = cx + r;

                if (x1 >= 0 && y >= 0 && y < pixels.height)
                    await draw(x1, y);

                if (x2 < pixels.width && y >= 0 && y < pixels.height)
                    await draw(x2, y);
            }
        }
    },

    [Modes.SQUARE_RINGS_IN]: async (pixels: PixelSetData, draw: DrawHook) => {
        const cx = (pixels.width / 2) | 0;
        const cy = (pixels.height / 2) | 0;
        const max = Math.max(cx, cy);

        for (let r = max; r >= 0; r--) {

            for (let x = cx - r; x <= cx + r; x++) {
                const y1 = cy - r;
                const y2 = cy + r;

                if (x >= 0 && x < pixels.width && y1 >= 0)
                    await draw(x, y1);

                if (x >= 0 && x < pixels.width && y2 < pixels.height)
                    await draw(x, y2);
            }

            for (let y = cy - r + 1; y <= cy + r - 1; y++) {
                const x1 = cx - r;
                const x2 = cx + r;

                if (x1 >= 0 && y >= 0 && y < pixels.height)
                    await draw(x1, y);

                if (x2 < pixels.width && y >= 0 && y < pixels.height)
                    await draw(x2, y);
            }
        }
    },

    [Modes.EDGES_TO_CENTER]: async (pixels: PixelSetData, draw: DrawHook) => {
        let left = 0;
        let right = pixels.width - 1;
        let top = 0;
        let bottom = pixels.height - 1;

        while (left <= right && top <= bottom) {

            for (let x = left; x <= right; x++)
                await draw(x, top);

            for (let x = left; x <= right; x++)
                await draw(x, bottom);

            for (let y = top + 1; y < bottom; y++)
                await draw(left, y);

            for (let y = top + 1; y < bottom; y++)
                await draw(right, y);

            left++;
            right--;
            top++;
            bottom--;
        }
    },

    [Modes.CENTER_TO_EDGES]: async (pixels: PixelSetData, draw: DrawHook) => {
        const order: [number, number][] = [];

        let left = 0;
        let right = pixels.width - 1;
        let top = 0;
        let bottom = pixels.height - 1;

        while (left <= right && top <= bottom) {

            for (let x = left; x <= right; x++)
                order.push([x, top]);

            for (let x = left; x <= right; x++)
                order.push([x, bottom]);

            for (let y = top + 1; y < bottom; y++)
                order.push([left, y]);

            for (let y = top + 1; y < bottom; y++)
                order.push([right, y]);

            left++;
            right--;
            top++;
            bottom--;
        }

        for (let i = order.length - 1; i >= 0; i--) {
            const [x, y] = order[i];
            await draw(x, y);
        }
    },

    [Modes.CENTER_SPIRAL_OUT]: async (pixels: PixelSetData, draw: DrawHook) => {
        const cx = (pixels.width / 2) | 0;
        const cy = (pixels.height / 2) | 0;

        let x = cx;
        let y = cy;

        let dx = 1;
        let dy = 0;

        let segment = 1;
        let step = 0;
        let changes = 0;

        const total = pixels.width * pixels.height;

        for (let i = 0; i < total; i++) {

            if (x >= 0 && x < pixels.width && y >= 0 && y < pixels.height)
                await draw(x, y);

            x += dx;
            y += dy;
            step++;

            if (step === segment) {

                step = 0;

                const t = dx;
                dx = -dy;
                dy = t;

                changes++;

                if ((changes & 1) === 0)
                    segment++;
            }
        }
    },

    [Modes.CENTER_SPIRAL_IN]: async (pixels: PixelSetData, draw: DrawHook, hypot: HypotFunction) => {

        const order: [number, number][] = [];

        await drawingStrategies[Modes.CENTER_SPIRAL_OUT](pixels, async (x, y) => {
            order.push([x, y]);
        }, hypot);

        for (let i = order.length - 1; i >= 0; i--) {
            const [x, y] = order[i];
            await draw(x, y);
        }
    },

    [Modes.ANGLE_SWEEP_CW]: async (pixels: PixelSetData, draw: DrawHook) => {

        const cx = pixels.width / 2;
        const cy = pixels.height / 2;

        const coords: { x: number; y: number; a: number }[] = [];

        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++)
                coords.push({
                    x,
                    y,
                    a: Math.atan2(y - cy, x - cx)
                });

        coords.sort((a, b) => a.a - b.a);

        for (const p of coords)
            await draw(p.x, p.y);
    },

    [Modes.ANGLE_SWEEP_CCW]: async (pixels: PixelSetData, draw: DrawHook) => {

        const cx = pixels.width / 2;
        const cy = pixels.height / 2;

        const coords: { x: number; y: number; a: number }[] = [];

        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++)
                coords.push({
                    x,
                    y,
                    a: Math.atan2(y - cy, x - cx)
                });

        coords.sort((a, b) => b.a - a.a);

        for (const p of coords)
            await draw(p.x, p.y);
    },

    [Modes.FROM_CENTER]: async (pixels: PixelSetData, draw: DrawHook, hypot: HypotFunction) => {

        const [indices, distances] = centralSort(pixels, hypot);
        indices.sort((a, b) => distances[a] - distances[b]);

        for (const i of indices) {

            const x = i % pixels.width;
            const y = (i / pixels.width) | 0;

            await draw(x, y);
        }
    },

    [Modes.TO_CENTER]: async (pixels: PixelSetData, draw: DrawHook, hypot: HypotFunction) => {

        const [indices, distances] = centralSort(pixels, hypot);
        indices.sort((a, b) => distances[b] - distances[a]);

        for (const i of indices) {

            const x = i % pixels.width;
            const y = (i / pixels.width) | 0;

            await draw(x, y);
        }
    },

    [Modes.FROM_DIAMOND]: async (pixels: PixelSetData, draw: DrawHook) => {

        const [indices, distances] = centralSort(pixels, (a, b) => a + b);
        indices.sort((a, b) => distances[a] - distances[b]);

        for (const i of indices) {

            const x = i % pixels.width;
            const y = (i / pixels.width) | 0;

            await draw(x, y);
        }
    },

    [Modes.TO_DIAMOND]: async (pixels: PixelSetData, draw: DrawHook) => {

        const [indices, distances] = centralSort(pixels, (a, b) => a + b);
        indices.sort((a, b) => distances[b] - distances[a]);

        for (const i of indices) {

            const x = i % pixels.width;
            const y = (i / pixels.width) | 0;

            await draw(x, y);
        }
    },
};

export function sortPixels<T>(
    pixels: Pixel[],
    map: CoordSet<T>,
    mode: DrawingMode
): T[] {
    if (pixels.length === 0) return [];

    let minX = Infinity, minY = Infinity;

    for (const {x, y} of pixels) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        if(!map[x][y]) {
            throw new Error(`No map for coordinate ${x},${y}`);
        }
    }

    // stack call size
    const width = pixels.map(p => p.x).reduce((p, c) => Math.max(p, c), -Infinity) - minX + 1;
    const height = pixels.map(p => p.y).reduce((p, c) => Math.max(p, c), -Infinity) - minY + 1;

    const pixelGrid: ImagePixels = [];
    for (const p of pixels) {
        const nx = p.x - minX;
        const ny = p.y - minY;
        pixelGrid[nx] ??= [];
        pixelGrid[nx][ny] = p.col;
    }

    const pixelSet: PixelSetData = { width, height, pixels: pixelGrid };
    const sortedPixels: T[] = [];

    const func: DrawingFunction = drawingStrategies[mode as Modes] ?? mode as DrawingFunction;

    const hook = async (x: number, y: number) => {
        const px = minX + x, py = minY + y;
        if (map[px] == undefined || map[px][py] == undefined) {
            return;
        }
        sortedPixels.push(map[px][py]);
    };

    func(pixelSet, hook, Math.hypot);

    return sortedPixels;
}

function centralSort(pixels: PixelSetData, hypot: HypotFunction): [indices: number[], distances: Float32Array] {
    const centerX = Math.floor(pixels.width / 2);
    const centerY = Math.floor(pixels.height / 2);

    const w = pixels.width;
    const h = pixels.height;
    const total = w * h;

    const distances = new Float32Array(total);

    for (let y = 0; y <= centerY; y++) {
        for (let x = 0; x <= centerX; x++) {
            const d = hypot(centerX - x, centerY - y);

            const i1 = y * w + x;
            const i2 = y * w + (w - 1 - x);
            const i3 = (h - 1 - y) * w + x;
            const i4 = (h - 1 - y) * w + (w - 1 - x);

            distances[i1] = d;
            distances[i2] = d;
            distances[i3] = d;
            distances[i4] = d;
        }
    }

    const indices = Array.from({ length: total }, (_, i) => i);
    return [indices, distances];
}
