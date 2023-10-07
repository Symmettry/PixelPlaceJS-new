import { Bot } from "../../bot/Bot";
import fs from 'fs';
import getPixels = require("get-pixels");
import mime = require("mime-types");
import { NdArray } from "ndarray";
import { Modes } from "./Modes";

export class ImageDrawer {

    private instance!: Bot;

    private path!: string;

    private mode!: Modes;

    private x!: number;
    private y!: number;

    private protect!: boolean;
    private force!: boolean;

    constructor(instance: Bot, x: number, y: number, path: string, mode: Modes, protect: boolean, force: boolean) {
        Object.defineProperty(this, 'instance', {value: instance, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'path', {value: path, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'mode', {value: mode, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'x', {value: x, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'y', {value: y, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'protect', {value: protect, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'force', {value: force, writable: false, enumerable: true, configurable: false});
    }

    async draw(x: number, y: number, pixels: NdArray<Uint8Array>): Promise<void> {
        const r = pixels.get(x, y, 0);
        const g = pixels.get(x, y, 1);
        const b = pixels.get(x, y, 2);
        
        const closestColorId: number = this.instance.getCanvas().getClosestColorId(r, g, b);
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
            } else if (this.protect) {
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

                const drawingStrategies: {[key in Modes]: (pixels: NdArray<Uint8Array>) => Promise<void>} = {
                    0: async (pixels: NdArray<Uint8Array>) => { // TOP_LEFT_TO_RIGHT
                        for (let y = 0; y < pixels.shape[1]; y++) {
                            for (let x = 0; x < pixels.shape[0]; x++) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    1: async (pixels: NdArray<Uint8Array>) => { // TOP_RIGHT_TO_LEFT
                        for (let y = 0; y < pixels.shape[1]; y++) {
                            for (let x = pixels.shape[0]; x > 0; x--) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    2: async (pixels: NdArray<Uint8Array>) => { // BOTTOM_LEFT_TO_RIGHT
                        for (let y = pixels.shape[1]; y > 0; y--) {
                            for (let x = 0; x < pixels.shape[0]; x++) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    3: async (pixels: NdArray<Uint8Array>) => { // BOTTOM_RIGHT_TO_LEFT
                        for (let y = pixels.shape[1]; y > 0; y--) {
                            for (let x = pixels.shape[0]; x > 0; x--) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    4: async (pixels: NdArray<Uint8Array>) => {
                        for (let x = 0; x < pixels.shape[0]; x++) {
                            for (let y = 0; y < pixels.shape[1]; y++) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    5: async (pixels: NdArray<Uint8Array>) => {
                        for (let x = 0; x < pixels.shape[0]; x++) {
                            for (let y = pixels.shape[1]; y > 0; y--) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    6: async (pixels: NdArray<Uint8Array>) => {
                        for (let x = pixels.shape[0]; x > 0; x--) {
                            for (let y = 0; y < pixels.shape[1]; y++) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    7: async (pixels: NdArray<Uint8Array>) => {
                        for (let x = pixels.shape[0]; x > 0; x--) {
                            for (let y = pixels.shape[1]; y > 0; y--) {
                                await this.draw(x, y, pixels);
                            }
                        }
                    },
                    8: async (pixels: NdArray<Uint8Array>) => { // RAND
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
                    },
                    
                };
                
                // Then, in your main code, you can call the appropriate strategy like this:
                if (drawingStrategies[this.mode]) {
                    await (drawingStrategies[this.mode])(pixels);
                } else {
                    throw new Error(`Invalid mode: ${this.mode}`);
                }
                resolve();
            });
        });
    }

}