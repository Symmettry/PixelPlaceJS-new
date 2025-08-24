import { ImagePixels } from "./ImageDrawer";
import fs from 'fs';
import { parseGIF, decompressFrames } from 'gifuct-js';
import { Bot } from "../../bot/Bot";
import { DrawingMode, Modes } from "../data/Modes";
import { IRGBColor, PixelFlags, PlaceResults } from "../data/Data";
import { NetUtil } from "../NetUtil";
import { populate } from "../FlagUtil";

export enum AnimationType {
    GIF,
    MULTIPLE_IMAGES,
}

type FrameCall<T> = (frame: number) => T;
type AnimationData<T> = T | FrameCall<T>;

type AnimationCoord = AnimationData<number>;
type AnimationMode = AnimationData<DrawingMode>;
type AnimationTimings = number[] | AnimationData<number>;

type PathAnimationData = {
    /** File path of the gif/folder */
    path: string;
    /** Timings between frames */
    timings?: AnimationTimings;
    /** Type of animation; gif/multiple images */
    type: AnimationType;
};
type UrlAnimationData = {
    /** Url of the gif */
    url: string;
    /** Timings between frames */
    timings?: AnimationTimings;
}
type SetAnimationData = {
    /** Animation data */
    frames: AnimationFrame[];
};

export type Animation = {
    /** Top left x it's drawn at */
    x: AnimationCoord;
    /** Top left y it's drawn at */
    y: AnimationCoord;
    /** Drawing mode; defaults to TO_CENTER */
    mode?: AnimationMode;
    /** Repeat times; -1 for forever */
    repeat?: number;
    /** Calls every frame */
    onFrame?: FrameCall<void>;
    /** Transparency; defaults to null. will turn this rgb color to empty (usually 0,0,0). */
    transparent: IRGBColor | null;
    /** Next frame wipes the last frame to be the pixel that used to be there */
    wipe: boolean;
} & (PathAnimationData | SetAnimationData | UrlAnimationData) & PixelFlags;

type PathAnimation = Animation & PathAnimationData;
type SetAnimation = Animation & SetAnimationData;
type UrlAnimation = Animation & UrlAnimationData;

export type AnimationFrame = [
    data: ImagePixels | string,
    time: AnimationData<number>,
];

export class AnimationDrawer {
    bot: Bot;
    x: AnimationCoord;
    y: AnimationCoord;
    mode: AnimationMode;
    onFrame?: FrameCall<void>;
    flags: PixelFlags;
    repeats: number;
    currentFrame: number = 0;
    stopped: boolean = false;

    // source info
    path?: string;
    url?: string;
    type?: AnimationType;
    frames?: AnimationFrame[]; // only for SetAnimation

    transparent: IRGBColor | null;
    wipe: boolean;

    getTimings!: (frame: number, def: number) => number;

    constructor(bot: Bot, animation: Animation) {
        this.bot = bot;
        this.x = animation.x;
        this.y = animation.y;
        this.mode = animation.mode ?? Modes.TO_CENTER;
        this.onFrame = animation.onFrame;
        this.flags = populate(animation);
        this.repeats = animation.repeat ?? 1;
        this.transparent = animation.transparent ?? null;
        this.wipe = animation.wipe ?? false;

        if (this.isSetAnimation(animation)) {
            this.frames = animation.frames;
        } else if (this.isPathAnimation(animation)) {
            this.path = animation.path;
            this.type = animation.type;
            this.setTimings(animation);
        } else if (this.isUrlAnimation(animation)) {
            this.url = animation.url;
            this.type = AnimationType.GIF;
            this.setTimings(animation);
        } else {
            throw new Error("Invalid animation data!");
        }
    }

    stop(): void {
        this.stopped = true;
    }

    private isFrameCall<T>(data: AnimationData<T>): data is FrameCall<T> {
        return typeof data === "function";
    }

    private get<T>(data: AnimationData<T>): T {
        return this.isFrameCall(data) ? data(this.currentFrame) : data;
    }

    private setTimings(animation: PathAnimation | UrlAnimation) {
        if (!animation.timings) {
            this.getTimings = (_, def) => def ?? 0;
            return;
        }
        if (typeof animation.timings === "number") {
            this.getTimings = () => animation.timings as number;
        } else if (Array.isArray(animation.timings)) {
            this.getTimings = (frame: number) => (animation.timings as number[])[frame];
        } else if (typeof animation.timings === "function") {
            this.getTimings = (frame, def) => (animation.timings as FrameCall<number>)(frame) ?? def;
        } else {
            throw new Error("Invalid timings type");
        }
    }

