import { PixelPlace } from "../PixelPlace";
export declare const protectedPixels: Map<string, number>;
export declare function protect(x: number, y: number, col: number): void;
export declare function unprotect(x: number, y: number): void;
export declare function getColor(x: number, y: number): number | undefined;
export declare function detectPixels(pp: PixelPlace, pixels: number[][]): Promise<void>;
export declare function detectAll(pp: PixelPlace): Promise<void>;
