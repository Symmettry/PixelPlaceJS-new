import { PixelPlace } from "../PixelPlace";
export declare class ImageDrawer {
    instance: PixelPlace;
    path: string;
    x: number;
    y: number;
    protect: boolean;
    force: boolean;
    constructor(instance: PixelPlace, x: number, y: number, path: string, protect: boolean, force: boolean);
    begin(): Promise<void>;
}
