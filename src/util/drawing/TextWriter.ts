import { Bot } from "../../bot/Bot";
import { constant } from "../Constant";
import { Color } from "../data/Color";
import { Font, FontData, fontData } from "./fonts/Font";

/** Builds a text drawing. This is here due to too many options existing. */
export class TextBuilder {

    _text!: string;

    startX!: number;

    _x!: number;
    _y!: number;

    protect!: boolean;
    wars!: boolean;
    force!: boolean;

    _textColor: number = Color.BLACK;
    _backgroundColor: number = -1;
    _colorEmpty: boolean = false;
    
    _spaceLength: number = 1;
    _separatorLength: number = 1;
    _lineGap: number = 1;

    _font: Font | FontData = Font.SMALL_FONT;

    _fillBetween: boolean = false;

    private bot!: Bot;

    /**
     * Draws the text.
     * @param updatePos Sets the x and y position of the builder to the end position so that more text can be strung together.
     * @returns The x position 1 separator length away from the end of the text.
     */
    async draw(updatePos: boolean = false): Promise<TextBuilder> {
        this.bot.stats.text.drawing++;

        const endPos = await new TextWriter(this.bot, this._text, this._x, this._y,
            this._textColor, this._backgroundColor, this._colorEmpty,
            this._spaceLength, this._separatorLength, this._lineGap,
            this._font, this._fillBetween,
            this.protect, this.wars, this.force).begin();

        if(updatePos) {
            if(endPos[1] != this._y) {
                this.x(this.startX);
            } else {
                this.x(endPos[0]);
            }
            this.y(endPos[1]);
        }

        this.bot.stats.text.drawing--;
        this.bot.stats.text.finished++;

        return this;
    }

    /** When chaining .draw()'s, the gaps will not be filled. This makes it so it will fill the gap between text. */
    fillBetween(bool: boolean): TextBuilder {
        this._fillBetween = bool;
        return this;
    }

    /** Sets the text. Set in constructor, but here just if you want to modify later. */
    text(text: string): TextBuilder {
        this._text = text;
        return this;
    }

    /** Sets the x position of the text. Set in constructor, but here just if you want to modify later. */
    x(num: number): TextBuilder {
        this._x = num;
        return this;
    }

    /** Sets the y position of the text. Set in constructor, but here just if you want to modify later. */
    y(num: number): TextBuilder {
        this._y = num;
        return this;
    }

    /** The color of text. It will default to black. */
    textColor(num: number): TextBuilder {
        this._textColor = num;
        return this;
    }
    /** The background color of text. It will default to -1; which means it won't override the background with any color. */
    backgroundColor(num: number): TextBuilder {
        this._backgroundColor = num;
        return this;
    }

    /** If space between lines & characters, along with the emptiness in spaces should be filled in with the background color. */
    colorEmpty(bool: boolean): TextBuilder {
        this._colorEmpty = bool;
        return this;
    }

    /** The distance for a space. Defaults to 1. Note: This does not include separator length, and it counts as a character, so 1 will have a space of 3 on separator length 1. */
    spaceLength(num: number): TextBuilder {
        this._spaceLength = num;
        return this;
    }
    /** Space between characters. Defaults to 1. */
    separatorLength(num: number): TextBuilder {
        this._separatorLength = num;
        return this;
    }
    /** Space between each line. Defaults to 1. */
    lineGap(num: number): TextBuilder {
        this._lineGap = num;
        return this;
    }

    /**
     * The font to use. Defaults to Font.SMALL_FONT.
     * @param font It can either by Font.<FONT> or you can create your own.
     */
    font(font: Font | FontData): TextBuilder {
        this._font = font;
        return this;
    }

    /**
     * Creates a builder for a text drawing. After adding the options, add .draw() to the end.
     * @param bot The bot to draw with.
     * @param text The text to draw.
     * @param x The top-left x position to draw at.
     * @param y The top-left y position to draw at.
     * @param protect If the bot should protect the drawn pixels.
     * @param wars If the bot should place pixels in war.
     * @param force If the bot should place pixels of the same color over the same color.
     */
    constructor(bot: Bot, text: string, x: number, y: number, protect: boolean, wars: boolean, force: boolean) {
        constant(this, 'bot', bot);

        this.text(text).x(x).y(y);

        constant(this, 'startX', x);

        constant(this, 'protect', protect);
        constant(this, 'wars', wars);
        constant(this, 'force', force);
    }

}

export class TextWriter {

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

    private textColor!: number;
    private backgroundColor!: number;

    private colorEmpty!: boolean;

