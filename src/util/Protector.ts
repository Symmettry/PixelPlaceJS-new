import { PixelPlace } from "../PixelPlace";

export const protectedPixels: Map<string, number> = new Map();

export function protect(x: number, y: number, col: number): void {
    protectedPixels.set(`${x},${y}`, col);
}
export function unprotect(x: number, y: number): void {
    protectedPixels.delete(`${x},${y}`);
}

export function getColor(x: number, y: number): number | undefined {
    return protectedPixels.has(`${x},${y}`) ? protectedPixels.get(`${x},${y}`) : -1;
}

export async function detect(pp: PixelPlace, pixels: number[][]): Promise<void> {
    await Promise.all(
        pixels.map(async (pixel) => {
            const [x, y, col] = pixel;
            const protectColor = getColor(x, y);
      
            if (protectColor != undefined && protectColor !== -1 && protectColor !== col) {
                await pp.placePixel(x, y, protectColor);
            }
        })
    );      
}