import Jimp from "jimp";
import { ImagePixels } from "./ImageDrawer";
import fs from 'fs';
import { PixelSetData } from "../data/Data";
import { Canvas } from "../canvas/Canvas";
import mime = require("mime-types");
import { NetUtil } from "../NetUtil";
import { HeadersFunc } from "../../PixelPlace";

export class ImageUtil {
    static applyJimp(width: number, height: number, data: PixelSetData, err: Error | null, img: Jimp): [width: number, height: number] {
        if (err) {
            throw err;
        }

        if (width > 0 && height > 0) {
            img = img.resize(width, height, Jimp.RESIZE_BILINEAR);
        } else if (width > 0) {
            img = img.resize(width, Jimp.AUTO, Jimp.RESIZE_BILINEAR);
        } else if (height > 0) {
            img = img.resize(Jimp.AUTO, height, Jimp.RESIZE_BILINEAR);
        }

        data.width = img.bitmap.width;
        data.height = img.bitmap.height;

        width = data.width;
        height = data.height;
        
        for (let x = 0; x < img.bitmap.width; x++) {
            data.pixels[x] = [];
            for (let y = 0; y < img.bitmap.height; y++) {
                const color = img.getPixelColor(x, y);
                const rgba = Jimp.intToRGBA(color);
                
                if (rgba.a === 0) continue;
                
                data.pixels[x][y] = Canvas.getClosestColorId(rgba);
            }
        }

        return [width, height];
    }

    static async getPixelData(width: number, height: number, headers: HeadersFunc, boardId: number,
                              path?: string, url?: string, pixels?: ImagePixels): Promise<PixelSetData> {
        const data: PixelSetData = { width, height, pixels: [] };
        if(path) {
            if (!fs.existsSync(path)) {
                throw new Error(`File does not exist at path: ${path}`);
            }
            const type = mime.lookup(path);
            if (!type || !type.startsWith('image/')) {
                throw new Error(`File at path: ${path} is not an image`);
            }

            await new Promise<void>((resolve) => {
                Jimp.read(path, (err, img) => {
                    const [w,h] = this.applyJimp(width, height, data, err, img);
                    data.width = w;
                    data.height = h;
                    resolve();
                });
            });
            return data;
        } else if (url) {
            try {
                new URL(url);
            } catch (err) {
                throw new Error(`Invalid URL: ${url}`);
            }

            const buffer = await NetUtil.getUrl(url, headers("outside", boardId));

            let img: Jimp;
            try {
                img = await Jimp.read(buffer);
            } catch (e) {
                throw e;
            }

            const [w,h] = this.applyJimp(width, height, data, null, img);
            data.width = w;
            data.height = h;

            return data;
        }
        if(pixels) {
            data.pixels = pixels;
            data.width = pixels.length;
            data.height = Math.max(...data.pixels.filter(n => n).map(n => n.length));
            return data;
        }
        throw new Error(`No input provided?`);
    }
}