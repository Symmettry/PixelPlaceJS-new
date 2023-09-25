import { PixelPlace } from "../PixelPlace";
export declare class ImageDrawer {
    instance: PixelPlace;
    path: string;
    x: number;
    y: number;
    constructor(instance: PixelPlace, x: number, y: number, path: string);
    begin(): Promise<void>;
}
