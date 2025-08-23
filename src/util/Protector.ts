import { Bot } from "../bot/Bot";
import { Color } from "./data/Color";
import { IStatistics } from "./data/Data";
import { PixelPacket } from "./packets/PacketResponses";

/**
 * Utility functions for protecting pixels.
 */
export class Protector {

    protectedPixels: {[key: number]: {[key: number]: Color}};

    private pp: Bot;
    private stats: IStatistics;

    constructor(pp: Bot) {
        this.protectedPixels = {};
        this.pp = pp;
        this.stats = pp.stats;
    }

    updateProtection(protect: boolean, x: number, y: number, col: Color) {
        console.log("protect update",protect,x,y,col);
        if(protect) this.protect(x, y, col);
        else this.unprotect(x, y);
    }

    protect(x: number, y: number, col: Color | null) {
        if(!col) return;

        const protectColor = this.getColor(x, y);
        if (protectColor != undefined && protectColor == col) return;
        if(this.pp.getPixelAt(x, y) == Color.OCEAN) return;

        if(!this.protectedPixels[x]) this.protectedPixels[x] = {};
        this.protectedPixels[x][y] = col;

        if(protectColor == undefined) this.stats.pixels.protection.protected++;
    }
    unprotect(x: number, y: number) {
        const protectColor = this.getColor(x, y);
        if (protectColor == undefined) return;
        
        delete this.protectedPixels[x][y];
        this.stats.pixels.protection.protected--;
    }

    getColor(x: number, y: number): number | undefined {
        return this.protectedPixels[x] && this.protectedPixels[x][y];
    }

    detectPixels(pixels: PixelPacket) {
        for(const [x, y, col] of pixels) {
            const protectColor = this.getColor(x, y);
            if (protectColor == undefined || protectColor == col) continue;

            this.pp.placePixel({
                x, y,
                col: protectColor,
                protect: true
            });
        }
    }
    
}