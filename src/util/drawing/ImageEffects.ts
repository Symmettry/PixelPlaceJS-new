import Jimp from "jimp";
import { Canvas } from "../canvas/Canvas";
import { ImagePixels } from "./ImageDrawer";

export type FilterFunction = (img: Jimp, effect: EffectFunction) => ImagePixels;

type FilterType = "STANDARD" | "FLOYD_STEINBERG";
/**
 * Filter modes for quantization & dithering of images
 */
export const FilterMode: Record<FilterType, FilterFunction> = {
    /**
     * Standard filter mode, this is used automatically
     * 
     * Takes each pixel and finds the closest color in the palette
     */
    STANDARD: (img: Jimp, effect: EffectFunction) => {
        const pixels: ImagePixels = [];
        for (let x = 0; x < img.bitmap.width; x++) {
            pixels[x] = [];
            for (let y = 0; y < img.bitmap.height; y++) {
                const color = img.getPixelColor(x, y);
                const {r,g,b,a} = effect(Jimp.intToRGBA(color));
                
                if (a === 0) continue;
                
                pixels[x][y] = Canvas.getClosestColorId(r,g,b);
            }
        }
        return pixels;
    },
    /**
     * Uses the floyd steinberg filter method
     * 
     * Error from pixels are spread onto neighbors (dithering) to make the image appear better
     */
    FLOYD_STEINBERG: (img: Jimp, effect: EffectFunction) => {
        const cols: [number, number, number, number][][] = [];
        for (let x = 0; x < img.bitmap.width; x++) {
            cols[x] = [];
            for (let y = 0; y < img.bitmap.height; y++) {
                const {r,g,b,a} = effect(Jimp.intToRGBA(img.getPixelColor(x, y)));
                if(a == 0) continue;

                cols[x][y] = [Jimp.rgbaToInt(r,g,b,a), r,g,b];
            }
        }
        const pixels: ImagePixels = [];
        const w = img.bitmap.width;
        const h = img.bitmap.height;
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                if (!cols[x] || !cols[x][y]) continue;

                const old_pixel = cols[x][y];
                const [_, r, g, b] = old_pixel;

                const new_pixel_id = Canvas.getClosestColorId(r, g, b);
                if (new_pixel_id == null) continue;

                const newCol = Canvas.colorToRgb[new_pixel_id]; // [R,G,B]
                cols[x][y] = [Jimp.rgbaToInt(...newCol, 255), ...newCol];

                const errR = r - newCol[0];
                const errG = g - newCol[1];
                const errB = b - newCol[2];

                const spread = (dx: number, dy: number, factor: number) => {
                    const nx = x + dx;
                    const ny = y + dy;
                    if (nx >= 0 && nx < w && ny >= 0 && ny < h && cols[nx] && cols[nx][ny]) {
                        const p = cols[nx][ny];
                        p[1] = Math.min(255, Math.max(0, p[1] + errR * factor));
                        p[2] = Math.min(255, Math.max(0, p[2] + errG * factor));
                        p[3] = Math.min(255, Math.max(0, p[3] + errB * factor));
                    }
                };

                spread(1, 0, 7/16);
                spread(-1, 1, 3/16);
                spread(0, 1, 5/16);
                spread(1, 1, 1/16);
            }
        }

        for (let x = 0; x < w; x++) {
            pixels[x] = [];
            for (let y = 0; y < h; y++) {
                if(!cols[x][y]) continue;
                const [, r, g, b] = cols[x][y];
                pixels[x][y] = Canvas.getClosestColorId(r, g, b);
            }
        }

        return pixels;
    },
} as const;

type RGBA = {r: number, g: number, b: number, a: number};
export type EffectFunction = (rgba: RGBA) => RGBA;

type EffectType = "NONE" | "GREYSCALE" | "INVERT";
/**
 * Effects to images; this directly mutates the pixel data
 */
export const EffectMode: Record<EffectType, EffectFunction> = {

    "NONE": (rgba) => rgba,
    /**
     * 
     */
    "GREYSCALE": ({r, g, b, a}) => {
        const gray = (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
        return {r: gray, g: gray, b: gray, a};
    },
    /**
     * Inverts the colors of the image
     */
    "INVERT": ({r, g, b, a}) => {
        return {r: 255 - r, g: 255 - g, b: 255 - b, a};
    }
}