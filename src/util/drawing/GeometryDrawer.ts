import { Bot } from "../../bot/Bot";
import { Color } from "../data/Color";
import { CoordSet, Pixel, PixelFlags, PixelSetData, PlaceResults } from "../data/Data";
import { BaseModes, DrawingFunction, Modes } from "../data/Modes";
import { populate } from "../FlagUtil";
import { DelegateMethod } from "ts-delegate";

export type ColorReceiver = Color | ((x: number, y: number) => Color);
export type Rectangle = {
    /** X of the rectangle; top left */
    x: number;
    /** Y of the rectangle; top left */
    y: number;

    /** Width of the rectangle */
    width: number;
    /** Height of the rectangle */
    height: number;

    /** Color to draw in */
    color: ColorReceiver;

    /** Sorts the pixels of the rectangle; defaults to Modes.of(BaseModes.ROWS) */
    sort?: DrawingFunction;

    /** Protect all pixels instantly */
    fullProtect?: boolean;
} & PixelFlags;

export type Outline = {
    /** X of the outline; top left */
    x: number;
    /** Y of the outline; top left */
    y: number;

    /** Width of the outline */
    width: number;
    /** Height of the outline */
    height: number;

    /** Color to draw in */
    color: ColorReceiver;

    /** Border width of the outline; defaults to 1 */
    borderWidth?: number;

    /** Sorts the pixels of the outline; defaults to Modes.of(BaseModes.ROWS) */
    sort?: DrawingFunction;

    /** Protect all pixels instantly */
    fullProtect?: boolean;
} & PixelFlags;

export class GeometryDrawer {

    static colorFunc(col: ColorReceiver): (x: number, y: number) => Color {
        return typeof col == 'number' ? (() => col) : col;
    }

    static async placeSorted(bot: Bot, ref: Rectangle | Outline, pixels: Pixel[]): Promise<PlaceResults[][]> {
        const results: PlaceResults[][] = [];

        // Build a quick lookup map
        const map: CoordSet<Pixel> = {};
        for (const p of pixels) {
            const { x, y } = p;
            map[x] ??= {};
            map[x][y] = p;
        }

        // Build PixelSetData for the drawing function
        const width = Math.max(...pixels.map(p => p.x)) + 1;
        const height = Math.max(...pixels.map(p => p.y)) + 1;

        const pixelData: PixelSetData = {
            width,
            height,
            pixels: Array.from({ length: width }, (_, x) =>
                Array.from({ length: height }, (_, y) => map[x]?.[y]?.col ?? null)
            )
        };

        // Use the new system: either a DrawingFunction or default to BaseModes.ROWS
        const drawFn = ref.sort ?? Modes.of(BaseModes.ROWS);

        const drawHook = async (x: number, y: number) => {
            const col = pixelData.pixels[x]?.[y];
            if (col == null) return;
            const res = await bot.placePixel({ x, y, col, ref });
            results[x] ??= [];
            results[x][y] = res;
        };

        await drawFn(pixelData, drawHook, Math.hypot);

        return results;
    }

    /**
     * Draws a rectangle
     * @param x X position of rectangle
     * @param y Y position of rectangle
     * @param width width of rectangle
     * @param height height of rectangle
     * @param color color or function that maps x,y to color
     */
    @DelegateMethod(true)
    static async drawRect(bot: Bot, urect: Rectangle): Promise<PlaceResults[][]> {
        const rect = populate(urect);

        const getCol = this.colorFunc(rect.color);

        if(rect.fullProtect) {
            for(let h=0;h<rect.height;h++) for(let w=0;w<rect.width;w++)
                bot.protect(rect.x + w, rect.y + h, getCol(w, h), rect.replaceProtection);
        }

        const pixels: Pixel[] = [];
        for(let h=0;h<rect.height;h++) {
            for(let w=0;w<rect.width;w++) {
                const x = rect.x + w, y = rect.y + h;
                pixels.push({
                    x, y,
                    col: getCol(w, h),
                });
            }
        }

        return await this.placeSorted(bot, rect, pixels);
    }

    private static cbOutline(outline: Outline, cb: (x: number, y: number, col: number) => void): void {
        const getCol = this.colorFunc(outline.color);

        outline.borderWidth ??= 1;

        for(let i=0;i<outline.borderWidth;i++) {
            const width = outline.width - i;
            const height = outline.height - i;
            
            const minX = outline.x + i;
            const minY = outline.y + i;
            const maxX = outline.x + width - 1;
            const maxY = outline.y + height - 1;

            for(let x=0;x<width;x++) {
                const off = minX + x;

                cb(off, minY, getCol(x, 0));
                cb(off, maxY, getCol(x, height - 1));
            }

            for(let y=1;y<height-1;y++) {
                const off = minY + y;

                cb(minX, off, getCol(0, y));
                cb(maxX, off, getCol(width - 1, y));
            }
        }
    }

    /**
     * Draws an outline
     * @param x X position of outline
     * @param y Y position of outline
     * @param width width of outline
     * @param height height of outline
     * @param color color or function that maps x,y to color
     * @param borderWidth pixel width of the border
     */
    @DelegateMethod(true)
    static async drawOutline(bot: Bot, uoutline: Outline): Promise<PlaceResults[][]> {
        const outline = populate(uoutline);

        if(outline.fullProtect) this.cbOutline(outline, (x, y, col) => bot.protect(x, y, col, outline.replaceProtection));
        
        const pixels: Pixel[] = [];
        this.cbOutline(outline, (x, y, col) => pixels.push({x, y, col}));

        return await this.placeSorted(bot, outline, pixels);
    }
    
}