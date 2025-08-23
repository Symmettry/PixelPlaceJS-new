import { Bot } from "../../bot/Bot";
import { Modes } from "../data/Modes";
import { constant } from "../Constant";
import { BrushTypes, ImageData, PixelFlags, PlaceResults, QueueSide } from "../data/Data";
import { Color } from "../data/Color";
import { ImageUtil } from "./ImageUtil";

export type ImageMode = Modes | DrawingFunction;
export type ImagePixels = (Color | null)[][];

type LocalFile = {
    /** Path of the image */
    path: string;
};
type SetPixels = {
    /** Pixel set of the image */
    pixels: ImagePixels;
};
type UrlFile = {
    /** Url to image */
    url: string;
}

/**
 * Image data.
 */
export type Image = {
    /** X position of the image */
    x: number;
    /** Y position of the image */
    y: number;

    /** Width of the image; defaults to the actual width of the image */
    width?: number;
    /** Height of the image; defaults to the actual height of the image */
    height?: number;

    /** Drawing mode; defaults to Modes.TOP_LEFT_TO_RIGHT */
    mode?: ImageMode,
     /** Will make certain pre-made modes perform better; e.g. FROM_CENTER and TO_CENTER will run faster but be slightly less accurate. */
    performant?: boolean;

    /** If it should draw each color independently; defaults to false */
    byColor?: boolean;

    /** If the bot should add all the pixels to protection immediately, before drawing; defaults to false */
    fullProtect?: boolean;
    /** If it should replace already protected pixels; defaults to true */
    replaceProtection?: boolean;

    /** Takes the set of place results (e.g. from a previous draw) and will merge it in, and replace any pixels that were done by the old call. */
    replace?: PlaceResults[][];
} & (LocalFile | SetPixels | UrlFile) & PixelFlags;

type LocalImage = Image & LocalFile;
type SetImage = Image & SetPixels;
type UrlImage = Image & UrlFile;

type DrawHook = (x: number, y: number) => Promise<void>;

/**
 * Represents a drawing mode that draws on a pixel array.
 * @param pixels - The pixel array to draw on.
 * @param draw - A function that draws the image color at a specific coordinate.
 * @returns A promise which resolves when the image is done drawing.
 */
export type DrawingFunction = (
    pixels: ImageData,
    draw: DrawHook,
) => Promise<void>;

const SQRT2M1 = Math.sqrt(2) - 1;

/**
 * Utility function for drawing images.
 */
export class ImageDrawer {

    private instance!: Bot;

    private path?: string;
    private pixels?: ImagePixels;
    private url?: string;

    private mode!: Modes | DrawingFunction;
    private byColor!: boolean;

    private x!: number;
    private y!: number;
    private width: number;
    private height: number;

    private protect!: boolean;
    private fullProtect!: boolean;
    private replaceProtection!: boolean;

    private wars!: boolean;
    private force!: boolean;

    private brush!: BrushTypes;
    private side!: QueueSide;

    private replace!: PlaceResults[][];

    private performant!: boolean;
    private hypot!: (dx: number, dy: number) => number;

    private drawingStrategies!: {[key in Modes]: (pixels: ImageData, draw: DrawHook) => Promise<void>};

    private placeResults: PlaceResults[][] = [];

    isLocal(image: Image): image is LocalImage {
        return (image as any).path != undefined;
    }
    isSet(image: Image): image is SetImage {
        return (image as any).pixels != undefined;
    }
    isUrl(image: Image): image is UrlImage {
        return (image as any).url != undefined;
    }
    
