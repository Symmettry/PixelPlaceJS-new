import { Bot } from "../../bot/Bot";
import fs from 'fs';
import Jimp from 'jimp';
import mime = require("mime-types");
import { Modes } from "../data/Modes";
import { IImage } from "../data/Data";
import { constant } from "../Constant";
import { ImageData } from "../data/Data";

/**
 * Represents a drawing mode that draws on a pixel array.
 * @param pixels - The pixel array to draw on.
 * @param drawHook - A function that allows drawing at a specific coordinate.
 * @param getColorAtHook - A function that gets the color at a specific coordinate.
 * @returns A promise which resolves when the image is done drawing.
 */
export type DrawingFunction = (
    pixels: ImageData,
    drawHook: (x: number, y: number, pixels: ImageData) => Promise<void>,
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
    private transparent!: boolean;
    private wars!: boolean;
    private force!: boolean;

    private drawingStrategies!: {[key in Modes]: (pixels: ImageData) => Promise<void>};

    constructor(instance: Bot, image: IImage) {
        constant(this, 'instance', instance);

        constant(this, 'path', image.path);

        constant(this, 'mode', image.mode);

        constant(this, 'x', image.x);
        constant(this, 'y', image.y);

        constant(this, 'protect', image.protect);
        constant(this, 'transparent', image.transparent);
        constant(this, 'wars', image.wars);
        constant(this, 'force', image.force);

        constant(this, "drawingStrategies", {

            0: async (pixels: ImageData) => { // TOP_LEFT_TO_RIGHT
                for (let y = 0; y < pixels.height; y++) 
                    for (let x = 0; x < pixels.width; x++) 
                        await this.draw(x, y, pixels);
            },
            1: async (pixels: ImageData) => { // TOP_RIGHT_TO_LEFT
                for (let y = 0; y < pixels.height; y++) 
                    for (let x = pixels.width; x >= 0; x--) 
                        await this.draw(x, y, pixels);
            },
            2: async (pixels: ImageData) => { // BOTTOM_LEFT_TO_RIGHT
                for (let y = pixels.height; y >= 0; y--) 
                    for (let x = 0; x < pixels.width; x++) 
                        await this.draw(x, y, pixels);
            },
            3: async (pixels: ImageData) => { // BOTTOM_RIGHT_TO_LEFT
                for (let y = pixels.height; y >= 0; y--) 
                    for (let x = pixels.width; x >= 0; x--) 
                        await this.draw(x, y, pixels);
            },
            4: async (pixels: ImageData) => { // LEFT_TOP_TO_BOTTOM
                for (let x = 0; x < pixels.width; x++) 
                    for (let y = 0; y < pixels.height; y++) 
                        await this.draw(x, y, pixels);
            },
            5: async (pixels: ImageData) => { // LEFT_BOTTOM_TO_TOP
                for (let x = 0; x < pixels.width; x++) 
                    for (let y = pixels.height; y >= 0; y--) 
                        await this.draw(x, y, pixels);
            },
            6: async (pixels: ImageData) => { // RIGHT_TOP_TO_BOTTOM
                for (let x = pixels.width; x >= 0; x--) 
                    for (let y = 0; y < pixels.height; y++) 
                        await this.draw(x, y, pixels);
            },
            7: async (pixels: ImageData) => { // RIGHT_BOTTOM_TO_TOP
                for (let x = pixels.width; x >= 0; x--) 
                    for (let y = pixels.height; y >= 0; y--) 
                        await this.draw(x, y, pixels);
            },
            8: async (pixels: ImageData) => { // FROM_CENTER
                // calculate the center point
                const centerX = Math.floor(pixels.width / 2);
                const centerY = Math.floor(pixels.height / 2);

                // create an array to hold pixels and their distances from the center
                const pixelDistances = [];

                // calculate the distance of each pixel from the center
                for (let x = 0; x < pixels.width; x++) {
                    for (let y = 0; y < pixels.height; y++) {
                        const dx = centerX - x;
                        const dy = centerY - y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        pixelDistances.push({x, y, distance});
                    }
                }

                //sort the pixels by their distance from the center
                pixelDistances.sort((a, b) => a.distance - b.distance);

                // draw the pixels from the center outward
                for (const pixel of pixelDistances) {
                    await this.draw(pixel.x, pixel.y, pixels);
                }
            },
            9: async (pixels: ImageData) => { // TO_CENTER
                // calculate the center point
                const centerX = Math.floor(pixels.width / 2);
                const centerY = Math.floor(pixels.height / 2);

                // create an array to hold pixels and their distances from the center
                const pixelDistances = [];

                // calculate the distance of each pixel from the center
                for (let x = 0; x < pixels.width; x++) {
                    for (let y = 0; y < pixels.height; y++) {
                        const dx = centerX - x;
                        const dy = centerY - y;
                        const distance = Math.sqrt(dx * dx + dy * dy);

                        pixelDistances.push({x, y, distance});
                    }
                }

                //sort the pixels by their distance from the center
                pixelDistances.sort((a, b) => b.distance - a.distance);

                // draw the pixels from the center outward
                for (const pixel of pixelDistances) {
                    await this.draw(pixel.x, pixel.y, pixels);
                }
            },

            10: async (pixels: ImageData) => { // RAND
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

        return this.instance.placePixel({
            x: nx,
            y: ny,
            col: color,
            protect: this.protect,
            wars: this.wars,
            force: this.force,
        });
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
                        const { r, g, b, a } = rgba;
                        
                        // Skip transparent pixels
                        if (this.transparent && a === 0) continue;
                        
                        data.pixels[x][y] = this.instance.getClosestColorId({ r, g, b });
                    }
                }

                if(typeof this.mode == 'function') {
                    const drawHook = (x: number, y: number, pixels: ImageData) => {
                        return this.draw(x, y, pixels);
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