// pingalive code recreated through deobfuscating pixelplace code

function randomString2(num: number) {
    const arr = [];
    const charList = 'gmbonjklezcfxta1234567890GMBONJKLEZCFXTA';
    for (let i = 0; i < num; i++) {
        arr.push(charList.charAt(Math.floor(Math.random() * charList.length)));
    }
    return arr.join('');
}
function randomString1(num: number) {
    const arr = [];
    const charList = 'abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let i = 0; i < num; i++) {
        arr.push(charList.charAt(Math.floor(Math.random() * charList.length)));
    }
    return arr.join('');
}

function randInt(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/*export async function fetchPaliveNumber(): Promise<number> {
    const script = await fetch("https://pixelplace.io/js/script.min.js?v3=84310");
    const text = await script.text();
    try { 
        const matches = text.match(/=[a-zA-Z]\+[a-zA-Z]\(/g);
        if(matches == null) throw "";

        let lastMatch = "";
        let thinkLetter = "";
        for(const match of matches) {
            const letter = match.substring(1, 2);
            if(lastMatch != "" && lastMatch == letter) {
            thinkLetter = letter;
            break;
            }
            lastMatch = letter;
        }
        const match = text.match(new RegExp(`${thinkLetter}=[0-9xbc\\+\\-\\*\\/]+,`));
        if(match == null) throw "";

        const paliveNumber = match[0];
        return eval(paliveNumber.substring(2, paliveNumber.length - 1));
    } catch(err) {
        throw new Error("An error occured whilst getting ping.alive! Contact Symmettry.");
    }
}*/

const paliveCharmap: {[key: string]: string} = {
    "0": "g",
    "1": "n",
    "2": "b",
    "3": "r",
    "4": "z",
    "5": "s",
    "6": "l",
    "7": "x",
    "8": "i",
    "9": "o"
}
export function getPalive(tDelay: number, paliveNumber: number) {
    const sequenceLengths = [6, 5, 9, 4, 5, 3, 6, 6, 3];
    const currentTimestamp = Math.floor(Date.now() / 1000) + tDelay - 5400;
    const timestampString = currentTimestamp.toString();
    const timestampCharacters = timestampString.split('');

    let result = '';
    for(let i=0;i<sequenceLengths.length;i++) {
        const sequenceNumber = sequenceLengths[i];
        result += randInt(0, 1) == 1 ? randomString2(sequenceNumber) : randomString1(sequenceNumber);

        const letter = paliveCharmap[parseInt(timestampCharacters[i])];
        result += randInt(0, 1) == 0 ? letter.toUpperCase() : letter;
    }

    result += paliveNumber + (randInt(0, 1) == 1 ? randomString2(randInt(4, 20)) : randomString1(randInt(4, 25)));

    return result + "0=";
}

// this doesn't need to be in a separate file; taken from shuffleperson's original ppjs

export function getTDelay(serverTime: number): number {
    const currentTime = new Date().getTime() / 1e3;
    let tdelay = 0;
    if (serverTime < currentTime) {
      tdelay = serverTime - currentTime;
    } else serverTime > currentTime && (tdelay = serverTime - currentTime);
  
    return Math.round(tdelay);
}