import { Bot } from "../../../bot/Bot";
import { DelegateMethod } from "ts-delegate";
import { Color } from "../../data/Color";
import { PixelFlags, PlaceResults } from "../../data/Data";
import { populate } from "../../FlagUtil";
import { CachedTextData, cacheText, Font, FontData, Spot } from "./Font";
import { confirm, orDefault } from "../../Helper";

export type TextData<T extends FontData> = {
    /** The text to write */
    text: string;
    /** The font the text is written in. Defaults to Font.SMALL_FONT. */
    font: T;

    /** X position of top left */
    x: number;
    /** Y position of top left */
    y: number;
    
    /** Color of the text. Defaults to black. */
    textColor: Color;
    /** Background color or -1 for transparent. Defaults to -1. */
    backgroundColor: Color | -1;
    /** Fill color between characters and lines or -1 for transparent. Defaults to -1. */
    fillColor: Color | -1;

    /** Length of space character. Defaults to 2. */
    spaceLength: number;
    /** Length between characters. Defaults to 1. */
    separatorLength: number;
    /** Length between lines. Defaults to 1. */
    lineGap: number;
} & PixelFlags;

export class TextWriter<T extends FontData> {
    
    /**
     * Draws text.
     * @param text Data for the text
     * @returns The ending position of the text.
     */
    @DelegateMethod(true)
    static async drawText(bot: Bot, text: TextData<any>): Promise<[number, number, PlaceResults[][]]> {
        return await new TextWriter(bot, text).begin();
    }

    /**
     * Gets a pixel length of text based on the text, space length, and separator length.
     * @param text The text to get length of.
     * @param spaceLength The size of spaces. Defaults to 1.
     * @param separatorLength The amount of pixels between each character. Defaults to 1.
     * @returns The size, in pixels, of the text.
     */
    static getTextLength(text: string, spaceLength: number = 1, separatorLength: number = 1, lineGap: number = 1, font: FontData = Font.SMALL_FONT) {
        return cacheText({ lineGap, spaceLength, separatorLength, font } as TextData<any>).getTextLength(text);
    }

    private data: CachedTextData<T>;
    private textData: TextData<T>;

    private x: number;
    private y: number;

    private bot: Bot;

    constructor(bot: Bot, uobj: TextData<T>) {

        const obj = populate(uobj);

        confirm(obj, 'text', `Missing text value when writing text!!`);
        confirm(obj, 'x', `Missing x value when writing text!!`);
        confirm(obj, 'y', `Missing y value when writing text!!`);

        const {text, x, y} = obj;

        const font = orDefault(obj, 'font', Font.SMALL_FONT);

        obj.backgroundColor ??= -1;
        obj.lineGap ??= 1;
        obj.fillColor ??= -1;
        obj.separatorLength ??= 1;
        obj.spaceLength ??= 2;
        obj.textColor ??= Color.BLACK;

        this.bot = bot;

        // tab = 4 spaces
        // ignore carriage return
        const t = text.replace(/\t/g, "    ").replace(/\r/g, "");
        obj.text = font.ignoreCase ? t.toLowerCase() : t;

        this.x = x;
        this.y = y;

        this.data = cacheText(obj);
        this.textData = obj;

        this.place = this.place.bind(this);
    }

    async place(x: number, y: number, col: Color): Promise<PlaceResults> {
        return await this.bot.placePixel({
            x, y, col,
            ref: this.textData,
        });
    }

    async begin(): Promise<[number, number, PlaceResults[][]]> {
        return new Promise<[number, number, PlaceResults[][]]>(async (resolve) => {
            const [data, ex, ey] = this.data.getCharData(this.textData, this.x, this.y);

            const results: PlaceResults[][] = [];
            for(const [x, y, col] of data) {
                if(col == -1) continue;
                results[x] ??= [];
                results[x][y] = await this.place(x, y, col);
            }

            resolve([ex, ey, results]);
        });
    }

}