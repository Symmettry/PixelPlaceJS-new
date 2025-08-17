import { Bot } from "../../bot/Bot";
import fs from 'fs';
import Jimp from 'jimp';
import mime = require("mime-types");
import { Modes } from "../data/Modes";
import { IImage } from "../data/Data";
import { constant } from "../Constant";
import { ImageData } from "../data/Data";
import { Color } from "../data/Color";

/**
 * Represents a drawing mode that draws on a pixel array.
 * @param pixels - The pixel array to draw on.
 * @param draw - A function that draws the image color at a specific coordinate.
 * @returns A promise which resolves when the image is done drawing.
 */
export type DrawingFunction = (
    pixels: ImageData,
    draw: (x: number, y: number) => Promise<void>,
) => Promise<void>;

/**
 * Utility function for drawing images.
 */
export class ImageDrawer {

    private instance!: Bot;

    private path!: string;

    private mode!: Modes | DrawingFunction;

    private x!: number;
    private y!: number;

    private protect!: boolean;
    private fullProtect!: boolean;
    private replaceProtection!: boolean;

    private transparent!: boolean;
    private wars!: boolean;
    private force!: boolean;

    private drawingStrategies!: {[key in Modes]: (pixels: ImageData) => Promise<void>};

    constructor(instance: Bot, image: IImage) {
        constant(this, 'instance', instance);

        constant(this, 'path', image.path);

        constant(this, 'x', image.x);
        constant(this, 'y', image.y);

        constant(this, 'mode', image.mode ?? Modes.TOP_LEFT_TO_RIGHT);

        constant(this, 'protect', image.protect ?? false);
        constant(this, 'fullProtect', (image.fullProtect ?? false) && image.protect);
        constant(this, 'replaceProtection', (image.replaceProtection ?? true) && image.protect);

        constant(this, 'transparent', image.transparent ?? false);
        constant(this, 'wars', image.wars ?? false);
        constant(this, 'force', image.force ?? false);

        constant(this, "drawingStrategies", {

            [Modes.TOP_LEFT_TO_RIGHT]: async (pixels: ImageData) => {
                for (let y = 0; y < pixels.height; y++) 
                    for (let x = 0; x < pixels.width; x++) 
                        await this.draw(x, y, pixels);
            },
            [Modes.TOP_RIGHT_TO_LEFT]: async (pixels: ImageData) => {
                for (let y = 0; y < pixels.height; y++) 
                    for (let x = pixels.width; x >= 0; x--) 
                        await this.draw(x, y, pixels);
            },
            [Modes.BOTTOM_LEFT_TO_RIGHT]: async (pixels: ImageData) => {
                for (let y = pixels.height; y >= 0; y--) 
                    for (let x = 0; x < pixels.width; x++) 
                        await this.draw(x, y, pixels);
            },
            [Modes.BOTTOM_RIGHT_TO_LEFT]: async (pixels: ImageData) => {
                for (let y = pixels.height; y >= 0; y--) 
                    for (let x = pixels.width; x >= 0; x--) 
                        await this.draw(x, y, pixels);
            },
            [Modes.LEFT_TOP_TO_BOTTOM]: async (pixels: ImageData) => {
                for (let x = 0; x < pixels.width; x++) 
                    for (let y = 0; y < pixels.height; y++) 
                        await this.draw(x, y, pixels);
            },
            [Modes.LEFT_BOTTOM_TO_TOP]: async (pixels: ImageData) => {
                for (let x = 0; x < pixels.width; x++) 
                    for (let y = pixels.height; y >= 0; y--) 
                        await this.draw(x, y, pixels);
            },
            [Modes.RIGHT_TOP_TO_BOTTOM]: async (pixels: ImageData) => {
                for (let x = pixels.width; x >= 0; x--) 
                    for (let y = 0; y < pixels.height; y++) 
                        await this.draw(x, y, pixels);
            },
            [Modes.RIGHT_BOTTOM_TO_TOP]: async (pixels: ImageData) => {
                for (let x = pixels.width; x >= 0; x--) 
                    for (let y = pixels.height; y >= 0; y--) 
                        await this.draw(x, y, pixels);
            },
            [Modes.FROM_CENTER]: async (pixels: ImageData) => {
                const centerX = Math.floor(pixels.width / 2);
                const centerY = Math.floor(pixels.height / 2);

                const pixelDistances = [];
                for (let x = 0; x < pixels.width; x++) {
                    for (let y = 0; y < pixels.height; y++) {
                        const distance = Math.hypot(centerX - x, centerY - y);
                        pixelDistances.push([x, y, distance]);
                    }
                }

                pixelDistances.sort((a, b) => a[2] - b[2]);

                for (const pixel of pixelDistances) {
                    await this.draw(pixel[0], pixel[1], pixels);
                }
            },
            [Modes.TO_CENTER]: async (pixels: ImageData) => {
                const centerX = Math.floor(pixels.width / 2);
                const centerY = Math.floor(pixels.height / 2);

                const pixelDistances = [];
                for (let x = 0; x < pixels.width; x++) {
                    for (let y = 0; y < pixels.height; y++) {
                        const distance = Math.hypot(centerX - x, centerY - y);
                        pixelDistances.push([x, y, distance]);
                    }
                }

                pixelDistances.sort((a, b) => b[2] - a[2]);

                for (const pixel of pixelDistances) {
                    await this.draw(pixel[0], pixel[1], pixels);
                }
            },

            [Modes.RAND]: async (pixels: ImageData) => {
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
                    await this.draw(x, y, pixels);
                } 
            }

        });
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

