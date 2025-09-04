import ndarray from 'ndarray';
import fs from 'fs';
import path from 'path';
import { BoardID, BoardTemplate } from '../data/Data';
import { Color } from '../data/Color';
import Jimp = require('jimp');
import { PixelPacket } from '../packets/PacketResponses';
import { HeadersFunc } from '../../PixelPlace';
import { NetUtil } from '../NetUtil';
import { ServerClient } from '../../browser/client/ServerClient';
import { DelegateField, DelegateMethod } from 'ts-delegate';

const canvases: Map<number, Canvas> = new Map();

export function getCanvas(boardId: BoardID, netUtil: NetUtil, headers: HeadersFunc): Canvas {
    const existing = canvases.get(boardId);
    if (existing) {
        existing.setHeaders(headers);
        return existing;
    }
    const canvas = new Canvas({type: 0, boardId, netUtil, headers});
    canvases.set(boardId, canvas);
    return canvas;
}

export function createFromClient(serverClient: ServerClient): Canvas {
    return new Canvas({type: 1, serverClient });
}

export function hasCanvas(boardId: BoardID): boolean {
    return canvases.has(boardId);
}

type ReqCanvas = {
    type: 0;
    boardId: number;
    netUtil: NetUtil;
    headers: HeadersFunc;
};
type ClientCanvas = {
    type: 1,
    serverClient: ServerClient,
}

// states so they arent magic numbers
enum CanvasState {
    UNLOADED,
    PACKET_LOADED,
    IMAGE_LOADED,
    FULLY_LOADED,
}

type RegionName = "Ocean" | "Antarctica" | "Coin Islands" | "Renkolandia" | "Premium Island" | "Russia" | "Greenland" | "South America"
                | "USA" | "Central America" | "Canada" | "Alaska" | "Australia" | "Africa" | "Europe" | "Turkey" | "Asia" | "0,0";
export type RegionData = {
    name: RegionName;
    canProtect: boolean;
    canBot: boolean;
}

const REGIONS: {[key: number]: RegionData} = {
  [-1]: {name: "0,0"            , canBot:  true, canProtect:  true},
     0: {name: "Ocean"          , canBot:  true, canProtect:  true},
     1: {name: "Antarctica"     , canBot:  true, canProtect:  true},
     2: {name: "Coin Islands"   , canBot:  true, canProtect:  true},
     3: {name: "Renkolandia"    , canBot:  true, canProtect:  true},
     4: {name: "Premium Island" , canBot:  true, canProtect:  true},
     5: {name: "Russia"         , canBot:  true, canProtect: false},
     6: {name: "Greenland"      , canBot:  true, canProtect: false},
     7: {name: "South America"  , canBot:  true, canProtect: false},
     8: {name: "USA"            , canBot: false, canProtect: false},
     9: {name: "Central America", canBot: false, canProtect: false},
    10: {name: "Canada"         , canBot: false, canProtect: false},
    11: {name: "Alaska"         , canBot: false, canProtect: false},
    12: {name: "Australia"      , canBot: false, canProtect: false},
    13: {name: "Africa"         , canBot: false, canProtect: false},
    14: {name: "Europe"         , canBot: false, canProtect: false},
    15: {name: "Turkey"         , canBot: false, canProtect: false},
    16: {name: "Asia"           , canBot: false, canProtect: false},
}

const MAX_CANVAS_SIZE = 3000;

/** 
 * Pixelplace canvas data.
 */
export class Canvas {

    private boardId: BoardID;

    private canvasState: CanvasState = CanvasState.UNLOADED;
    private canvasPacketData: PixelPacket = [];

    private delayedPixelPacketData: PixelPacket[] = [];

    private loadResolve: (() => void) | null = null;

