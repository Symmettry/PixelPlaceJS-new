import ndarray from 'ndarray';
export declare function getCanvas(boardId: number): Canvas | undefined;
export declare class Canvas {
    boardId: number;
    colors: {
        [key: string]: number;
    };
    pixelData: ndarray.NdArray<Uint16Array>;
    pixelPreData: number[][][];
    canvasWidth: number;
    canvasHeight: number;
    constructor(boardId: number);
    init(): Promise<void>;
    getClosestColorId(r: number, g: number, b: number): number;
    getColorId(r: number, g: number, b: number): number;
    loadCanvasPicture(): Promise<void>;
    loadCanvasData(pixels: number[][]): void;
    getDimensions(): Promise<{
        [key: string]: number;
    }>;
}