    constructor(instance: Bot, image: Image) {
        constant(this, 'instance', instance);

        if(this.isLocal(image)) this.path = image.path;
        else if (this.isUrl(image)) this.url = image.url;
        else if (this.isSet(image)) this.pixels = image.pixels;
        else throw new Error(`Missing path, url, or pixels on image: ${image}`);

        this.x = image.x;
        this.y = image.y;

        this.width = image.width ?? -1;
        this.height = image.height ?? -1;

        constant(this, 'mode', image.mode ?? Modes.TOP_LEFT_TO_RIGHT);
        constant(this, 'byColor', image.byColor ?? false);

        constant(this, 'protect', image.protect ?? false);
        constant(this, 'fullProtect', (image.fullProtect ?? false) && image.protect);
        constant(this, 'replaceProtection', (image.replaceProtection ?? true) && image.protect);

        constant(this, 'wars', image.wars ?? false);
        constant(this, 'force', image.force ?? false);
        constant(this, 'brush', image.brush ?? BrushTypes.NORMAL);
        constant(this, 'side', image.side ?? QueueSide.BACK);

        constant(this, 'performant', image.performant ?? false);

        constant(this, 'replace', image.replace ?? []);

        this.hypot = !this.performant ? Math.hypot :
                    (dx, dy) => {
                        const ax = Math.abs(dx), ay = Math.abs(dy);
                        return ax < ay ? ay + SQRT2M1 * ax : ax + SQRT2M1 * ay;
                    };

        constant(this, "drawingStrategies", {

            [Modes.TOP_LEFT_TO_RIGHT]: async (pixels: ImageData, draw: DrawHook) => {
                for (let y = 0; y < pixels.height; y++) 
                    for (let x = 0; x < pixels.width; x++) 
                        await draw(x, y);
            },
            [Modes.TOP_RIGHT_TO_LEFT]: async (pixels: ImageData, draw: DrawHook) => {
                for (let y = 0; y < pixels.height; y++) 
                    for (let x = pixels.width; x >= 0; x--) 
                        await draw(x, y);
            },
            [Modes.BOTTOM_LEFT_TO_RIGHT]: async (pixels: ImageData, draw: DrawHook) => {
                for (let y = pixels.height; y >= 0; y--) 
                    for (let x = 0; x < pixels.width; x++) 
                        await draw(x, y);
            },
            [Modes.BOTTOM_RIGHT_TO_LEFT]: async (pixels: ImageData, draw: DrawHook) => {
                for (let y = pixels.height; y >= 0; y--) 
                    for (let x = pixels.width; x >= 0; x--) 
                        await draw(x, y);
            },
            [Modes.LEFT_TOP_TO_BOTTOM]: async (pixels: ImageData, draw: DrawHook) => {
                for (let x = 0; x < pixels.width; x++) 
                    for (let y = 0; y < pixels.height; y++) 
                        await draw(x, y);
            },
            [Modes.LEFT_BOTTOM_TO_TOP]: async (pixels: ImageData, draw: DrawHook) => {
                for (let x = 0; x < pixels.width; x++) 
                    for (let y = pixels.height; y >= 0; y--) 
                        await draw(x, y);
            },
            [Modes.RIGHT_TOP_TO_BOTTOM]: async (pixels: ImageData, draw: DrawHook) => {
                for (let x = pixels.width; x >= 0; x--) 
                    for (let y = 0; y < pixels.height; y++) 
                        await draw(x, y);
            },
            [Modes.RIGHT_BOTTOM_TO_TOP]: async (pixels: ImageData, draw: DrawHook) => {
                for (let x = pixels.width; x >= 0; x--) 
                    for (let y = pixels.height; y >= 0; y--) 
                        await draw(x, y);
            },
            [Modes.FROM_CENTER]: async (pixels: ImageData, draw: DrawHook) => {
                const [indices, distances] = this.circularSort(pixels);
                indices.sort((a, b) => distances[a] - distances[b]);

                for (const i of indices) {
                    const x = i % pixels.width;
                    const y = (i / pixels.width) | 0;
                    await draw(x, y);
                }
            },
            [Modes.TO_CENTER]: async (pixels: ImageData, draw: DrawHook) => {
                const [indices, distances] = this.circularSort(pixels);
                indices.sort((a, b) => distances[b] - distances[a]);

                for (const i of indices) {
                    const x = i % pixels.width;
                    const y = (i / pixels.width) | 0;
                    await draw(x, y);
                }
            },

            [Modes.RAND]: async (pixels: ImageData, draw: DrawHook) => {
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

        });
    }

    private circularSort(pixels: ImageData): [indices: number[], distances: Float32Array] {
        const centerX = Math.floor(pixels.width / 2);
        const centerY = Math.floor(pixels.height / 2);

        const w = pixels.width;
        const h = pixels.height;
        const total = w * h;

        const distances = new Float32Array(total);

        for (let y = 0; y <= centerY; y++) {
            for (let x = 0; x <= centerX; x++) {
                const d = this.hypot(centerX - x, centerY - y);

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

    private getColor(x: number, y: number, pixels: ImageData): number | null {
        if(pixels.pixels[x] == null || pixels.pixels[x][y] == null) return null;
        return pixels.pixels[x][y];
    }

    async draw(x: number, y: number, pixels: ImageData): Promise<void> {
        const color = this.getColor(x, y, pixels);
        if(color == null) return Promise.resolve();

        const nx = this.x + x;
        const ny = this.y + y;

        if(!this.replaceProtection && this.instance.protector.getColor(x, y) != undefined)
            return Promise.resolve();

        if(!this.placeResults[nx]) this.placeResults[nx] = [];
        const placeResult = await this.instance.placePixel({
            x: nx,
            y: ny,
            col: Math.abs(color),
            wars: this.wars,
            protect: this.protect,
            force: this.force,
            brush: this.brush,
            side: this.side,
        });

        if(color < 0) return;
        this.placeResults[nx][ny] = placeResult;
    }

    private skipPixel(x: number, y: number): boolean {
        if(!this.protect) return true;
        if(!this.replaceProtection && this.instance.protector.getColor(x, y) != undefined) {
            return true;
        }
        return false;
    }

    async begin(): Promise<PlaceResults[][]> {

        const data: ImageData = await ImageUtil.getPixelData(this.width, this.height, this.instance.headers, this.instance.boardId,
                        this.path, this.url, this.pixels);

        this.width = data.width;
        this.height = data.height;

        if(this.replace.length > 0) {

            // replace is in the format of [nx][ny], where data.pixels is [x][y]
            // we need to increase the width of data.pixels to match replace and convert replace to [nx][ny]

            const dClean = data.pixels.filter(n => n);
            const rClean = this.replace.filter(n => n);

            // maxY is a bit annoying; the highest value from the different amounts of y's
            const dMaxY = Math.max(...dClean.map(n => n.length));
            const dMinY = Math.min(...dClean.map(n => n.findIndex(n => n)));

            // first non-null value
            const rMinX = this.replace.findIndex(n => n);
            // lowest non-null y value
            const rMinY = Math.min(...rClean.map(ys => ys.findIndex(n => n)));

            // length is the end x
            const rMaxX = this.replace.length;
            // just highest of lengths
            const rMaxY = Math.max(...rClean.map(ys => ys.length));

            // translate it down to our relative coordinates
            const tMinX = rMinX - this.x;
            const tMinY = rMinY - this.y;
            const tMaxX = rMaxX - this.x;
            const tMaxY = rMaxY - this.y;

            // if it's past our x, we don't need to move ours
            if(tMinX > 0) {
                // if it's greater than our width, we gotta extend it
                if(tMaxX > this.width) {
                    this.width = tMaxX;
                    for(let i = data.pixels.length; i < tMaxX; i++) {
                        data.pixels[i] = [];
                    }
                } else {
                    // otherwise, it's in bounds
                }
            } else {
                // but if it is behind it, we need to move our x to align and include it
                this.x += tMinX;

                // make a copy and clear
                const clone = [...data.pixels];
                data.pixels = [];

                // put all the values back in but shift them by the amount so they correctly align with the new relative
                for(const [x, ys] of Object.entries(clone)) {
                    data.pixels[Number(x) - tMinX] = ys;
                }
            }

            // if it's past our y we don't need to move ours
            if(tMinY > 0) {
                if(tMaxY > dMaxY) {
                    this.height = rMaxY - Math.min(dMinY, rMinY);
                    // extend each column to match new height
                    for(const col of data.pixels) {
                        while(col.length < tMaxY) col.push(null);
                    }
                } else {
                    // it's in bounds
                }
            } else {
                // prepend rows
                const shift = -tMinY;
                for(const col of data.pixels) {
                    if(col == null) continue;
                    for(let i = 0; i < shift; i++) {
                        col.unshift(null);
                    }
                }
                // this'll decrease it
                this.y += tMinY;
            }

            data.width = this.width;
            data.height = this.height;

            for(let x=0;x<this.width;x++) {
                if(!data.pixels[x]) data.pixels[x] = [];
                for(let y=0;y<this.height;y++) {
                    const ys = this.replace[this.x + x];
                    if(ys == null) continue;
                    const p = ys[this.y + y];
                    if(p == null || p.oldColor == null) continue;
                    data.pixels[x][y] ??= -p.oldColor;
                }
            }

        }

        if(this.fullProtect) {
            for (let y = 0; y < data.height; y++) {
                for (let x = 0; x < data.width; x++) { 
                    if(this.skipPixel(this.x + x, this.y + y)) continue;
                    this.instance.protect(this.x + x, this.y + y, Math.abs(data.pixels[x][y]!));
                }
            }
        }

        const func = typeof this.mode == 'function' ? this.mode : this.drawingStrategies[this.mode];
        if (!func) throw new Error(`Invalid mode: ${this.mode}`)

        if(this.byColor) {
            const dataSets: {[key: string]: ImageData} = {};
            for (let x = 0; x < data.width; x++) {
                for (let y = 0; y < data.height; y++) {
                    const col = data.pixels[x][y];
                    if(!col) continue;
                    if(!dataSets[col]) {
                        dataSets[col] = { width: data.width, height: data.height, pixels: [] };
                    }
                    if(!dataSets[col].pixels[x]) dataSets[col].pixels[x] = [];
                    dataSets[col].pixels[x][y] = col;
                }
            }
            for(const colData of Object.values(dataSets)) {
                const drawHook = (x: number, y: number) => {
                    return this.draw(x, y, colData);
                }
                await func(colData, drawHook);
            }
            return this.placeResults;
        }

        const drawHook = (x: number, y: number) => {
            return this.draw(x, y, data);
        }
        
        await func(data, drawHook);

        return this.placeResults;
    }

}