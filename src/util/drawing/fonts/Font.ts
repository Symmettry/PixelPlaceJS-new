export interface FontData {
    height: number;
    characters: Record<string, number[]>;
}

// converts a string into a letter array. this is easier than 
function parseLetters(string: string): FontData {
    const [ height, characterString ] = string.split("||");
    const chars = characterString.split(" ");
    const arr: Record<string, number[]> = {};
    for(const char of chars) {
        const split = char.split("");
        const title: string | undefined = split.shift();
        if(title == undefined) continue;
        arr[title] = split.map(Number);
    }
    return {
        height: parseInt(height),
        characters: arr,
    };
}

export const fontData: FontData[] = [

    // Font: SMALL_FONT
    parseLetters(`5||a111101111101101 b111101110101111 c011100100100011 d110101101101110 e111100110100111 f111100110100100 g011100101101011 h101101111101101 i111010010010111 j111001001101010 k101101110101101 l100100100100111 m1000111011101011000110001 n10011101101110011001 o010101101101010 p111101111100100 q0111010001100011001001101 r111101110101101 s011100010001110 t111010010010010 u101101101101111 v101101101101010 w1000110001101011101110001 x101101010101101 y101101010010010 z111001010100111 .00001 ,00011 :01010 ;01011 !11101 ?111001111000100 -000000111000000 +000010111010000 =000111000111000 _000000000000111 |11111 /00001000100010001000010000 <0001100100 >0010011000 @1111100001111011010111111 #0101011111010101111101010 %1000100010001000100010001 ^010101000000000 *000101010101000 (0110101001 )1001010110 '11000 "101101000000000 0111101101101111 1010110010010111 2111001111100111 3111001111001111 4101101111001001 5111100111001111 6111100111101111 7111001001001001 8111101111101111 9111101111001111`),

];

export enum Font {

    /** Letters between size 3x5, 4x5, and 5x5. The size of any given letter is gotten with letter.length / 5 */
    SMALL_FONT = 0,

}