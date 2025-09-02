import { Bot } from "../bot/Bot";
import { Canvas } from "./canvas/Canvas";
import { Color } from "./data/Color";
import { BoardTemplate, IStatistics } from "./data/Data";
import { PixelPacket } from "./packets/PacketResponses";

/**
 * Utility functions for protecting pixels.
 */
export class Protector {

    private static alerted = false;

    protectedPixels: {[key: number]: {[key: number]: Color}};

    private pp: Bot;
    private stats: IStatistics;

    constructor(pp: Bot) {
        this.protectedPixels = {};
        this.pp = pp;
        this.stats = pp.stats;
    }

    updateProtection(protect: boolean, x: number, y: number, col: Color) {
        if(protect) this.protect(x, y, col);
        else this.unprotect(x, y);
    }

    protect(x: number, y: number, col: Color | null, replaceProtection: boolean = true) {
        (async () => {
            if(!Canvas.isValidColor(col) || !this.pp.isValidPosition(x, y) || await this.pp.getPixelAt(x, y) == Color.OCEAN) return;

            if(!Protector.alerted && this.pp.boardId == 7 && this.pp.sysParams.warnRuleBreakage) {
                const region = await this.pp.getRegionAt(x, y);
                if(!region.canProtect) {
                    Protector.alerted = true;
                    console.warn(`~~WARN~~ You are protecting in a disallowed area: ${region.name} @ (${x},${y})\nThis warning will not repeat again.`);
                }
            }

            const protectColor = this.getColor(x, y);
            if (protectColor != undefined && !replaceProtection) return;
            if(protectColor == col) return;

            if(!this.protectedPixels[x]) this.protectedPixels[x] = {};
            this.protectedPixels[x][y] = col!;

            if(protectColor == undefined) this.stats.pixels.protection.protected++;
        })();
    }
    unprotect(x: number, y: number) {
        if(!this.pp.isValidPosition(x, y)) return;

        const protectColor = this.getColor(x, y);
        if (protectColor == undefined) return;
        
        delete this.protectedPixels[x][y];
        this.stats.pixels.protection.protected--;
    }

    getColor(x: number, y: number): number | undefined {
        if(!this.pp.isValidPosition(x, y)) return;
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