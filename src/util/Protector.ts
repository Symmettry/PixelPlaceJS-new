import { Bot } from "../bot/Bot";
import { Statistics } from "./data/Data";

export class Protector {

    private protectedPixels: Map<string, number>;
    private pp: Bot;
    private stats: Statistics;

    constructor(pp: Bot, stats: Statistics) {
        this.protectedPixels = new Map();
        this.pp = pp;
        this.stats = stats;
    }

    protect(x: number, y: number, col: number): void {
        const protectColor = this.getColor(x, y);
        if (protectColor == undefined || protectColor != col) {
            this.protectedPixels.set(`${x},${y}`, col);
            if(protectColor == undefined)this.stats.pixelsProtected++;
        }
    }
    unprotect(x: number, y: number): void {
        const protectColor = this.getColor(x, y);
        if (protectColor != undefined) {
            this.protectedPixels.delete(`${x},${y}`);
            this.stats.pixelsProtected--;
        }
    }

    getColor(x: number, y: number): number | undefined {
        return this.protectedPixels.get(`${x},${y}`);
    }

    async detectPixels(pixels: number[][]): Promise<void> {
        await Promise.all(
            pixels.map(async (pixel) => {
                const [x, y, col] = pixel;
                const protectColor = this.getColor(x, y);
                if (protectColor !== undefined) {
                    await this.pp.placePixel(x, y, protectColor, 1, true, false);
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