        return this.instance.placePixel({
            x: nx,
            y: ny,
            col: color,
            wars: this.wars,
            protect: this.protect,
            force: this.force,
        });
    }

    private skipPixel(x: number, y: number, col: Color): boolean {
        if(!this.protect) return true;
        if(!this.replaceProtection && this.instance.protector.getColor(x, y) != undefined) {
            return true;
        }
        return false;
    }

    async begin(): Promise<void> {

        if (!fs.existsSync(this.path)) {
            throw new Error(`File does not exist at path: ${this.path}`);
        }
        
        const type = mime.lookup(this.path);
        if (!type || !type.startsWith('image/')) {
            throw new Error(`File at path: ${this.path} is not an image`);
        }

        return new Promise<void>((resolve) => {
            Jimp.read(this.path, async (err, img) => {
                if (err) {
                    console.error(err);
                    return;
                }

                const data: ImageData = { width: img.bitmap.width, height: img.bitmap.height, pixels: [] };

                for (let x = 0; x < img.bitmap.width; x++) {
                    data.pixels[x] = [];
                    for (let y = 0; y < img.bitmap.height; y++) {
                        const color = img.getPixelColor(x, y);
                        const rgba = Jimp.intToRGBA(color);
                        
                        // Skip transparent pixels
                        if (this.transparent && rgba.a === 0) continue;
                        
                        data.pixels[x][y] = this.instance.getClosestColorId(rgba);
                    }
                }

                if(this.fullProtect) {
                    for (let y = 0; y < data.height; y++) {
                        for (let x = 0; x < data.width; x++) { 
                            const col = data.pixels[x][y];
                            if(this.skipPixel(x, y, col)) continue;
                            this.instance.protect(this.x + x, this.y + y, col);
                        }
                    }
                }

                if(typeof this.mode == 'function') {
                    const drawHook = (x: number, y: number) => {
                        return this.draw(x, y, data);
                    }
                    await this.mode(data, drawHook);
                    return resolve();
                }
                
                if (!this.drawingStrategies[this.mode]) throw new Error(`Invalid mode: ${this.mode}`)
                await (this.drawingStrategies[this.mode])(data);
                resolve();
            });
        });
    }

}