    private spaceLength!: number;
    private separatorLength!: number;
    private lineGap!: number;

    private lines: string[];
    private lineIndex: number = 0;

    private data!: FontData;

    private fillBetween!: boolean;

    private protect!: boolean;
    private wars!: boolean;
    private force!: boolean;

    private bot!: Bot;

    constructor(bot: Bot, text: string, x: number, y: number,
        textColor: number, backgroundColor: number, colorEmpty: boolean,
        spaceLength: number, separatorLength: number, lineGap: number,
        font: Font | FontData, fillBetween: boolean,
        protect: boolean, wars: boolean, force: boolean) {

        constant(this, 'bot', bot);

        // tab = 4 spaces
        // ignore carriage return
        text = text.replace(/\t/g, "    ").replace(/\r/g, "");

        constant(this, 'text', text);

        this.lines = text.split("\n");

        constant(this, 'x', x);
        constant(this, 'y', y);

        this.placeX = this.x;
        this.placeY = this.y;

        constant(this, 'textColor', textColor);
        constant(this, 'backgroundColor', backgroundColor);

        constant(this, 'colorEmpty', colorEmpty);

        constant(this, 'spaceLength', spaceLength);
        constant(this, 'separatorLength', separatorLength);
        constant(this, 'lineGap', lineGap);

        constant(this, "data", font instanceof Object && font.characters && font.height ? font : typeof font == 'number' ? fontData[font] : undefined);

        constant(this, "fillBetween", fillBetween);

        constant(this, 'protect', protect);
        constant(this, 'wars', wars);
        constant(this, 'force', force);
    }

    generateSpacePixels(): number[][] {
        if(!this.colorEmpty) return [];

        return Array.from({ length: this.data.height * this.spaceLength },
            (_, index) => [this.placeX + Math.floor(index/this.data.height), this.placeY + (index % this.data.height), this.backgroundColor]);
    }

    generateNewlinePixels(): number[][] {
        if(!this.colorEmpty) return [];
        const thisLineLength = TextWriter.getPointsLength(this.lines[this.lineIndex], this.spaceLength, this.separatorLength)
        const lastLineLength = TextWriter.getPointsLength(this.lines[this.lineIndex - 1], this.spaceLength, this.separatorLength);
        const length = Math.min(thisLineLength, lastLineLength);
        return Array.from({ length: length * this.lineGap },
            (_, index) => [this.placeX + (index % length), this.placeY - this.lineGap + Math.floor(index / length), this.backgroundColor]);
    }

    getCharData(point: string): [length: number, pixels: number[][]] {
        if(point == " ") return [this.spaceLength, this.generateSpacePixels()];
        if(point == "\n") {
            this.lineIndex++;
            this.placeY += this.data.height + this.lineGap;
            this.placeX = this.x;
            return [-this.separatorLength, this.generateNewlinePixels()]; // move back by separator to negate effects
        }

        const positions = this.data.characters[point.toLowerCase()];
        if(positions == null) {
            console.log(`~~WARN~~ Pixelplacejs-new does not support the letter '${point}'! It will be skipped.`);
            return [0, []];
        }
        const length = positions.length / this.data.height;
        return [length, positions.map((pos, index) => [this.placeX + (index % length), this.placeY + Math.floor(index / length), pos ? this.textColor : this.backgroundColor])];
    }

    async begin(): Promise<[number, number]> {
        const points: string[] = this.text.split("");

        const processPoints = async () => {
            for(let i = 0; i < points.length; i++) {
                const point: string = points[i];
                const [length, pixels] = this.getCharData(point);
    
                for(const pixel of pixels) {
                    if(pixel[2] == -1) continue;
                    await this.bot.placePixel(pixel[0], pixel[1], pixel[2], 1, this.protect, this.wars, this.force);
                }
    
                this.placeX += length;
    
                if(this.colorEmpty && this.backgroundColor != -1 && this.separatorLength > 0 && (i != points.length - 1 || this.fillBetween) && point != "\n" && points[i + 1] != "\n") {
                    for(let i2 = 0; i2 < this.separatorLength; i2++) {
                        for(let i3 = 0; i3 < this.data.height; i3++) {
                            await this.bot.placePixel(this.placeX + i2, this.placeY + i3, this.backgroundColor, 1, this.protect, this.wars, this.force);
                        }
                    }
                }
    
                this.placeX += this.separatorLength;
            }
        };
    
        return new Promise<[number, number]>((resolve) => processPoints().then(() => resolve([this.placeX, this.placeY])));
    }

}