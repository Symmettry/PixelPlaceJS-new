import { Bot } from "../bot/Bot";

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

export async function detectPixels(pp: Bot, pixels: number[][]): Promise<void> {
    await Promise.all(
        pixels.map(async (pixel) => {
            const [x, y, col] = pixel;
            const protectColor = getColor(x, y);
            if (protectColor != undefined && protectColor !== -1 && protectColor !== col) {
                await pp.placePixel(x, y, protectColor, 1, true, false);
            }
        })
    );      
}

export async function detectAll(pp: Bot): Promise<void> {
    await new Promise<void>(async (resolve, _reject) => {
        protectedPixels.forEach(async (_value, key) => {
            const [x, y] = key.split(",").map(Number);
            const protectColor = getColor(x, y);
            if(protectColor != undefined && protectColor !== -1 && protectColor !== pp.getPixelAt(x, y)) {
                await pp.placePixel(x, y, protectColor, 1, true, false);
            }
        })
        resolve();
    });
    setTimeout(() => {detectAll(pp)}, 1000);
}
