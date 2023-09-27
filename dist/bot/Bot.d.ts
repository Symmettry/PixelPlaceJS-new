import * as Canvas from '../util/Canvas.js';
import WebSocket from 'ws';
import { Protector } from "../util/Protector.js";
import { Auth } from './Auth.js';
import { Modes } from '../util/Modes.js';
export declare class Bot {
    listeners: Map<string, Function[]>;
    socket: WebSocket;
    canvas: Canvas.Canvas;
    isWorld: boolean;
    boardId: number;
    authKey: string;
    authToken: string;
    authId: string;
    pixels: number[][];
    lastPlaced: number;
    tDelay: number;
    protector: Protector;
    constructor(auth: Auth);
    on(key: string, func: Function): void;
    Init(): Promise<void>;
    getPixelAt(x: number, y: number): number | undefined;
    getColorId(r: number, g: number, b: number): number;
    genPlacementSpeed(): number;
    placePixel(x: number, y: number, col: number, brush?: number, protect?: boolean, force?: boolean): Promise<void>;
    emit(key: string, value: any): void;
    drawImage(x: number, y: number, path: string, mode?: Modes, protect?: boolean, force?: boolean): Promise<void>;
}
