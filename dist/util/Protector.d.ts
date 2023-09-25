import { Bot } from "../bot/Bot";
export declare const protectedPixels: Map<string, number>;
export declare function protect(x: number, y: number, col: number): void;
export declare function unprotect(x: number, y: number): void;
export declare function getColor(x: number, y: number): number | undefined;
export declare function detectPixels(pp: Bot, pixels: number[][]): Promise<void>;
export declare function detectAll(pp: Bot): Promise<void>;
