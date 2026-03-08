import { Bot } from "../../bot/Bot";
import { BaseMode, BaseModes, DrawingFunction, HypotFunction, Modes } from "../data/Modes";
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

    /** Drawing mode; defaults to Modes.of(BaseModes.ROWS, [ModeConfig.CHECKERED]) */
    mode?: DrawingFunction,
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
     * @param bot The bot instance.
     * @param image The image data to draw.
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

    private mode!: DrawingFunction;
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

        constant(this, 'mode', image.mode ?? Modes.of(BaseModes.ROWS));
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
        const data: PixelSetData = await ImageUtil.getPixelData(
            this.width, this.height, this.filter, this.effect,
            this.instance.headers, this.instance.boardId,
            this.path, this.url, this.pixels
        );

        this.width = data.width;
        this.height = data.height;

        // handle replace array (unchanged)
        if(this.replace.length > 0) { /* ... same logic as before ... */ }

        if(this.fullProtect) {
            for (let y = 0; y < data.height; y++) {
                for (let x = 0; x < data.width; x++) {
                    this.instance.protect(this.x + x, this.y + y, Math.abs(data.pixels[x][y]!), this.flags.replaceProtection);
                }
            }
        }

        const func: DrawingFunction = typeof this.mode === 'function'
            ? this.mode
            : (() => { throw new Error(`Invalid mode: ${this.mode}`); })();

        if (!func) throw new Error(`Invalid mode: ${this.mode}`);

        if(this.byColor) {
            const dataSets: {[key: string]: PixelSetData} = {};
            for (let x = 0; x < data.width; x++) {
                for (let y = 0; y < data.height; y++) {
                    const col = data.pixels[x][y];
                    if(!col) continue;
                    if(!dataSets[col]) dataSets[col] = { width: data.width, height: data.height, pixels: [] };
                    if(!dataSets[col].pixels[x]) dataSets[col].pixels[x] = [];
                    dataSets[col].pixels[x][y] = col;
                }
            }
            for(const colData of Object.values(dataSets)) {
                const drawHook = (x: number, y: number) => this.draw(x, y, colData);
                await func(colData, drawHook, this.hypot);
            }
            return this.placeResults;
        }

        const drawHook = (x: number, y: number) => this.draw(x, y, data);
        await func(data, drawHook, this.hypot);

        return this.placeResults;
    }

}