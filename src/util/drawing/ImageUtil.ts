import Jimp from "jimp";
import { ImagePixels } from "./ImageDrawer";
import fs from 'fs';
import { PixelSetData } from "../data/Data";
import mime = require("mime-types");
import { NetUtil } from "../NetUtil";
import { HeadersFunc } from "../../PixelPlace";
import { EffectFunction, FilterFunction } from "./ImageEffects";

export class ImageUtil {
    static applyJimp(width: number, height: number, filter: FilterFunction, effect: EffectFunction, data: PixelSetData, err: Error | null, img: Jimp): [width: number, height: number] {
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

        data.pixels = filter(img, effect);

        return [data.width, data.height];
    }

    static async getPixelData(width: number, height: number, filter: FilterFunction, effect: EffectFunction, headers: HeadersFunc,
                              boardId: number, path?: string, url?: string, pixels?: ImagePixels): Promise<PixelSetData> {
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
                    const [w,h] = this.applyJimp(width, height, filter, effect, data, err, img);
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

            const [w,h] = this.applyJimp(width, height, filter, effect, data, null, img);
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