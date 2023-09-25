import ndarray from 'ndarray';
export declare class Canvas {
    boardId: number;
    colors: {
        [key: string]: number;
    };
    pixelData: ndarray.NdArray<Float64Array> | undefined;
    pixelPreData: number[][][];
    constructor(boardId: number);
    init(): Promise<void>;
    getClosestColorId(r: number, g: number, b: number): number;
    getColorId(r: number, g: number, b: number): number;
    loadCanvasPicture(): Promise<void>;
    loadCanvasData(pixels: number[][]): Promise<void>;
    loadPixelData(pixel: number[]): Promise<void>;
    getDimensions(): Promise<{
        [key: string]: number;
    }>;
}
