import ndarray from 'ndarray';
import * as https from 'https';
import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { IRGBColor } from './data/Data';
import { Color } from './data/Color';
import Jimp = require('jimp');
import { PixelPacket } from './packets/PacketResponses';
import { HeaderTypes } from '../PixelPlace';
import { Bot } from '..';

const canvases: Map<number, Canvas> = new Map();

export function getCanvas(boardId: number, headers: (type: HeaderTypes) => OutgoingHttpHeaders): Canvas {
    return hasCanvas(boardId) ? canvases.get(boardId)?.setHeaders(headers) || new Canvas(boardId, headers) : new Canvas(boardId, headers);
}

export function hasCanvas(boardId: number): boolean {
    return canvases.has(boardId);
}

// states so they arent magic numbers
enum CanvasState {
    UNLOADED,
    PACKET_LOADED,
    IMAGE_LOADED,
    FULLY_LOADED,
}

const MAX_CANVAS_SIZE = 3000;

/** 
 * Pixelplace canvas data.
 */
export class Canvas {

    private boardId: number;

    private canvasState: CanvasState = CanvasState.UNLOADED;
    private canvasPacketData: PixelPacket = [];

    private delayedPixelPacketData: PixelPacket[] = [];

    private loadResolve: (() => void) | null = null;

    // i used chatgpt to re-write this i should check it later tbh
    private colors: { [key: string]: Color } = {
        "255,255,255": Color.WHITE,
        "196,196,196": Color.LIGHT_GRAY,
        "166,166,166": Color.A_BIT_LIGHT_GRAY,
        "136,136,136": Color.GRAY,
        "111,111,111": Color.A_BIT_DARKER_GRAY,
        "85,85,85": Color.DARK_GRAY,
        "58,58,58": Color.EVEN_DARKER_GRAY,
        "34,34,34": Color.DARKER_GRAY,
        "0,0,0": Color.BLACK,
        "0,54,56": Color.DARK_BLUE_GREEN,
        "0,102,0": Color.DARKER_GREEN,
        "71,112,80": Color.GRAY_GREEN,
        "27,116,0": Color.DARK_GREEN,
        "34,177,76": Color.CYAN_GREEN,
        "2,190,1": Color.GREEN,
        "81,225,25": Color.LIGHT_GREEN,
        "148,224,68": Color.LIGHTER_GREEN,
        "52,235,107": Color.NEON_GREEN,
        "152,251,152": Color.PALE_GREEN,
        "117,206,169": Color.YELLOW_GREEN,
        "202,255,112": Color.LIME_YELLOW,
        "251,255,91": Color.YELLOW,
        "229,217,0": Color.DARK_YELLOW,
        "255,204,0": Color.WEIRD_ORANGE,
        "193,161,98": Color.BROWN_ORANGE,
        "230,190,12": Color.YELLOW_ORANGE,
        "229,149,0": Color.LIGHTER_ORANGE,
        "255,112,0": Color.LIGHT_ORANGE,
        "255,57,4": Color.ORANGE,
        "229,0,0": Color.RED,
        "206,41,57": Color.CARMINE,
        "255,65,106": Color.LIGHT_RED,
        "159,0,0": Color.DARK_RED,
        "77,8,44": Color.EVEN_DARKER_PURPLE,
        "107,0,0": Color.DARKER_RED,
        "68,4,20": Color.WHAT_THE_FUCK_DARKER_PURPLE,
        "255,117,95": Color.SUNBURN_TAN,
        "160,106,66": Color.LIGHT_BROWN,
        "99,60,31": Color.DARK_BROWN,
        "153,83,13": Color.BROWN,
        "187,79,0": Color.GOLDEN_BROWN,
        "255,196,159": Color.TAN,
        "255,223,204": Color.LIGHT_TAN,
        "255,126,187": Color.PINK_IN_A_DIFFERENT_FONT,
        "255,167,209": Color.PINK,
        "236,8,236": Color.MAGENTA,
        "187,39,108": Color.GRAYISH_MAROONISH_RASPBERRISH_BROWN,
        "207,110,228": Color.LIGHTER_PURPLE,
        "125,38,205": Color.LIGHT_PURPLE,
        "130,0,128": Color.DARK_PURPLE,
        "89,28,145": Color.ANOTHER_FUCKING_PURPLE,
        "51,0,119": Color.DARKER_PURPLE,
        "2,7,99": Color.DARKER_BLUE,
        "81,0,255": Color.PURPLE,
        "0,0,234": Color.DARK_BLUE,
        "4,75,255": Color.BLUE,
        "1,49,130": Color.NAVY_BLUE,
        "0,91,161": Color.DARK_TEAL,
        "101,131,207": Color.GRAY_BLUE,
        "54,186,255": Color.SKY_BLUE,
        "0,131,199": Color.TEAL,
        "0,211,221": Color.DARK_CYAN,
        "69,255,200": Color.CYAN,
        "181,232,238": Color.BLUE_GREEN_WHITE
    };

