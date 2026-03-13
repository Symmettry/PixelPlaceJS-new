import { Color } from "../../data/Color";
import { TextData } from "./TextWriter";

export interface FontData {
    /** Name of the font; this is for caching */
    readonly name: string;
    /** Height of the font */
    readonly height: number;
    /** This will ignore case of the input letters and character record. Defaults to false in custom fonts. Is true on PPJS fonts. */
    readonly ignoreCase?: boolean;
    /** If all characters are the same length, you can enable this for optimization. */
    readonly monospace?: boolean;
    /** Map of characters to an array of numbers, this is 1 or 0 and it is a 1d array. it will be split every `height` values */
    readonly characters: Record<string, readonly number[]>;
}

// converts a string into a letter array. this is easier than 
function parseLetters(string: string): FontData {
    const [ name, height, characterString ] = string.split("||");
    const chars = characterString.split(" ");
    const arr: Record<string, number[]> = {};
    for(const char of chars) {
        const split = char.split("");
        const title: string | undefined = split.shift();
        if(title == undefined) continue;
        arr[title] = split.map(Number);
    }
    return {
        name,
        height: parseInt(height),
        monospace: false,
        ignoreCase: true,
        characters: arr,
    };
}

type BuiltInFont = "SMALL_FONT" | "MEDIUM_FONT" | "MINECRAFT_FONT";
/** The length of any given character is gotten with pixelArray.length / height */
export const Font: Record<BuiltInFont, FontData> = {
    /** Height 5. Characters between size 3x5, and 4x5 */
    SMALL_FONT: parseLetters(`small||5||a111101111101101 b111101110101111 c111100100100111 d110101101101110 e111100111100111 f111100110100100 g111100101101111 h101101111101101 i111010010010111 j111001001101010 k101101110101101 l100100100100111 m101111101101101 n111101101101101 o111101101101111 p111101111100100 q0111010001100011001001101 r111101110101101 s111100111001111 t111010010010010 u101101101101111 v101101101101010 w101101101111101 x101101010101101 y101101010010010 z111001010100111 .00001 ,00011 :01010 ;01011 !11101 ?111001111000100 -000000111000000 +000010111010000 =000111000111000 _000000000000111 |11111 /001010010010100 <0001100100 >0010011000 @1111100001111011010111111 #0101011111010101111101010 %1000100010001000100010001 ^010101000000000 *000101010101000 (0110101001 )1001010110 '11000 "101101000000000 0111101101101111 1010110010010111 2111001111100111 3111001111001111 4101101111001001 5111100111001111 6111100111101111 7111001001001001 8111101111101111 9111101111001111`),
    /** Height 6. Characters between size 3x6, 4x6, and 5x6. */
    MEDIUM_FONT: parseLetters(`medium||6||a111110011111100110011001 b111110011110100110011111 c011110001000100010000111 d111010011001100110011110 e111110001110100010001111 f111110001110100010001000 g111110001011100110011111 h100110011111100110011001 i111101100110011001101111 j111100100010001000101100 k100110101100110010101001 l100010001000100010001111 m100011101110101100011000110001 n100011100110101100111000110001 o111110011001100110011111 p111110011111100010001000 q111110011001100110101101 r111110011111110010101001 s111110001111000100011111 t111101100110011001100110 u100110011001100110010110 v100110011001100101100110 w100011000110001101011101110001 x100110010110011010011001 y100110011111011001100110 z111100010010010010001111 .000001 ,000011 :010010 ;010110 !111101 ?111001111100000100 -000000000111000000 +000000010111010000 =000000111000111000 _000000000000000111 |111111 /001001010010100100 <000001100100 >000010011000 @111110011011101110001111 #010101111101010010101111101010 %101001010010100101 ^010101000000000000 *000101010101000000 (011010101001 )100101010110 '110000 "101101000000000000 0111110011011110110011111 1010110010010010111 2011010010010010010001111 3111100011111000100011111 4100110011111000100010001 5111110001111000100011111 6111110001111100110011111 7111100010001000100010001 8111110011111100110011111 9111110011111000100011111`),
    /** Height 8: Minecraft font. */
    MINECRAFT_FONT: parseLetters(`Minecraft||8||00111010001100111010111001100010111000000 10010001100001000010000100001001111100000 20111010001000010011001000100011111100000 30111010001000010011000001100010111000000 40001100101010011000111111000010000100000 51111110000111100000100001100010111000000 60011001000100001111010001100010111000000 71111110001000010001000100001000010000000 80111010001100010111010001100010111000000 90111010001100010111100001000100110000000 a0000000000011100000101111100010111100000 b1000010000101101100110001100011111000000 c0000000000011101000110000100010111000000 d0000100001011011001110001100010111100000 e0000000000011101000111111100000111100000 f00110100111101000100010001000000 g0000000000011111000110001011110000111110 h1000010000101101100110001100011000100000 i10111110 j0000100000000010000100001100011000101110 k10001000100110101100101010010000 l1010101010100100 m0000000000110101010110101100011000100000 n0000000000111101000110001100011000100000 o0000000000011101000110001100010111000000 p0000000000101101100110001111101000010000 q0000000000011011001110001011110000100001 r0000000000101101100110000100001000000000 s0000000000011111000001110000011111000000 t010010111010010010001000 u0000000000100011000110001100010111100000 v0000000000100011000110001010100010000000 w0000000000100011000110101101010111100000 x0000000000100010101000100010101000100000 y0000000000100011000110001011110000111110 z0000000000111110001000100010001111100000 A0111010001111111000110001100011000100000 B1111010001111101000110001100011111000000 C0111010001100001000010000100010111000000 D1111010001100011000110001100011111000000 E1111110000111001000010000100001111100000 F1111110000111001000010000100001000000000 G0111110000100111000110001100010111000000 H1000110001111111000110001100011000100000 I111010010010010010111000 J0000100001000010000100001100010111000000 K1000110010111001001010001100011000100000 L1000010000100001000010000100001111100000 M1000111011101011000110001100011000100000 N1000111001101011001110001100011000100000 O0111010001100011000110001100010111000000 P1111010001111101000010000100001000000000 Q0111010001100011000110001100100110100000 R1111010001111101000110001100011000100000 S0111110000011100000100001100010111000000 T1111100100001000010000100001000010000000 U1000110001100011000110001100010111000000 V1000110001100011000101010010100010000000 W1000110001100011000110101110111000100000 X1000101010001000101010001100011000100000 Y1000101010001000010000100001000010000000 Z1111100001000100010001000100001111100000 -0000000000000001111100000000000000000000 _0000000000000000000000000000000000011111 +0000000100001001111100100001000000000000 =0000000000111110000000000111110000000000 [111100100100100100111000 ]111001001001001001111000 /0000100010000100010001000010001000000000 \\1000001000010000010000010000100000100000 |11111110 :00100010 ;00100011 '11000000 "101101000000000000000000 <00010010010010000100001000010000 >10000100001000010010010010000000 .00000010 ,00000011 ?0111010001000010001000100000000010000000 ~011001100110000000000000000000000000000000000000 !11111010 @000000011110100001101101101001101111100000011110 #0101001010111110101011111010100101000000 $0010001111100000111000001111100010000000 %1000110010000100010001000010011000100000 ^0010001010100010000000000000000000000000 &0010001010001000110110110100100110100000 *101010101000000000000000 (001010100100100010001000 )100010001001001010100000 {001010010100010010001000 }100010010001010010100000 \`1001000000000000`),
} as const;

