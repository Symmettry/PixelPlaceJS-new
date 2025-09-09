import { Bot } from "../../bot/Bot";
import { DrawingFunction, DrawingMode, drawingStrategies, HypotFunction, Modes } from "../data/Modes";
import { constant } from "../Helper";
import { DelegateMethod } from "ts-delegate";
import { PixelSetData, PixelFlags, PlaceResults, RawFlags } from "../data/Data";
import { Color } from "../data/Color";
import { ImageUtil } from "./ImageUtil";
import { populate } from "../FlagUtil";
import { EffectFunction, EffectMode, FilterFunction, FilterMode } from "./ImageEffects";

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
    mode?: DrawingMode,
    /** Filter mode for the image; converts the R,G,B to pixel values. Also does dithering if using ones like FLOYD_STEINBERG. Defaults to STANDARD */
    filter?: FilterFunction,
    /** Effects to apply to the image; defaults to NONE */
    effect?: EffectFunction,
    /** Will make certain pre-made modes perform better; e.g. FROM_CENTER and TO_CENTER will run faster but be slightly less accurate. */
    performant?: boolean;

    /** If it should draw each color independently; defaults to false */
    byColor?: boolean;

    /** If the bot should add all the pixels to protection immediately, before drawing; defaults to false */
    fullProtect?: boolean;

    /** Takes the set of place results (e.g. from a previous draw) and will merge it in, and replace any pixels that were done by the old call. */
    replace?: PlaceResults[][];
} & (LocalFile | SetPixels | UrlFile) & PixelFlags;

type LocalImage = Image & LocalFile;
type SetImage = Image & SetPixels;
type UrlImage = Image & UrlFile;

const SQRT2M1 = Math.sqrt(2) - 1;

/**
 * Utility function for drawing images.
 */
export class ImageDrawer {

    /**
     * Draws an image.
     * @param x The x coordinate of the left.
     * @param y The y coordinate of the top.
     * @param path The path of the image.
     * @param mode The mode to draw. Can also be DrawingFunction.
     * @param protect If the pixels should be replaced when another player modifies them.
     * @param transparent If the image is transparent. Will skip any 0 alpha pixels.
     * @param wars If the pixels should place inside of war zones during wars (will get you banned if mods see it).
     * @param force If the pixel packet should still be sent if it doesn't change the color.
     * @returns A promise that resolves once the image is done drawing, contains place results for all placed pixels.
     */
    @DelegateMethod(true)
    static async drawImage(bot: Bot, image: Image): Promise<PlaceResults[][]> {
        bot.stats.images.drawing++;

        const res = await new ImageDrawer(bot, image).begin();

        bot.stats.images.drawing--;
        bot.stats.images.finished++;

        return res;
    }

    private instance!: Bot;

    private path?: string;
    private pixels?: ImagePixels;
    private url?: string;

    private mode!: Modes | DrawingFunction;
    private filter!: FilterFunction;
    private effect!: EffectFunction;
    private byColor!: boolean;

    private x!: number;
    private y!: number;
    private width: number;
    private height: number;

    private fullProtect!: boolean;

    private flags: RawFlags;

    private replace!: PlaceResults[][];

    private performant!: boolean;
    private hypot!: HypotFunction;

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
    
    constructor(instance: Bot, uimage: Image) {
        constant(this, 'instance', instance);
        const image = populate(uimage);

        if(this.isLocal(image)) this.path = image.path;
        else if (this.isUrl(image)) this.url = image.url;
        else if (this.isSet(image)) this.pixels = image.pixels;
        else throw new Error(`Missing path, url, or pixels on image: ${image}`);

        this.x = image.x;
        this.y = image.y;

        this.width = image.width ?? -1;
        this.height = image.height ?? -1;

        this.filter = image.filter ?? FilterMode.STANDARD;
        this.effect = image.effect ?? EffectMode.NONE;

        constant(this, 'mode', image.mode ?? Modes.TOP_LEFT_TO_RIGHT);
        constant(this, 'byColor', image.byColor ?? false);

        this.flags = image as RawFlags;

        constant(this, 'fullProtect', (image.fullProtect ?? false) && image.protect);

        constant(this, 'performant', image.performant ?? false);

        constant(this, 'replace', image.replace ?? []);

        this.hypot = !this.performant ? Math.hypot :
                    (dx, dy) => {
                        const ax = Math.abs(dx), ay = Math.abs(dy);
                        return ax < ay ? ay + SQRT2M1 * ax : ax + SQRT2M1 * ay;
                    };
    }

    private getColor(x: number, y: number, pixels: PixelSetData): number | null {
        if(pixels.pixels[x] == null || pixels.pixels[x][y] == null) return null;
        return pixels.pixels[x][y];
    }

    async draw(x: number, y: number, pixels: PixelSetData): Promise<void> {
        const color = this.getColor(x, y, pixels);
        if(color == null) return Promise.resolve();

        const nx = this.x + x;
        const ny = this.y + y;

        if(!this.placeResults[nx]) this.placeResults[nx] = [];
        const placeResult = await this.instance.placePixel({
            x: nx,
            y: ny,
            col: Math.abs(color),
            ref: this.flags,
        });

        if(color < 0) return;
        this.placeResults[nx][ny] = placeResult;
    }

    async begin(): Promise<PlaceResults[][]> {

        const data: PixelSetData = await ImageUtil.getPixelData(this.width, this.height, this.filter, this.effect, this.instance.headers, this.instance.boardId,
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
                    this.instance.protect(this.x + x, this.y + y, Math.abs(data.pixels[x][y]!), this.flags.replaceProtection);
                }
            }
        }

        const func = typeof this.mode == 'function' ? this.mode : drawingStrategies[this.mode];
        if (!func) throw new Error(`Invalid mode: ${this.mode}`)

        if(this.byColor) {
            const dataSets: {[key: string]: PixelSetData} = {};
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
                await func(colData, drawHook, this.hypot);
            }
            return this.placeResults;
        }

        const drawHook = (x: number, y: number) => {
            return this.draw(x, y, data);
        }
        
        await func(data, drawHook, this.hypot);

        return this.placeResults;
    }

}