    private validColorIds = Object.values(this.colors);

    pixelData!: ndarray.NdArray<Uint16Array>;

    canvasWidth!: number;
    canvasHeight!: number;

    headers: (type: HeaderTypes) => OutgoingHttpHeaders;

    constructor(boardId: number, headers: (type: HeaderTypes) => OutgoingHttpHeaders) {
        this.boardId = boardId;
        this.headers = headers;

        // make a default array to store some changes;
        this.pixelData = this.createNDArray(MAX_CANVAS_SIZE, MAX_CANVAS_SIZE);

        // now start loading it asap
        this.loadCanvasPicture();
    }

    private createNDArray(width: number, height: number): ndarray.NdArray<Uint16Array> {
        // Pixelplace canvases are always going to be white. The canvas image will not be the full size when no pixels are placed, so it's filled with white normally.
        // Any ocean pixel will be set there when the canvas is loaded, so this causes no issues.
        return ndarray(new Uint16Array(width * height).fill(Color.WHITE), [width, height]);
    }

    async fetchCanvasData(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.getPaintingData().then(data => {
                this.canvasWidth = data.width;
                this.canvasHeight = data.height;
    
                // this is dumb but it's whatever
                const newArray = this.createNDArray(this.canvasWidth, this.canvasHeight);
                for(let x=0;x<this.canvasWidth;x++) for(let y=0;y<this.canvasHeight;y++) newArray.set(x, y, this.pixelData.get(x, y));
                this.pixelData = newArray;

                canvases.set(this.boardId, this);

                resolve(data.userId);
            }).catch(reject);
        });
    }

    /**
     * Gets the color id closest to the rgb value
     * @param rgb Rgb data
     * @returns Color id closest to rgb
     */
    getClosestColorId(rgb: IRGBColor): Color {
        const { r, g, b } = rgb;

        let minDistance = Infinity;
        let closestColorId = Color.OCEAN;
    
        for (const color in this.colors) {
            const [r2, g2, b2] = color.split(',').map(Number);
            const distance = Math.sqrt(Math.pow(r - r2, 2) + Math.pow(g - g2, 2) + Math.pow(b - b2, 2));
    
            if (distance >= minDistance) continue;

            minDistance = distance;
            closestColorId = this.colors[color];
        }
    
        return closestColorId;
    }

    private getColorId(rgb: IRGBColor): Color {
        const { r, g, b } = rgb;
        return Object.prototype.hasOwnProperty.call(this.colors, `${r},${g},${b}`) ? this.colors[`${r},${g},${b}`] : Color.OCEAN;
    }

    async loadCanvasPicture(): Promise<void> {
        const imageUrl = `https://pixelplace.io/canvas/${this.boardId}.png?t200000=${Date.now()}`;

        const buffer = await new Promise<Buffer>((resolve, reject) => {
            https.get(imageUrl, { headers: this.headers("canvas-image") }, (response: IncomingMessage) => {
                const chunks: Buffer[] = [];
                response.on('data', (chunk: Buffer) => { chunks.push(chunk); });
                response.on('end', () => { resolve(Buffer.concat(chunks)); });
                response.on('error', (error: Error) => { reject(error); });
            });
        });

        const img = await Jimp.read(buffer);

        for (let x = 0; x < img.bitmap.width; x++) {
            for (let y = 0; y < img.bitmap.height; y++) {
                const color = img.getPixelColor(x, y);
                const rgba = Jimp.intToRGBA(color);
                let { r, g, b, a } = rgba;

                if (a === 0) r = g = b = 255;

                if (r === 204 && g === 204 && b === 204) {
                    this.pixelData?.set(x, y, Color.OCEAN);
                    continue;
                }

                const colId = this.getColorId({ r, g, b });
                if (colId !== Color.OCEAN) {
                    this.pixelData?.set(x, y, colId);
                }
            }
        }

        if (this.canvasState === CanvasState.PACKET_LOADED) {
            this.loadCanvasData(this.canvasPacketData);
        }
        this.setCanvasState(CanvasState.IMAGE_LOADED)

        for (const pixels of this.delayedPixelPacketData) {
            this.loadPixels(pixels);
        }

        this.delayedPixelPacketData = [];
    }

    private setCanvasState(state: CanvasState) {
        switch(state) {
            case CanvasState.IMAGE_LOADED: {
                if(this.canvasState == CanvasState.PACKET_LOADED) this.setCanvasState(CanvasState.FULLY_LOADED);
                else this.canvasState = CanvasState.IMAGE_LOADED;
                break;
            }
            case CanvasState.PACKET_LOADED: {
                if(this.canvasState == CanvasState.IMAGE_LOADED) this.setCanvasState(CanvasState.FULLY_LOADED);
                else this.canvasState = CanvasState.PACKET_LOADED;
                break;
            }
            case CanvasState.FULLY_LOADED: {
                this.canvasState = CanvasState.FULLY_LOADED;
                if(this.loadResolve != null) this.loadResolve();
                break;
            }
        }
    }

    loadCanvasData(pixels: PixelPacket): void {
        if(this.canvasState == CanvasState.UNLOADED || !this.pixelData) {
            this.canvasPacketData = pixels;
        } else {
            this.loadPixels(pixels);
        }
        this.setCanvasState(CanvasState.PACKET_LOADED);
    }
    loadPixelData(pixels: PixelPacket): void {
        if(this.canvasState != CanvasState.FULLY_LOADED || !this.pixelData) {
            this.delayedPixelPacketData.push(pixels);
            return;
        }
        this.loadPixels(pixels);
    }

    resolve(loadResolve: () => void): void {
        if(this.canvasState == CanvasState.FULLY_LOADED)
            return loadResolve();
        this.loadResolve = loadResolve;
    }

    private loadPixels(pixels: PixelPacket): void {
        pixels.forEach(pixel => {
            const [x, y, col] = pixel;
            this.pixelData.set(x, y, col);
        });
    }

    private async getPaintingData(): Promise<{ width: number, height: number, userId: number }> {
        const headers = this.headers("get-painting");
        const response = await fetch(`https://pixelplace.io/api/get-painting.php?id=${this.boardId}&connected=1`, {
            method: 'GET',
            headers: headers as HeadersInit,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const width = data.painting.width;
        const height = data.painting.height;
        const userId = data.user.id;

        return { width, height, userId };
    }

    /**
     * @returns Pixelplace color list.
     */ 
    getColors(): { [key: string]: Color; } {
        return this.colors;
    }

    /**
     * @param col A color id.
     * @returns If it's a valid color or not.
     */
    isValidColor(col: unknown): boolean {
        // non-numbers like null will be ignored fully.
        return typeof col == 'number' && this.validColorIds.includes(col);
    }
    
    /**
     * Reassigns headers function.
     * @param headers The headers function.
     */
    setHeaders(headers: (type: HeaderTypes) => OutgoingHttpHeaders) {
        this.headers = headers;
    }

}
