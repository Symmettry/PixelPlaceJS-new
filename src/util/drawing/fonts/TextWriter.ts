import { Bot } from "../../../bot/Bot";
import { DelegateMethod } from "ts-delegate";
import { constant } from '../../Constant';
import { Color } from "../../data/Color";
import { BrushTypes, PixelFlags, QueueSide } from "../../data/Data";
import { populate } from "../../FlagUtil";
import { Font, FontData, fontData } from "./Font";

export type TextData = {
    /** The text to write */
    text: string;
    /** The font the text is written in. Defaults to Font.SMALL_FONT. */
    font: Font | FontData;

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

type SpotData = [
    x: number,
    y: number,
    color: Color | -1,
][];

export class TextWriter {
    
    /**
     * Draws text.
     * @param text Data for the text
     * @returns The ending position of the text.
     */
    @DelegateMethod(true)
    static async drawText(bot: Bot, text: TextData): Promise<[number, number]> {
        return await new TextWriter(bot, text).begin();
    }

    /**
     * Gets a pixel length of text based on the text, space length, and separator length.
     * @param text The text to get length of.
     * @param spaceLength The size of spaces. Defaults to 1.
     * @param separatorLength The amount of pixels between each character. Defaults to 1.
     * @returns The size, in pixels, of the text.
     */
    static getTextLength(text: string, spaceLength: number = 1, separatorLength: number = 1, font: Font = Font.SMALL_FONT) {
        return this.getPointsLength(text, spaceLength, separatorLength, font);
    }
    
    /**
     * Gets the text length of a list of text points, space length, and separator length.
     * @param text A list of text points.
     * @param spaceLength The size of spaces. Defaults to 1.
     * @param separatorLength The amount of pixels between each character. Defaults to 1.
     * @returns 
     */
    static getPointsLength(text: string, spaceLength: number = 1, separatorLength: number = 1, font: Font = Font.SMALL_FONT): number {
        const data = fontData[font];
        return text.split("").reduce((accum, cur, index, arr) => {
            const len = index == arr.length - 1 ? 0 : separatorLength;
            if(cur == " ") {
                return accum + spaceLength + len;
            }
            const letter = data.characters[cur.toLowerCase()];
            if(letter == null) {
                return accum + len;
            }
            return accum + letter.length/data.height + len;
        }, 0);
    }
    
    private text!: string;

    private x!: number;
    private y!: number;

    private placeX: number;
    private placeY: number;

    private textColor!: Color;
    private backgroundColor!: Color | -1;
    private fillColor!: Color | -1;

    private spaceLength!: number;
    private separatorLength!: number;
    private lineGap!: number;

    private lines: string[];
    private lineIndex: number = 0;

    private data!: FontData;

    private protect!: boolean;
    private wars!: boolean;
    private force!: boolean;

    private brush!: BrushTypes;
    private side!: QueueSide;

    private bot!: Bot;

    constructor(bot: Bot, obj: TextData) {

        const { text, font, x, y, textColor, backgroundColor, fillColor, spaceLength, separatorLength, lineGap, protect, wars, force, brush, side }
            = populate(obj);

        constant(this, 'bot', bot);

        const fd = font instanceof Object && font.characters && font.height ? font : typeof font == 'number' ? fontData[font] : fontData[Font.SMALL_FONT];

        fd.ignoreCase ??= false;
        if(fd.ignoreCase) {
            Object.keys(fd.characters).forEach(k => fd.characters[k.toLowerCase()] = fd.characters[k]);
        }

        // tab = 4 spaces
        // ignore carriage return
        const t = text.replace(/\t/g, "    ").replace(/\r/g, "");
        constant(this, 'text', fd.ignoreCase ? t.toLowerCase() : t);

        this.lines = this.text.split("\n");

        constant(this, 'x', x);
        constant(this, 'y', y);

        this.placeX = this.x;
        this.placeY = this.y;

        constant(this, 'textColor', textColor ?? Color.BLACK);
        constant(this, 'backgroundColor', backgroundColor ?? -1);
        constant(this, "fillColor", fillColor ?? -1);

        constant(this, 'spaceLength', spaceLength ?? 1);
        constant(this, 'separatorLength', separatorLength ?? 1);
        constant(this, 'lineGap', lineGap ?? 1);

        constant(this, "data", fd);

        constant(this, 'protect', protect ?? false);
        constant(this, 'wars', wars ?? false);
        constant(this, 'force', force ?? false);
        
        constant(this, 'brush', brush ?? BrushTypes.NORMAL);
        constant(this, 'side', side ?? QueueSide.BACK);
    }

    generateSpacePixels(): SpotData {
        if(this.backgroundColor == -1) return [];

        return Array.from({ length: this.data.height * this.spaceLength },
            (_, index) => [this.placeX + Math.floor(index/this.data.height), this.placeY + (index % this.data.height), this.backgroundColor]);
    }

    generateNewlinePixels(): SpotData {
        if(this.fillColor == -1) return [];
        
        const thisLineLength = TextWriter.getPointsLength(this.lines[this.lineIndex], this.spaceLength, this.separatorLength)
        const lastLineLength = TextWriter.getPointsLength(this.lines[this.lineIndex - 1], this.spaceLength, this.separatorLength);
        const length = Math.min(thisLineLength, lastLineLength);
        return Array.from({ length: length * this.lineGap },
            (_, index) => [this.placeX + (index % length), this.placeY - this.lineGap + Math.floor(index / length), this.fillColor]);
    }

    getCharData(point: string): [length: number, pixels: SpotData] {
        if(point == " ") return [this.spaceLength, this.generateSpacePixels()];
        if(point == "\n") {
            this.lineIndex++;
            this.placeY += this.data.height + this.lineGap;
            this.placeX = this.x;
            return [-this.separatorLength, this.generateNewlinePixels()]; // move back by separator to negate effects
        }

        const positions = this.data.characters[point];
        if(positions == null) {
            console.log(`~~WARN~~ The used font does not support the letter '${point}'! It will be skipped.`);
            return [0, []];
        }
        const length = positions.length / this.data.height;
        return [length, positions.map((pos, index) => [this.placeX + (index % length), this.placeY + Math.floor(index / length), pos ? this.textColor : this.backgroundColor])];
    }

    async place(x: number, y: number, col: Color): Promise<void> {
        await this.bot.placePixel({
            x, y, col,
            protect: this.protect,
            wars: this.wars,
            force: this.force,
            brush: this.brush,
            side: this.side,
        });
    }

    async begin(): Promise<[number, number]> {
        const points: string[] = this.text.split("");

        const processPoints = async () => {
            for(let i = 0; i < points.length; i++) {
                const point: string = points[i];
                const [length, pixels] = this.getCharData(point);
    
                for(const [x, y, col] of pixels) {
                    if(col == -1) continue;
                    await this.place(x, y, col);
                }
    
                this.placeX += length;
    
                if(this.backgroundColor != -1 && this.separatorLength > 0 && (i != points.length - 1 || this.fillColor != -1) && point != "\n" && points[i + 1] != "\n") {
                    for(let i2 = 0; i2 < this.separatorLength; i2++) {
                        for(let i3 = 0; i3 < this.data.height; i3++) {
                            await this.place(this.placeX + i2, this.placeY + i3, this.backgroundColor);
                        }
                    }
                }
    
                this.placeX += this.separatorLength;
            }
        };
    
        return new Promise<[number, number]>((resolve) => processPoints().then(() => resolve([this.placeX, this.placeY])));
    }

}