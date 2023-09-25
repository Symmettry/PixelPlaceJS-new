import ndarray from 'ndarray';
export declare class Canvas {
    boardId: number;
    colors: {
        [key: string]: number;
    };
    pixelData: ndarray.NdArray<Float64Array> | undefined;
    constructor(boardId: number);
    init(): Promise<void>;
    getColorId(r: number, g: number, b: number): number;
    loadCanvasPicture(): Promise<void>;
    loadCanvasData(canvas: number[][]): Promise<void>;
    loadPixelData(pixel: number[]): Promise<void>;
    getDimensions(): Promise<{
        width: number;
        height: number;
    }>;
}
