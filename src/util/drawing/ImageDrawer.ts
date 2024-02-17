import { Bot } from "../../bot/Bot";
import fs from 'fs';
import getPixels = require("get-pixels");
import mime = require("mime-types");
import { NdArray } from "ndarray";
import { Modes } from "./Modes";
import { IImage } from "../data/Data";
import { constant } from "../Constant";

export class ImageDrawer {

    private instance!: Bot;

    private path!: string;

    private mode!: Modes | Function;

    private x!: number;
    private y!: number;

    private protect!: boolean;
    private force!: boolean;

    private drawingStrategies!: {[key in Modes]: (pixels: NdArray<Uint8Array>) => Promise<void>};

    constructor(instance: Bot, image: IImage) {
        constant(this, 'instance', instance);

        constant(this, 'path', image.path);

        constant(this, 'mode', image.mode);

        constant(this, 'x', image.x);
        constant(this, 'y', image.y);

        constant(this, 'protect', image.protect);
        constant(this, 'force', image.force);

        constant(this, "drawingStrategies", {

            0: async (pixels: NdArray<Uint8Array>) => { // TOP_LEFT_TO_RIGHT
                for (let y = 0; y < pixels.shape[1]; y++) {
                    for (let x = 0; x < pixels.shape[0]; x++) {
                        await this.draw(x, y, pixels);
                    }
                }
            },
            1: async (pixels: NdArray<Uint8Array>) => { // TOP_RIGHT_TO_LEFT
                for (let y = 0; y < pixels.shape[1]; y++) {
                    for (let x = pixels.shape[0]; x >= 0; x--) {
                        await this.draw(x, y, pixels);
                    }
                }
            },

            2: async (pixels: NdArray<Uint8Array>) => { // BOTTOM_LEFT_TO_RIGHT
                for (let y = pixels.shape[1]; y >= 0; y--) {
                    for (let x = 0; x < pixels.shape[0]; x++) {
                        await this.draw(x, y, pixels);
                    }
                }
            },
            3: async (pixels: NdArray<Uint8Array>) => { // BOTTOM_RIGHT_TO_LEFT
                for (let y = pixels.shape[1]; y >= 0; y--) {
                    for (let x = pixels.shape[0]; x >= 0; x--) {
                        await this.draw(x, y, pixels);
                    }
                }
            },

            4: async (pixels: NdArray<Uint8Array>) => { // LEFT_TOP_TO_BOTTOM
                for (let x = 0; x < pixels.shape[0]; x++) {
                    for (let y = 0; y < pixels.shape[1]; y++) {
                        await this.draw(x, y, pixels);
                    }
                }
            },
            5: async (pixels: NdArray<Uint8Array>) => { // LEFT_BOTTOM_TO_TOP
                for (let x = 0; x < pixels.shape[0]; x++) {
                    for (let y = pixels.shape[1]; y >= 0; y--) {
                        await this.draw(x, y, pixels);
                    }
                }
            },

            6: async (pixels: NdArray<Uint8Array>) => { // RIGHT_TOP_TO_BOTTOM
                for (let x = pixels.shape[0]; x >= 0; x--) {
                    for (let y = 0; y < pixels.shape[1]; y++) {
                        await this.draw(x, y, pixels);
                    }
                }
            },
            7: async (pixels: NdArray<Uint8Array>) => { // RIGHT_BOTTOM_TO_TOP
                for (let x = pixels.shape[0]; x >=0; x--) {
                    for (let y = pixels.shape[1]; y >= 0; y--) {
                        await this.draw(x, y, pixels);
                    }
                }
            },

            8: async (pixels: NdArray<Uint8Array>) => { // FROM_CENTER
                // calculate the center point
                const centerX = Math.floor(pixels.shape[0] / 2);
                const centerY = Math.floor(pixels.shape[1] / 2);

                // create an array to hold pixels and their distances from the center
                let pixelDistances = [];

                // calculate the distance of each pixel from the center
                for (let x = 0; x < pixels.shape[0]; x++) {
                    for (let y = 0; y < pixels.shape[1]; y++) {
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
            9: async (pixels: NdArray<Uint8Array>) => { // TO_CENTER
                // calculate the center point
                const centerX = Math.floor(pixels.shape[0] / 2);
                const centerY = Math.floor(pixels.shape[1] / 2);

                // create an array to hold pixels and their distances from the center
                let pixelDistances = [];

                // calculate the distance of each pixel from the center
                for (let x = 0; x < pixels.shape[0]; x++) {
                    for (let y = 0; y < pixels.shape[1]; y++) {
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

            10: async (pixels: NdArray<Uint8Array>) => { // RAND
                const totalPixels = pixels.shape[0] * pixels.shape[1];
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
                    const x = coordinates[i] % pixels.shape[0];
                    const y = Math.floor(coordinates[i] / pixels.shape[0]);
                    await this.draw(x, y, pixels);
                }
            }
        });
    }

    getColorAt(x: number, y: number, pixels: NdArray<Uint8Array>): number {
        const r = pixels.get(x, y, 0);
        const g = pixels.get(x, y, 1);
        const b = pixels.get(x, y, 2);
        
        const closestColorId: number = this.instance.getCanvas().getClosestColorId({r, g, b});
        return closestColorId;
    }

    async draw(x: number, y: number, pixels: NdArray<Uint8Array>): Promise<void> {
        const closestColorId = this.getColorAt(x, y, pixels);
        if(closestColorId !== -1) {
            const nx = this.x + x;
            const ny = this.y + y;

            if(this.instance.getPixelAt(nx, ny) != closestColorId) {
                return this.instance.placePixel({
                    x: nx,
                    y: ny,
                    col: closestColorId,
                    brush: 1,
                    protect: this.protect,
                    force: this.force
                });
            }
            
            if (this.protect) {
                return this.instance.protect(nx, ny, closestColorId);
            }
        }
    }

    async begin(): Promise<void> {

        if (!fs.existsSync(this.path)) {
            throw new Error(`File does not exist at path: ${this.path}`);
        }
        const type = mime.lookup(this.path);

        if (!type || !type.startsWith('image/')) {
            throw new Error(`File at path: ${this.path} is not an image`);
        }

        const buffer = fs.readFileSync(this.path);

        return new Promise<void>((resolve, _reject) => {
            getPixels(buffer, type, async (err: Error | null, pixels: NdArray<Uint8Array>) => {
                if (err) {
                    console.error(err);
                    return;
                }

                if(typeof this.mode == 'function') {
                    const drawHook = (x: number, y: number, pixels: NdArray<Uint8Array>) => {
                        return this.draw(x, y, pixels);
                    }
                    const getColorAtHook = (x: number, y: number, pixels: NdArray<Uint8Array>) => {
                        return this.getColorAt(x, y, pixels);
                    }
                    await this.mode(pixels, drawHook, getColorAtHook);
                    return resolve();
                }
                
                if (!this.drawingStrategies[this.mode]) throw new Error(`Invalid mode: ${this.mode}`)
                await (this.drawingStrategies[this.mode])(pixels);

                resolve();
            
            });
        });
    }

}