    static rgbToColor: { [key: string]: Color } = {
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
        "152,251,152": Color.YELLOW_GREEN,
        "117,206,169": Color.PALE_GREEN,
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
    static colorToRgb: { [key: string]: [number, number, number] } = Object.entries(this.rgbToColor)
                                                  .reduce((c: any, [rgb, col]) => {
                                                        c[col] = rgb.split(",").map(parseFloat);
                                                        return c;
                                                    }, {});
    static colorToRgbInt: { [key: string]: number } = Object.entries(this.colorToRgb)
                                                  .reduce((c: any, [col, [r,g,b]]) => {
                                                        c[col] = Jimp.rgbaToInt(r,g,b,255);
                                                        return c;
                                                    }, {});


    private static validColorIds = Object.values(this.rgbToColor);

    pixelData!: ndarray.NdArray<Uint16Array>;

    /** Width of the current canvas */
    @DelegateField(true, false)
    canvasWidth: number = 0;
    /** Height of the current canvas */
    @DelegateField(true, false)
    canvasHeight: number = 0;

    headers!: HeadersFunc;
    netUtil!: NetUtil;

    serverClient: ServerClient | undefined;

    regionData: number[][] | null = null;

    boardTemplate!: BoardTemplate;

    constructor(data: ReqCanvas | ClientCanvas) {
        if(data.type == 0) {
            const { boardId, headers, netUtil } = data as ReqCanvas;
            this.boardId = boardId;
            this.headers = headers;
            this.netUtil = netUtil;

            // make a default array to store some changes;
            this.pixelData = this.createNDArray(MAX_CANVAS_SIZE, MAX_CANVAS_SIZE);

            // now start loading it asap
            this.loadCanvasPicture();
            return;
        }

        this.serverClient = (data as ClientCanvas).serverClient;
        const { boardID, canvasData, width, height, template } = this.serverClient;

        this.boardId = boardID;
        this.canvasWidth = width;
        this.canvasHeight = height;
        this.boardTemplate = template;
        if(this.boardTemplate == BoardTemplate.PIXEL_WORLD_WAR) {
            this.loadRegionData();
        }

        this.loadFromCanvasData(canvasData, width, height);
    }

    decodeVarInt(buffer: Buffer, start: number) {
        let result = 0, shift = 0, pos = start, flag = 0;
        while (true) {
            const byte = buffer[pos++];
            if (shift === 0) flag = byte & 1; // first bit is flag
            result |= ((byte & 0x7F) >> (shift === 0 ? 1 : 0)) << shift;
            shift += shift === 0 ? 7 - 1 : 7;
            if ((byte & 0x80) === 0) break;
        }
        return { value: result, flag, nextPos: pos };
    }

    // todo: fix some minor off pixels such as 652,1085
    loadRegionData() {
        const buffer = fs.readFileSync(path.join(__dirname, 'mapdata.bin')) as unknown as Buffer;

        const width = 2500;
        const height = 2088;

        this.regionData = Array.from({ length: width }, () => Array(height).fill(0));

        let i = 0, x = 0, y = 0;
        while (i < buffer.length) {
            const codeVar = this.decodeVarInt(buffer, i);
            const code = codeVar.value;
            i = codeVar.nextPos;

            const trackVar = this. decodeVarInt(buffer, i);
            const track = trackVar.value;
            i = trackVar.nextPos;

            for(let j=0;j<track;j++) {
                this.regionData[x] ??= [];
                this.regionData[x][y] = code;
                x++;
                if(x >= 2500) {
                    x = 0;
                    y++;
                }
            }
        }
        /** im a lazy fuck and i cant be bothered to edit the file */
        this.regionData[0][0] = -1;
    }

    /**
     * Gets the regional data for a pixel
     * 
     * This only works on canvas 7.
     * 
     * Region data has the name, botting status, and repairing status.
     */
    @DelegateMethod()
    getRegionAt(x: number, y: number): RegionData {
        if(this.boardTemplate != BoardTemplate.PIXEL_WORLD_WAR || this.regionData == null)
            throw new Error(`Region data is only readable on world war canvases.`);

        if(x > 2500 || x < 0) throw new Error(`Invalid x coordinate: ${x}`);
        if(y > 2088 || y < 0) throw new Error(`Invalid y coordinate: ${y}`);
        if(this.pixelData.get(x, y) == Color.OCEAN) return REGIONS[0];
        return REGIONS[this.regionData[x][y]];
    }

    loadFromCanvasData(canvasData: number[], width: number, height: number) {
        this.pixelData = this.createNDArray(width, height);

        for(let i=0;i<canvasData.length;i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            this.pixelData.set(x, y, canvasData[i]);
        }

        this.setCanvasState(CanvasState.FULLY_LOADED);
    }

    setPixelData(x: number, y: number, r: number, g: number, b: number, a: number): void {
        if (a === 0) r = g = b = 255;

        if (r === 204 && g === 204 && b === 204) {
            this.pixelData?.set(x, y, Color.OCEAN);
            return;
        }

        const colId = Canvas.getColorId(r, g, b);
        if (colId !== Color.OCEAN) {
            this.pixelData?.set(x, y, colId);
        }
    }

    finishCanvas() {
        if (this.canvasState === CanvasState.PACKET_LOADED) {
            this.loadCanvasData(this.canvasPacketData);
        }
        this.setCanvasState(CanvasState.IMAGE_LOADED)

        for (const pixels of this.delayedPixelPacketData) {
            this.loadPixels(pixels);
        }

        this.delayedPixelPacketData = [];
    }

    private createNDArray(width: number, height: number): ndarray.NdArray<Uint16Array> {
        // Pixelplace canvases are always going to be white. The canvas image will not be the full size when no pixels are placed, so it's filled with white normally.
        // Any ocean pixel will be set there when the canvas is loaded, so this causes no issues.
        return ndarray(new Uint16Array(width * height).fill(Color.WHITE), [width, height]);
    }

    async fetchCanvasData(): Promise<[userID: number, uidManager: boolean, username: string]> {
        if(this.serverClient) {
            return Promise.resolve([this.serverClient.userID, this.serverClient.uidManager, this.serverClient.username]);
        }
        return new Promise<[number, boolean, string]>((resolve, reject) => {
            this.netUtil.getPaintingData(this.boardId).then(data => {
                if(data == null) {
                    reject();
                    return;
                }

                this.canvasWidth = data.painting.width;
                this.canvasHeight = data.painting.height;

                this.boardTemplate = data.painting.template as BoardTemplate;
                if(this.boardTemplate == BoardTemplate.PIXEL_WORLD_WAR) {
                    this.loadRegionData();
                }
    
                // this is dumb but it's whatever
                const newArray = this.createNDArray(this.canvasWidth, this.canvasHeight);
                for(let x=0;x<this.canvasWidth;x++) for(let y=0;y<this.canvasHeight;y++) newArray.set(x, y, this.pixelData.get(x, y));
                this.pixelData = newArray;

                canvases.set(this.boardId, this);

                resolve([data.user.id, data.user.premium.active, data.user.name]);
            }).catch(reject);
        });
    }

    /**
     * Gets the closest color to an r,g,b value
     * @param r red value
     * @param g green value
     * @param b blue value
     * @param a alpha can be included for spread, but it does nothing
     * @returns The closest color to rgb
     */
    @DelegateMethod()
    static getClosestColorId(r: number, g: number, b: number, _?: number): Color | null {
        const strKey = `${r},${g},${b}`;
        if(this.rgbToColor.hasOwnProperty(strKey)) return this.rgbToColor[strKey];

        let minDistance = Infinity;
        let closestColorId = Color.OCEAN;
    
        for (const [r2, g2, b2] of Object.values(this.colorToRgb)) {
            const distance = Math.hypot(r - r2, g - g2, b - b2);
    
            if (distance >= minDistance) continue;

            minDistance = distance;
            closestColorId = this.rgbToColor[`${r2},${g2},${b2}`];
        }
    
        return closestColorId == Color.OCEAN ? null : closestColorId;
    }

    private static getColorId(r: number, g: number, b: number): Color {
        return this.rgbToColor[`${r},${g},${b}`] ?? this.getClosestColorId(r,g,b) ?? Color.OCEAN;
    }

    async loadCanvasPicture(): Promise<void> {
        const imageUrl = `https://pixelplace.io/canvas/${this.boardId}.png?t200000=${Date.now()}`;
        const buffer = await NetUtil.getUrl(imageUrl, this.headers("canvas-image", this.boardId));

        let img: Jimp;
        try {
            img = await Jimp.read(buffer);
        } catch (err) {
            console.error(err);
            console.log("error!! is cloudflare on? do you have cf clearance set?");
            process.exit();
        }

        for (let x = 0; x < img.bitmap.width; x++) {
            for (let y = 0; y < img.bitmap.height; y++) {
                const color = img.getPixelColor(x, y);
                const rgba = Jimp.intToRGBA(color);
                let { r, g, b, a } = rgba;

                this.setPixelData(x, y, r, g, b, a);
            }
        }

        this.finishCanvas();
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
        for(const [x, y, col] of pixels) {
            this.pixelData.set(x, y, col);
        }
    }

    /**
     * @returns Pixelplace color list.
     */ 
    static getColors(): { [key: string]: Color; } {
        return this.rgbToColor;
    }

    /**
     * @param col A color id.
     * @returns If it's a valid color or not.
     */
    @DelegateMethod()
    static isValidColor(col: unknown): boolean {
        // non-numbers like null will be ignored fully.
        return typeof col == 'number' && (this.validColorIds.includes(col) || col == Color.OCEAN);
    }
    
    /**
     * Reassigns headers function.
     * @param headers The headers function.
     */
    setHeaders(headers: HeadersFunc) {
        this.headers = headers;
    }

    private OCEAN_RGBINT: number = Jimp.rgbaToInt(204,204,204,255);
    private TRANSPARENT_RGBINT: number = Jimp.rgbaToInt(0,0,0,0);

    async createImage(path?: string, transparent?: boolean): Promise<Jimp> {
        const image = new Jimp(this.canvasWidth, this.canvasHeight);

        const oceanCol = transparent ? this.TRANSPARENT_RGBINT : this.OCEAN_RGBINT;
        for (let y = 0; y < this.canvasHeight; y++) {
            for (let x = 0; x < this.canvasWidth; x++) {
                const value = this.pixelData.get(x, y);
                image.setPixelColor(value == Color.OCEAN ? oceanCol : Canvas.colorToRgbInt[value], x, y);
            }
        }

        if(path) await image.writeAsync(path);

        return image;
    }

    /**
     * Gets a random color
     */
    @DelegateMethod()
    static getRandomColor(): Color {
        const v: Color[] = Object.values(this.rgbToColor);
        return v[Math.floor(Math.random() * v.length)];
    }

    /**
     * @returns if an x,y is on the canvas
     */
    @DelegateMethod()
    isValidPosition(x: number, y: number) {
        return x >= 0 && y >= 0 && x < this.canvasWidth && y < this.canvasHeight;
    }

    /**
     * Gets the color of the pixel at x,y coordinates.
     * @param x The x coordinate of the pixel.
     * @param y The y coordinate of the pixel.
     * @returns The color of the pixel at x,y.
     */
    @DelegateMethod()
    getPixelAt(x: number, y: number): Color | undefined {
        return this.pixelData?.get(x, y);
    }

    /**
     * Returns the canvas data
     */
    @DelegateMethod()
    getCanvasData() {
        return this.pixelData;
    }

    @DelegateMethod()
    getColorIds() {
        return Object.keys(Canvas.colorToRgb);
    }

}
