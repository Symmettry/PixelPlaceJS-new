import { Color } from "./Color";
import { CoordSet, Pixel, PixelSetData } from "./Data";

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

    /** Draws from the center outward. */
    FROM_CENTER = 8,
    /** Draws from the outside to the center. */
    TO_CENTER = 9,

    /** Draws randomly. */
    RAND = 10,

}

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

export const drawingStrategies: {[key in Modes]: DrawingFunction} = {
    [Modes.TOP_LEFT_TO_RIGHT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = 0; y < pixels.height; y++) 
            for (let x = 0; x < pixels.width; x++) 
                await draw(x, y);
    },
    [Modes.TOP_RIGHT_TO_LEFT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = 0; y < pixels.height; y++) 
            for (let x = pixels.width; x >= 0; x--) 
                await draw(x, y);
    },
    [Modes.BOTTOM_LEFT_TO_RIGHT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = pixels.height; y >= 0; y--) 
            for (let x = 0; x < pixels.width; x++) 
                await draw(x, y);
    },
    [Modes.BOTTOM_RIGHT_TO_LEFT]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let y = pixels.height; y >= 0; y--) 
            for (let x = pixels.width; x >= 0; x--) 
                await draw(x, y);
    },
    [Modes.LEFT_TOP_TO_BOTTOM]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = 0; x < pixels.width; x++) 
            for (let y = 0; y < pixels.height; y++) 
                await draw(x, y);
    },
    [Modes.LEFT_BOTTOM_TO_TOP]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = 0; x < pixels.width; x++) 
            for (let y = pixels.height; y >= 0; y--) 
                await draw(x, y);
    },
    [Modes.RIGHT_TOP_TO_BOTTOM]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = pixels.width; x >= 0; x--) 
            for (let y = 0; y < pixels.height; y++) 
                await draw(x, y);
    },
    [Modes.RIGHT_BOTTOM_TO_TOP]: async (pixels: PixelSetData, draw: DrawHook) => {
        for (let x = pixels.width; x >= 0; x--) 
            for (let y = pixels.height; y >= 0; y--) 
                await draw(x, y);
    },
    [Modes.FROM_CENTER]: async (pixels: PixelSetData, draw: DrawHook, hypot: HypotFunction) => {
        const [indices, distances] = circularSort(pixels, hypot);
        indices.sort((a, b) => distances[a] - distances[b]);

        for (const i of indices) {
            const x = i % pixels.width;
            const y = (i / pixels.width) | 0;
            await draw(x, y);
        }
    },
    [Modes.TO_CENTER]: async (pixels: PixelSetData, draw: DrawHook, hypot: HypotFunction) => {
        const [indices, distances] = circularSort(pixels, hypot);
        indices.sort((a, b) => distances[b] - distances[a]);

        for (const i of indices) {
            const x = i % pixels.width;
            const y = (i / pixels.width) | 0;
            await draw(x, y);
        }
    },

    [Modes.RAND]: async (pixels: PixelSetData, draw: DrawHook) => {
        const totalPixels = pixels.width * pixels.height;
        const coordinates = new Array(totalPixels);
    
        // initialize the coordinates array
        for (let i = 0; i < totalPixels; i++) {
            coordinates[i] = i;
        }
    
        // fisher-yates shuffle algorithm
        for (let i = totalPixels - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]];
        }
    
        // draw the pixels in the shuffled order
        for (let i = 0; i < totalPixels; i++) {
            const x = coordinates[i] % pixels.width;
            const y = Math.floor(coordinates[i] / pixels.width);
            await draw(x, y);
        } 
    }

}
function circularSort(pixels: PixelSetData, hypot: HypotFunction): [indices: number[], distances: Float32Array] {
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

    const pixelGrid: (Color | null)[][] = [];
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