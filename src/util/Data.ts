export interface Pixel {
    x: number;
    y: number;
    col: number;
    brush: number;
    protect: boolean;
    force: boolean;
}
export interface Statistics {
    pixelsPlaced: number,
    pixelsProtected: number,
    imagesDrawn: number,
}