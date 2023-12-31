import ndarray, { NdArray } from 'ndarray';
import * as https from 'https';
import { IncomingMessage } from 'http';
import getPixels = require('get-pixels');
import { IRGBColor } from './data/Data';

const canvases: Map<number, Canvas> = new Map();

export function getCanvas(boardId: number): Canvas {
    if(hasCanvas(boardId)) {
        return canvases.get(boardId) || new Canvas(boardId);
    } else{
        return new Canvas(boardId);
    }
}
export function hasCanvas(boardId: number): boolean {
    return canvases.has(boardId);
}

export class Canvas {

    private boardId: number;

    private colors: { [key: string]: number };

    private pixelPreData!: number[][][];
    pixelData!: ndarray.NdArray<Uint16Array>;

    canvasWidth!: number;
    canvasHeight!: number;

    constructor(boardId: number) {
        this.boardId = boardId;
        this.colors = {'255,255,255': 0,'196,196,196': 1,'136,136,136': 2,'85,85,85': 3,'34,34,34': 4,'0,0,0': 5,'0,54,56': 39,'0,102,0': 6,
            '27,116,0': 49,'71,112,80': 40,'34,177,76': 7,'2,190,1': 8,'81,225,25': 9,'148,224,68': 10,'152,251,152': 41,'251,255,91': 11,
            '229,217,0': 12,'230,190,12': 13,'229,149,0': 14,'255,112,0': 42,'255,57,4': 21,'229,0,0': 20,'206,41,57': 43,'255,65,106': 44,
            '159,0,0': 19,'107,0,0': 18,'255,117,95': 23,'160,106,66': 15,'99,60,31': 17,'153,83,13': 16,'187,79,0': 22,'255,196,159': 24,
            '255,223,204': 25,'255,167,209': 26,'207,110,228': 27,'125,38,205': 45,'236,8,236': 28,'130,0,128': 29,'51,0,119': 46,'2,7,99': 31,
            '81,0,255': 30,'0,0,234': 32,'4,75,255': 33,'0,91,161': 47,'101,131,207': 34,'54,186,255': 35,'0,131,199': 36,'0,211,221': 37,
            '69,255,200': 38,'181,232,238': 48
        }
    }

    async Init(): Promise<void> {
        return new Promise<void>(async (resolve, _reject) => {
            const dimensions = await this.getDimensions();

            this.canvasWidth = dimensions.width;
            this.canvasHeight = dimensions.height;
    
            this.pixelData = ndarray(new Uint16Array(this.canvasWidth * this.canvasHeight).fill(-1), [this.canvasWidth, this.canvasHeight]);
            if(this.pixelPreData) {
                await Promise.all(this.pixelPreData.map(preData => {
                    this.loadCanvasData(preData);
                }));
                this.pixelPreData = [];
            }
            canvases.set(this.boardId, this);
            resolve();
        });
    }

    getClosestColorId(rgb: IRGBColor): number {
        const { r, g, b } = rgb;

        let minDistance = Infinity;
        let closestColorId = -1;
    
        for (let color in this.colors) {
            const [r2, g2, b2] = color.split(',').map(Number);
            const distance = Math.sqrt(Math.pow(r - r2, 2) + Math.pow(g - g2, 2) + Math.pow(b - b2, 2));
    
            if (distance < minDistance) {
                minDistance = distance;
                closestColorId = this.colors[color];
            }
        }
    
        return closestColorId;
    }

    getColorId(rgb: IRGBColor): number {
        const { r, g, b } = rgb;
        return this.colors[`${r},${g},${b}`] != null ? this.colors[`${r},${g},${b}`] : -1;
    }

    async loadCanvasPicture(): Promise<void> {
        return new Promise<void>((resolve, _reject) => {
            const imageUrl = `https://pixelplace.io/canvas/${this.boardId}.png?t200000=${Date.now()}`;

            https.get(imageUrl, (response: IncomingMessage) => {
                const chunks: Buffer[] = [];

                response
                    .on('data', (chunk: Buffer) => {
                        chunks.push(chunk);
                    })
                    .on('end', () => {
                        const buffer = Buffer.concat(chunks);

                        getPixels(buffer, 'image/png', (err: Error | null, pixels: NdArray<Uint8Array>) => {
                            if (err) {
                                console.error(err);
                                return;
                            }

                            for (let x = 0; x < pixels.shape[0]; x++) {
                                for (let y = 0; y < pixels.shape[1]; y++) {
                                    const r = pixels.get(x, y, 0);
                                    const g = pixels.get(x, y, 1);
                                    const b = pixels.get(x, y, 2);
                                    if(!(r == 204 && g == 204 && b == 204)) {
                                        const colId = this.getColorId({r,g,b});
                                        if(colId == -1) {
                                            console.log("ERR:",r,g,b);
                                        } else {
                                            this.pixelData?.set(x, y, colId);
                                        }
                                    } else {
                                        this.pixelData?.set(x, y, -1);
                                    }
                                }
                            }
                            resolve();
                        });
                    })
                    .on('error', (error: Error) => {
                        console.error(error);
                    });
            });
        });
    }

    loadCanvasData(pixels: number[][]): void {
        if(this.pixelData == undefined) {
            if(this.pixelPreData == undefined) this.pixelPreData = [];
            this.pixelPreData.push(pixels);
        } else {
            pixels.forEach(pixel => {
                const [x, y, col] = pixel;
                this.pixelData.set(x, y, col);
            });
        }
    }

    async getDimensions(): Promise<{ [key: string]: number }> {
        const res: Response = await fetch(`https://pixelplace.io/api/get-painting.php?id=${this.boardId}&connected=1`, {
            headers: {
              "accept": "application/json",
              "x-requested-with": "XMLHttpRequest",
              "Referer": "https://pixelplace.io/7-pixels-world-war",
            },
            method: "GET"
        });
          
      
        const json = await res.json();
        const width = json.painting.width as number;
        const height = json.painting.height as number;
      
        return { width, height };
    }
      
}