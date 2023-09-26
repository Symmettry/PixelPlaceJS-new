import ndarray from 'ndarray';
import { Bot } from "../bot/Bot";
export declare class Protector {
    protectedPixels: ndarray.NdArray<Uint16Array>;
    constructor(canvasWidth: number, canvasHeight: number);
    protect(x: number, y: number, col: number): void;
    unprotect(x: number, y: number): void;
    getColor(x: number, y: number): number | undefined;
    detectPixels(pp: Bot, pixels: number[][]): Promise<void>;
    detectAll(pp: Bot): Promise<void>;
}
