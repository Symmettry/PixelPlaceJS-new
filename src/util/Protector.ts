import { Bot } from "../bot/Bot";

export class Protector {

    private protectedPixels: Map<string, number>;
    constructor(canvasWidth: number, canvasHeight: number) {
        this.protectedPixels = new Map();
    }

    protect(x: number, y: number, col: number): void {
        this.protectedPixels.set(`${x},${y}`, col);
    }
    unprotect(x: number, y: number): void {
        this.protectedPixels.delete(`${x},${y}`);
    }

    getColor(x: number, y: number): number | undefined {
        return this.protectedPixels.get(`${x},${y}`);
    }

    async detectPixels(pp: Bot, pixels: number[][]): Promise<void> {
        await Promise.all(
            pixels.map(async (pixel) => {
                const [x, y, col] = pixel;
                const protectColor = this.getColor(x, y);
                if (protectColor !== undefined) {
                    await pp.placePixel(x, y, protectColor, 1, true, false);
                }
            })
        );      
    }

    // worthless rn
    /*async detectAll(pp: Bot): Promise<void> {
        await new Promise<void>(async (resolve, _reject) => {
            // here we want to map each pixel detection to a promise
            const pixelDetectionPromises = Array.from(this.protectedPixels.entries()).map(async ([key, value]) => {
                const [x, y] = key.split(",").map(Number);
                if (value !== pp.getPixelAt(x, y)) {
                    await pp.placePixel(x, y, value, 1, true, false);
                }
            });
    
            // wait for all pixel detections to complete
            await Promise.all(pixelDetectionPromises);
    
            resolve();
        });
    
        // This will recursively call detectAll every 1000 milliseconds
        setTimeout(() => {
            this.detectAll(pp);
        }, 1000);
    }*/
    

};