type UncoloredSpot = [x: number, y: number];
type UncoloredSpotData = UncoloredSpot[];

export type Spot = [x: number, y: number, col: Color | -1];
export type SpotData = Spot[];

export interface CachedTextData<T extends FontData> {
    readonly characterLength: { [K in keyof T['characters']]: number };
    readonly characterSpotData: { [K in keyof T['characters']]: SpotData };
    getTextLength: (text: string) => number;
    getCharData: (text: TextData<T>, x: number, y: number) => TextPositions;
}

const textRegistry: {[key: string]: CachedTextData<any>} = {};

type TextPositions = [data: SpotData, endX: number, endY: number];

export function cacheText<FD extends FontData, T extends TextData<FD>>(textData: T): CachedTextData<T['font']> {
    const font: FD = textData.font;
    const key = `${font.name}|${textData.lineGap}|${textData.spaceLength}|${textData.separatorLength}`
    if(textRegistry[key]) return textRegistry[key];

    // creates a registry to be able to cache and effectively make text repeatedly

    const reg: any = { characterLength: {}, characterSpotData: {}, getTextLength: null, getNLPixels: null, getCharData: null };

    for (const char in font.characters) {
        const values = font.characters[char];
        if(values.length % font.height != 0) {
            throw new Error(`Invalid font data! Mismatch on '${char}': Has ${values.length} values for a height of ${font.height}, which makes invalid width ${values.length / font.height}`)
        }
        const len = reg.characterLength[char] = values.length / font.height;

        const coords: SpotData = reg.characterSpotData[char] = [];
        for(let i=0;i<font.height;i++) {
            for(let j=0;j<len;j++) {
                coords.push([j, i, values[i * len + j]]);
            }
        }
    }
    reg.characterLength[" "] = textData.spaceLength;

    if(font.monospace ?? false) {
        // if monospace, all will be equal, so just sample the first one
        const length: number = Object.values(reg.characterLength)[0] as number;
        reg.getTextLength = (str: string) => str.length * length + (str.length - 1) * textData.separatorLength;
    } else {
        reg.getTextLength = (str: string) => Array.from(str)
                .reduce((acc, cur) => acc + (cur == " " ? textData.spaceLength : reg.characterLength[cur]), 0)
                + (str.length - 1) * textData.separatorLength;
    }

    const box = (length: number, height: number): UncoloredSpotData =>
        Array.from({length: height}, (_, y) => y).map((y) => Array.from({ length }, (_, x) => [x, y]) as [number, number][]).flat();
    reg.characterSpotData[" "] = box(textData.spaceLength, font.height).map(([x, y]: number[]) => [x, y, 0]);
    const separator: UncoloredSpotData = box(textData.separatorLength, font.height);

    let lastData: null | [string, number, number, number, number, number] = null, save: null | TextPositions = null;

    reg.getCharData = (textData: TextData<FD>, x: number, y: number): TextPositions => {
        const text = textData.text;

        let shouldStore = false;
        if(lastData) {
            let [lt, lx, ly, bg, tc, fc] = lastData;
            if(lt == text && lx == x && ly == y && textData.backgroundColor == bg && textData.textColor == tc && textData.fillColor == fc) {
                if(save) return save;
                shouldStore = true;
            } else {
                save = null;
            }
        }

        const data: SpotData = [];

        const chars = Array.from(text.replace(/\r/g, ""));

        // ill put line lengths in this so that after it's over i can add the new line inbetweens efficiently
        let nlData: number[] = [];

        let lineLength = 0, ychange = 0;
        const apply = ([ox, oy]: number[], col: Color | -1): Spot => [x + ox + lineLength, y + oy + ychange, col];
        const applyChar = ([ox, oy, value]: Spot): Spot => apply([ox, oy], value == 1 ? textData.textColor : textData.backgroundColor);
        for(let i=0;i<chars.length;i++) {
            const c = chars[i];
            if(c == "\n") {
                nlData.push(lineLength);
                lineLength = 0;
                ychange += font.height + textData.lineGap;
                continue;
            }

            if(!reg.characterSpotData[c]) {
                console.warn(`Skipping character '${c}', not defined in font ${font.name}.`);
                continue;
            }

            const len = reg.characterLength[c];
            data.push(...reg.characterSpotData[c].map(applyChar));

            lineLength += len;
            if(chars[i + 1] == "\n") {
                continue;
            }
            if(i == chars.length - 1) {
                break;
            }
            
            data.push(...separator.map(n => apply(n, textData.fillColor)));
            lineLength += textData.separatorLength;
        }

        // cleanup
        nlData.push(lineLength);

        const endX = x + lineLength;
        const endY = y + ychange;

        // more than 1 line so there's more than 1 line of length
        if(nlData.length > 1) {
            lineLength = 0;
            ychange = font.height;
            for(let i=0;i<nlData.length - 1;i++) {
                const thisLine = nlData[i], nextLine = nlData[i + 1];
                const toAdd = Math.min(thisLine, nextLine);
                data.push(...box(toAdd, textData.lineGap).map(n => apply(n, textData.backgroundColor)));
                ychange += font.height + textData.lineGap;
            }
        }

        lastData = [text, x, y, textData.backgroundColor, textData.textColor, textData.fillColor];

        const pos: TextPositions = [data, endX, endY];

        if(shouldStore) {
            return save = pos;
        }

        return pos;
    };

    return textRegistry[key] = reg as CachedTextData<T['font']>;
}
