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

    updateProtection(protect: boolean, x: number, y: number, col: Colors) {
        if(protect) this.protect(x, y, col);
        else this.unprotect(x, y);
    }

    protect(x: number, y: number, col: Colors): void {
        const protectColor = this.getColor(x, y);
        if (protectColor != undefined && protectColor == col) return;

        this.protectedPixels.set(`${x},${y}`, col);
        if(protectColor == undefined) this.stats.pixels.protection.protected++;
    }
    unprotect(x: number, y: number): void {
        const protectColor = this.getColor(x, y);
        if (protectColor == undefined) return;
        
        this.protectedPixels.delete(`${x},${y}`);
        this.stats.pixels.protection.protected--;
    }

    getColor(x: number, y: number): number | undefined {
        return this.protectedPixels.get(`${x},${y}`);
    }

    async detectPixels(pixels: PixelPacket): Promise<void> {
        await Promise.all(
            pixels.map((pixel: PixelPacketData) => {
                const [x, y, col] = pixel;
                const protectColor = this.getColor(x, y);
                if (protectColor == undefined || protectColor == col) return;

                this.stats.pixels.protection.repaired++;
                this.stats.pixels.protection.last_repair = Date.now();
                this.pp.placePixel({
                    x, y,
                    col: protectColor,
                    protect: true,
                });
            })
        );
    }
    
}