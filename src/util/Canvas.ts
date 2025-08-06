import ndarray from 'ndarray';
import * as https from 'https';
import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { IRGBColor } from './data/Data';
import { Color } from './data/Color';
import Jimp = require('jimp');
import { PixelPacket } from './packets/PacketResponses';
import { HeaderTypes } from '../PixelPlace';

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

    private colors: { [key: string]: Color } = {
        "255,255,255": 0,
        "196,196,196": 1,
        "166,166,166": 60,
        "136,136,136": 2,
        "111,111,111": 61,
        "85,85,85": 3,
        "58,58,58": 62,
        "34,34,34": 4,
        "0,0,0": 5,
        "0,54,56": 39,
        "0,102,0": 6,
        "71,112,80": 40,
        "27,116,0": 49,
        "34,177,76": 7,
        "2,190,1": 8,
        "81,225,25": 9,
        "148,224,68": 10,
        "52,235,107": 51,
        "152,251,152": 41,
        "117,206,169": 50,
        "202,255,112": 58,
        "251,255,91": 11,
        "229,217,0": 12,
        "255,204,0": 52,
        "193,161,98": 57,
        "230,190,12": 13,
        "229,149,0": 14,
        "255,112,0": 42,
        "255,57,4": 21,
        "229,0,0": 20,
        "206,41,57": 43,
        "255,65,106": 44,
        "159,0,0": 19,
        "77,8,44": 63,
        "107,0,0": 18,
        "68,4,20": 55,
        "255,117,95": 23,
        "160,106,66": 15,
        "99,60,31": 17,
        "153,83,13": 16,
        "187,79,0": 22,
        "255,196,159": 24,
        "255,223,204": 25,
        "255,126,187": 54,
        "255,167,209": 26,
        "236,8,236": 28,
        "187,39,108": 53,
        "207,110,228": 27,
        "125,38,205": 45,
        "130,0,128": 29,
        "89,28,145": 56,
        "51,0,119": 46,
        "2,7,99": 31,
        "81,0,255": 30,
        "0,0,234": 32,
        "4,75,255": 33,
        "1,49,130": 59,
        "0,91,161": 47,
        "101,131,207": 34,
        "54,186,255": 35,
        "0,131,199": 36,
        "0,211,221": 37,
        "69,255,200": 38,
        "181,232,238": 48
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

    async Init(authId: string, authKey: string, authToken: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.getPaintingData(authId, authKey, authToken).then(data => {
                this.canvasWidth = data.width;
                this.canvasHeight = data.height;
    
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
        console.log("state: " + state);
        switch(state) {
            case CanvasState.IMAGE_LOADED: {
                if(this.canvasState == CanvasState.PACKET_LOADED) {
                    this.setCanvasState(CanvasState.FULLY_LOADED);
                } else {
                    this.canvasState = CanvasState.IMAGE_LOADED;
                }
                break;
            }
            case CanvasState.PACKET_LOADED: {
                if(this.canvasState == CanvasState.IMAGE_LOADED) {
                    this.setCanvasState(CanvasState.FULLY_LOADED);
                } else {
                    this.canvasState = CanvasState.PACKET_LOADED;
                }
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

    private async getPaintingData(authId: string, authKey: string, authToken: string): Promise<{ width: number, height: number, userId: number }> {
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
