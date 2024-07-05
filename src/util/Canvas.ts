import ndarray from 'ndarray';
import * as https from 'https';
import { IncomingMessage, OutgoingHttpHeaders } from 'http';
import { IRGBColor } from './data/Data';
import { Colors } from './data/Colors';
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

/** 
 * Pixelplace canvas data.
 */
export class Canvas {

    private boardId: number;

    private canvasState: number = 0;
    private canvasPacketData: PixelPacket = [];

    private delayedPixelPacketData: PixelPacket[] = [];

    private colors: { [key: string]: number } = {'255,255,255': 0,'196,196,196': 1,'136,136,136': 2,'85,85,85': 3,'34,34,34': 4,'0,0,0': 5,'0,54,56': 39,'0,102,0': 6,
        '27,116,0': 49,'71,112,80': 40,'34,177,76': 7,'2,190,1': 8,'81,225,25': 9,'148,224,68': 10,'152,251,152': 41,'251,255,91': 11,
        '229,217,0': 12,'230,190,12': 13,'229,149,0': 14,'255,112,0': 42,'255,57,4': 21,'229,0,0': 20,'206,41,57': 43,'255,65,106': 44,
        '159,0,0': 19,'107,0,0': 18,'255,117,95': 23,'160,106,66': 15,'99,60,31': 17,'153,83,13': 16,'187,79,0': 22,'255,196,159': 24,
        '255,223,204': 25,'255,167,209': 26,'207,110,228': 27,'125,38,205': 45,'236,8,236': 28,'130,0,128': 29,'51,0,119': 46,'2,7,99': 31,
        '81,0,255': 30,'0,0,234': 32,'4,75,255': 33,'0,91,161': 47,'101,131,207': 34,'54,186,255': 35,'0,131,199': 36,'0,211,221': 37,
        '69,255,200': 38,'181,232,238': 48,
    };
    private validColorIds = Object.values(this.colors);

    pixelData!: ndarray.NdArray<Uint16Array>;

    canvasWidth!: number;
    canvasHeight!: number;

    headers: (type: HeaderTypes) => OutgoingHttpHeaders;

    constructor(boardId: number, headers: (type: HeaderTypes) => OutgoingHttpHeaders) {
        this.boardId = boardId;
        this.headers = headers;
    }

    async Init(authId: string, authKey: string, authToken: string): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.getPaintingData(authId, authKey, authToken).then(data => {
                this.canvasWidth = data.width;
                this.canvasHeight = data.height;
    
                // Pixelplace canvases are always going to be white. The canvas image will not be the full size when no pixels are placed, so it's filled with white normally.
                // Any ocean pixel will be set there when the canvas is loaded, so this causes no issues.
                this.pixelData = ndarray(new Uint16Array(this.canvasWidth * this.canvasHeight).fill(Colors.WHITE), [this.canvasWidth, this.canvasHeight]);
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
    getClosestColorId(rgb: IRGBColor): number {
        const { r, g, b } = rgb;

        let minDistance = Infinity;
        let closestColorId = Colors.OCEAN;
    
        for (const color in this.colors) {
            const [r2, g2, b2] = color.split(',').map(Number);
            const distance = Math.sqrt(Math.pow(r - r2, 2) + Math.pow(g - g2, 2) + Math.pow(b - b2, 2));
    
            if (distance >= minDistance) continue;

            minDistance = distance;
            closestColorId = this.colors[color];
        }
    
        return closestColorId;
    }

    private getColorId(rgb: IRGBColor): number {
        const { r, g, b } = rgb;
        return Object.prototype.hasOwnProperty.call(this.colors, `${r},${g},${b}`) ? this.colors[`${r},${g},${b}`] : Colors.OCEAN;
    }

    async loadCanvasPicture(): Promise<void> {
        return new Promise<void>((resolve) => {
            const imageUrl = `https://pixelplace.io/canvas/${this.boardId}.png?t200000=${Date.now()}`;

            https.get(imageUrl, {headers: this.headers("canvas-image")}, (response: IncomingMessage) => {
                const chunks: Buffer[] = [];

                response.on('data', (chunk: Buffer) => {
                    chunks.push(chunk);
                }).on('end', () => {
                    const buffer = Buffer.concat(chunks);

                    Jimp.read(buffer, async (err, img) => {
                        if (err) {
                            console.error(err);
                            return;
                        }

                        for (let x = 0; x < img.bitmap.width; x++) {
                            for (let y = 0; y < img.bitmap.height; y++) {
                                const color = img.getPixelColor(x, y);
                                const rgba = Jimp.intToRGBA(color);
                                // eslint-disable-next-line prefer-const -- it's cleaner without const, and const provides no perf boost. Ignored!
                                let { r, g, b, a } = rgba;

                                if(a == 0) r = g = b = 255;

                                // 204, 204, 204 is ocean.
                                if(r == 204 && g == 204 && b == 204) {
                                    this.pixelData?.set(x, y, Colors.OCEAN);
                                    continue;
                                }

                                const colId = this.getColorId({r,g,b});
                                if(colId != -1) {
                                    this.pixelData?.set(x, y, colId);
                                }
                            }
                        }

                        if(this.canvasState == 1) {
                            await this.loadCanvasData(this.canvasPacketData);
                        }

                        for(const pixels of this.delayedPixelPacketData) {
                            this.loadPixels(pixels);
                        }
                        this.delayedPixelPacketData = []; // save memory

                        this.canvasState = 2;
                        resolve();
                    });
                }).on('error', (error: Error) => {
                    console.error(error);
                });
            });
        });
    }

    loadCanvasData(pixels: PixelPacket): Promise<void> {
        return new Promise<void>((resolve) => {
            if(this.canvasState == 0 || !this.pixelData) {
                this.canvasPacketData = pixels;
                this.canvasState = 1;
                return resolve();
            }
            this.loadPixels(pixels);
            resolve();
        });
    }
    loadPixelData(pixels: PixelPacket): Promise<void> {
        return new Promise<void>((resolve) => {
            if(this.canvasState != 2 || !this.pixelData) {
                this.delayedPixelPacketData.push(pixels);
                return resolve();
            }
            this.loadPixels(pixels);
            resolve();
        });
    }

    private loadPixels(pixels: PixelPacket): void {
        pixels.forEach(pixel => {
            const [x, y, col] = pixel;
            this.pixelData.set(x, y, col);
        });
    }

    private async getPaintingData(authId: string, authKey: string, authToken: string): Promise<{ width: number, height: number, userId: number }> {
        const headers = this.headers("get-painting");
        headers['accept'] = 'application/json';
        headers['cookie'] = `authId=${authId};authKey=${authKey};authToken=${authToken}`;

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
    getColors(): { [key: string]: number; } {
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
