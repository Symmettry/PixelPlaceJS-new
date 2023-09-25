import { PixelPlace } from "../PixelPlace";
import fs from 'fs';
import getPixels = require("get-pixels");
import mime = require("mime-types");
import { NdArray } from "ndarray";

export class ImageDrawer {

    instance!: PixelPlace;

    path!: string;

    x!: number;
    y!: number;

    constructor(instance: PixelPlace, x: number, y: number, path: string) {

        Object.defineProperty(this, 'instance', {value: instance, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'path', {value: path, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'x', {value: x, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'y', {value: y, writable: false, enumerable: true, configurable: false});

    }

    async begin() {

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

                for (let x = 0; x < pixels.shape[0]; x++) {
                    for (let y = 0; y < pixels.shape[1]; y++) {
                        const r = pixels.get(x, y, 0);
                        const g = pixels.get(x, y, 1);
                        const b = pixels.get(x, y, 2);
                        
                        var closestColorId: number = this.instance.canvas.getClosestColorId(r, g, b);
                        if(closestColorId !== -1) {
                            await this.instance.placePixel(this.x + x, this.y + y, closestColorId);
                        }
                    }
                }
                resolve();
            });
        });
    }

}