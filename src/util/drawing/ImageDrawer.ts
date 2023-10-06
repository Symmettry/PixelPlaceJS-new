import { Bot } from "../../bot/Bot";
import fs from 'fs';
import getPixels = require("get-pixels");
import mime = require("mime-types");
import { NdArray } from "ndarray";
import { Modes } from "./Modes";

export class ImageDrawer {

    instance!: Bot;

    path!: string;

    mode!: Modes;

    x!: number;
    y!: number;

    protect!: boolean;
    force!: boolean;

    constructor(instance: Bot, x: number, y: number, path: string, mode: Modes, protect: boolean, force: boolean) {
        Object.defineProperty(this, 'instance', {value: instance, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'path', {value: path, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'mode', {value: mode, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'x', {value: x, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'y', {value: y, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'protect', {value: protect, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'force', {value: force, writable: false, enumerable: true, configurable: false});
    }

    async draw(x: number, y: number, pixels: NdArray<Uint8Array>) {
        const r = pixels.get(x, y, 0);
        const g = pixels.get(x, y, 1);
        const b = pixels.get(x, y, 2);
        
        const closestColorId: number = this.instance.canvas.getClosestColorId(r, g, b);
        if(closestColorId !== -1) {
            await this.instance.placePixel(this.x + x, this.y + y, closestColorId, 1, this.protect, this.force);
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

                switch(this.mode) {
                    case Modes.LEFT_TO_RIGHT:
                        for (let y = 0; y < pixels.shape[1]; y++) {
                            for (let x = 0; x < pixels.shape[0]; x++) {
                                await this.draw(x, y, pixels);
                            }
                        }
                        break;
                    case Modes.RIGHT_TO_LEFT:
                        for (let y = 0; y < pixels.shape[1]; y++) {
                            for (let x = pixels.shape[0]; x > 0; x--) {
                                await this.draw(x, y, pixels);
                            }
                        }
                        break;
                    case Modes.TOP_TO_BOTTOM:
                        for (let x = 0; x < pixels.shape[0]; x++) {
                            for (let y = 0; y < pixels.shape[1]; y++) {
                                await this.draw(x, y, pixels);
                            }
                        }
                        break;
                    case Modes.BOTTOM_TO_TOP:
                        for (let x = 0; x < pixels.shape[0]; x++) {
                            for (let y = pixels.shape[1]; y > 0; y--) {
                                await this.draw(x, y, pixels);
                            }
                        }
                        break;
                    case Modes.RAND:
                        const coordinates = [];
                        for (let x = 0; x < pixels.shape[0]; x++) {
                            for (let y = 0; y < pixels.shape[1]; y++) {
                                coordinates.push([x, y]);
                            }
                        }
                    
                        for (let i = coordinates.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [coordinates[i], coordinates[j]] = [coordinates[j], coordinates[i]];
                        }
                    
                        for (let i = 0; i < coordinates.length; i++) {
                            await this.draw(coordinates[i][0], coordinates[i][1], pixels);
                        }
                        break;
                }
                resolve();
            });
        });
    }

}