    private isSetAnimation(animation: Animation): animation is SetAnimation {
        return (animation as any).frames !== undefined;
    }

    private isPathAnimation(animation: Animation): animation is PathAnimation {
        return (animation as any).path !== undefined;
    }

    private isUrlAnimation(animation: Animation): animation is UrlAnimation {
        return (animation as any).url !== undefined;
    }

    private lastFrame: PlaceResults[][] = [];

    private merge(newRes: PlaceResults[][]) {
        for(let x=0;x<newRes.length;x++) {
            if(!newRes[x]) continue;
            if(!this.lastFrame[x]) this.lastFrame[x] = [];
            for(let y=0;y<newRes[x].length;y++) {
                if(!newRes[x][y]) continue;
                this.lastFrame[x][y] = newRes[x][y];
            }
        }
    }

    private async playFrame(pixels: string | ImagePixels, time: AnimationData<number>, frameIndex: number) {
        this.currentFrame = frameIndex;
        if (this.onFrame) this.onFrame(frameIndex);

        const img = { x: this.get(this.x), y: this.get(this.y), mode: this.get(this.mode),
            replace: this.wipe ? this.lastFrame : [], unprotect: true, transparent: this.transparent != null, ref: this.flags };

        if (typeof pixels === "string") {
            if (pixels.startsWith("http")) {
                this.merge(await this.bot.drawImage({...img, url: pixels}));
            } else {
                this.merge(await this.bot.drawImage({...img, path: pixels}));
            }
        } else {
            this.merge(await this.bot.drawImage({...img, pixels}));
        }
        await new Promise(resolve => setTimeout(resolve, this.get(time)));
    }

    private async playGifFromBuffer(buffer: ArrayBuffer) {
        const gif = parseGIF(buffer);
        const frames = decompressFrames(gif, true);

        for (let i = 0; i < frames.length; i++) {
            const frame = frames[i];

            const data: ImagePixels = [];
            for (let x = 0; x < frame.dims.width; x++) {
                const destX = frame.dims.left + x;
                data[destX] = [];

                for (let y = 0; y < frame.dims.height; y++) {
                    const destY = frame.dims.top + y;
                    const srcIndex = y * frame.dims.width + x;

                    const [pr, pg, pb] = frame.colorTable[frame.pixels[srcIndex]];
                    if(this.transparent) {
                        const {r,g,b} = this.transparent;
                        if(r == pr && g == pg && b == pb) {
                            data[destX][destY] = null;
                            continue;
                        }
                    }
                    data[destX][destY] = this.bot.getClosestColorId({ r: pr, g: pg, b: pb });
                }
            }

            await this.playFrame(data, this.getTimings(i, frame.delay), i);

            if (this.stopped) break;
        }
    }


    private async playGif() {
        let buffer: ArrayBuffer;
        if (this.path) {
            if (!fs.existsSync(this.path) || !this.path.endsWith(".gif")) {
                throw new Error(`Invalid GIF path: ${this.path}`);
            }
            buffer = fs.readFileSync(this.path) as unknown as ArrayBuffer;
        } else if (this.url) {
            buffer = await NetUtil.getUrl(this.url, this.bot.headers("outside", this.bot.boardId)) as unknown as ArrayBuffer;
        } else throw new Error("No GIF source");

        await this.playGifFromBuffer(buffer);
    }

    private async playFolder() {
        if (!this.path || !fs.existsSync(this.path) || !fs.statSync(this.path).isDirectory()) {
            throw new Error(`Invalid folder path: ${this.path}`);
        }
        const files = fs.readdirSync(this.path);

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const time = this.getTimings(i, 0);
            await this.playFrame(file, time, i);
            await new Promise(resolve => setTimeout(resolve, time));
            if (this.stopped) break;
        }
    }

    private async playSetAnimation() {
        if (!this.frames) return;
        for (let i = 0; i < this.frames.length; i++) {
            const [data, time] = this.frames[i];
            await this.playFrame(data, time, i);
            if (this.stopped) break;
        }
    }

    async draw() {
        if (this.repeats === -1) {
            setImmediate(async () => {
                while (!this.stopped) {
                    await this.drawOnce();
                }
            });
            return;
        }
        for (let i = 0; i < this.repeats; i++) {
            if (this.stopped) break;
            await this.drawOnce();
        }
    }

    private async drawOnce() {
        if (this.frames) {
            await this.playSetAnimation();
        } else if (this.type === AnimationType.GIF) {
            await this.playGif();
        } else {
            await this.playFolder();
        }
    }
}
