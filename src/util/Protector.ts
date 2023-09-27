import ndarray from 'ndarray';
import { Bot } from "../bot/Bot";

export class Protector {

    protectedPixels: ndarray.NdArray<Uint16Array>;
    constructor(canvasWidth: number, canvasHeight: number) {
        this.protectedPixels = ndarray(new Uint16Array(canvasWidth * canvasHeight), [canvasWidth, canvasHeight]);
    }

    protect(x: number, y: number, col: number): void {
        this.protectedPixels.set(x, y, col);
    }
    unprotect(x: number, y: number): void {
        this.protectedPixels.set(x, y, -1);
    }

    getColor(x: number, y: number): number | undefined {
        return this.protectedPixels.get(x, y);
    }

    async detectPixels(pp: Bot, pixels: number[][]): Promise<void> {
        await Promise.all(
            pixels.map(async (pixel) => {
                const [x, y, col] = pixel;
                const protectColor = this.getColor(x, y);
                console.log(protectColor);
                //if (protectColor !== undefined && protectColor !== -1 && protectColor !== col) {
                //    await pp.placePixel(x, y, protectColor, 1, true, false);
                //}
            })
        );      
    }

    async detectAll(pp: Bot): Promise<void> {
        await new Promise<void>(async (resolve, _reject) => {
            for (let x = 0; x < this.protectedPixels.shape[0]; x++) {
                for (let y = 0; y < this.protectedPixels.shape[1]; y++) {
                    const protectColor = this.protectedPixels.get(x, y);
                    //if(protectColor != undefined && protectColor !== -1 && protectColor !== pp.getPixelAt(x, y)) {
                    //    await pp.placePixel(x, y, protectColor, 1, true, false);
                    //}
                }
            }
            resolve();
        });
        setTimeout(() => {this.detectAll(pp)}, 1000);
    }

}