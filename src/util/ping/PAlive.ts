// taken from npm module "pixelplacejs" - thanks shuffle

function getCurrentTimeInSeconds(): number {
    return Math.floor(new Date().getTime() / 1000);
}
  
  function getRandomIntInRange(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
  
function generateRandomString(length: number): string {
    const characters = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const characterCount = characters.length;
    const result: string[] = [];
    
    for (let i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * characterCount)));
    }
    
    return result.join('');
}
  
function generateComplexString(length: number): string {
    const characters = "gmbonjklezcfxta1234567890GMBONJKLEZCFXTA";
    const characterCount = characters.length;
    const result: string[] = [];
    
    for (let i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * characterCount)));
    }
    
    return result.join('');
}
  
const numberToCharMap: Record<number, string> = {
    0: 'g',
    1: 'n',
    2: 'b',
    3: 'r',
    4: 'z',
    5: 's',
    6: 'l',
    7: 'x',
    8: 'i',
    9: 'a',
};
  
const userId = 5;
  
export function getPalive(tDelay: number): string {
    const stringLengths = [6, 5, 9, 4, 5, 3, 6, 6, 3];
    const currentTime = getCurrentTimeInSeconds() + tDelay - 5400;
    const currentTimeStr = currentTime.toString();
    const currentTimeDigits = currentTimeStr.split('');
    let result = '';
    let index = 0;
    
    while (index < stringLengths.length) {
        if (getRandomIntInRange(0, 1) === 1) {
            result += generateComplexString(stringLengths[index]);
        } else {
            result += generateRandomString(stringLengths[index]);
        }
      
        if (Math.floor(Math.random() * 2) === 0) {
            result += numberToCharMap[parseInt(currentTimeDigits[index])]?.toUpperCase() || '';
        } else {
            result += numberToCharMap[parseInt(currentTimeDigits[index])] || '';
        }
      
        index++;
    }
    
    if (getRandomIntInRange(0, 1) === 1) {
        result += userId + generateComplexString(getRandomIntInRange(4, 20));
    } else {
        result += userId + generateRandomString(getRandomIntInRange(4, 25));
    }
    
    result += '0=';
    
    return result;
}

// this doesn't need to be in a separate class;

export function getTDelay(serverTime: number): number {
    const currentTime = new Date().getTime() / 1e3;
    let tdelay = 0;
    if (serverTime < currentTime) {
      tdelay = serverTime - currentTime;
    } else serverTime > currentTime && (tdelay = serverTime - currentTime);
  
    return Math.round(tdelay);
};