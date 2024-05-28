export class Bounds {
    static isInBounds(minX: number, minY: number, maxX: number, maxY: number, x: number, y: number): boolean {
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }
}