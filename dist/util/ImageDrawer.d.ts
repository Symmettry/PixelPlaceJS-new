import { Bot } from "../bot/Bot";
export declare class ImageDrawer {
    instance: Bot;
    path: string;
    x: number;
    y: number;
    protect: boolean;
    force: boolean;
    constructor(instance: Bot, x: number, y: number, path: string, protect: boolean, force: boolean);
    begin(): Promise<void>;
}
