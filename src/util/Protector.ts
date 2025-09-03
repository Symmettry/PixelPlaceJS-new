import { Bot } from "../bot/Bot";
import { Canvas } from "./canvas/Canvas";
import { Color } from "./data/Color";
import { IStatistics } from "./data/Data";
import { DelegateMethod } from "ts-delegate";
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

    @DelegateMethod()
    updateProtection(protect: boolean, x: number, y: number, col: Color) {
        if(protect) this.protect(x, y, col);
        else this.unprotect(x, y);
    }

    /**
     * Directly protects a pixel. This does not place the pixel down.
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @param col The color of the pixel.
     * @param replaceProtection If it should replace pre-existing protection; defaults to false
     */
    @DelegateMethod()
    protect(x: number, y: number, col: Color | null, replaceProtection: boolean = true) {
        if(!Canvas.isValidColor(col) || !this.pp.isValidPosition(x, y) || this.pp.getPixelAt(x, y) == Color.OCEAN) return;

        if(!Protector.alerted && this.pp.boardId == 7 && this.pp.sysParams.warnRuleBreakage) {
            const region = this.pp.getRegionAt(x, y);
            if(!region.canProtect) {
                Protector.alerted = true;
                console.warn(`~~WARN~~ You are protecting in a disallowed area: ${region.name} @ (${x},${y})\nThis warning will not repeat again.`);
            }
        }

        const protectColor = this.getProtectedColor(x, y);
        if (protectColor != undefined && !replaceProtection) return;
        if(protectColor == col) return;

        if(!this.protectedPixels[x]) this.protectedPixels[x] = {};
        this.protectedPixels[x][y] = col!;

        if(protectColor == undefined) this.stats.pixels.protection.protected++;
    }
    /**
     * Directly unprotects a pixel.
     * @param x X of the pixel
     * @param y Y of the pixel
     */
    @DelegateMethod()
    unprotect(x: number, y: number): void {
        if(!this.pp.isValidPosition(x, y)) return;

        const protectColor = this.getProtectedColor(x, y);
        if (protectColor == undefined) return;
        
        delete this.protectedPixels[x][y];
        this.stats.pixels.protection.protected--;
    }

    /**
     * Gets the color being protected at a position, or undefined if not protected
     */
    @DelegateMethod()
    getProtectedColor(x: number, y: number): number | undefined {
        if(!this.pp.isValidPosition(x, y)) return;
        return this.protectedPixels[x] && this.protectedPixels[x][y];
    }

    /**
     * Internal use only
     */
    @DelegateMethod()
    detectPixels(pixels: PixelPacket): void {
        for(const [x, y, col] of pixels) {
            const protectColor = this.getProtectedColor(x, y);
            if (protectColor == undefined || protectColor == col) continue;

            this.pp.placePixel({
                x, y,
                col: protectColor,
                protect: true
            });
        }
    }
    
    /**
     * @returns If the spot is protected or not
     */
    @DelegateMethod()
    isProtected(x: number, y: number): boolean {
        return this.getProtectedColor(x, y) != undefined;
    }

}