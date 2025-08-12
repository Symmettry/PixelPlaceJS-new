import { Colors } from "..";
import { Bot } from "../bot/Bot";
import { IStatistics } from "./data/Data";
import { PixelPacket, PixelPacketData } from "./packets/PacketResponses";

/**
 * Utility functions for protecting pixels.
 */
export class Protector {

    private protectedPixels: Map<string, number>;
    private pp: Bot;
    private stats: IStatistics;

    constructor(pp: Bot) {
        this.protectedPixels = new Map();
        this.pp = pp;
        this.stats = pp.stats;
    }

    updateProtection(protect: boolean, x: number, y: number, col: Colors): boolean {
        return protect ? this.protect(x, y, col) : this.unprotect(x, y);
    }

    protect(x: number, y: number, col: Colors): boolean {
        const protectColor = this.getColor(x, y);
        if (protectColor != undefined) return false;

        this.protectedPixels.set(`${x},${y}`, col);
        if(protectColor == undefined) this.stats.pixels.protection.protected++;

        return true;
    }
    unprotect(x: number, y: number): boolean {
        const protectColor = this.getColor(x, y);
        if (protectColor == undefined) return false;
        
        this.protectedPixels.delete(`${x},${y}`);
        this.stats.pixels.protection.protected--;

        return true;
    }

    getColor(x: number, y: number): number | undefined {
        return this.protectedPixels.get(`${x},${y}`);
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