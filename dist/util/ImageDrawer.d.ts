import { Bot } from "../bot/Bot";
import { NdArray } from "ndarray";
import { Modes } from "./Modes";
export declare class ImageDrawer {
    instance: Bot;
    path: string;
    mode: Modes;
    x: number;
    y: number;
    protect: boolean;
    force: boolean;
    constructor(instance: Bot, x: number, y: number, path: string, mode: Modes, protect: boolean, force: boolean);
    draw(x: number, y: number, pixels: NdArray<Uint8Array>): Promise<void>;
    begin(): Promise<void>;
}
