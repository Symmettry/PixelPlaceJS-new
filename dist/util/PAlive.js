"use strict";
// taken from npm module "pixelplacejs," thanks shuffle
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPalive = void 0;
function getCurrentTimeInSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}
function getRandomIntInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function generateRandomString(length) {
    var characters = "abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var characterCount = characters.length;
    var result = [];
    for (var i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * characterCount)));
    }
    return result.join('');
}
function generateComplexString(length) {
    var characters = "gmbonjklezcfxta1234567890GMBONJKLEZCFXTA";
    var characterCount = characters.length;
    var result = [];
    for (var i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * characterCount)));
    }
    return result.join('');
}
var numberToCharMap = {
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
var userId = 5;
function getPalive(tDelay) {
    var _a;
    var stringLengths = [6, 5, 9, 4, 5, 3, 6, 6, 3];
    var currentTime = getCurrentTimeInSeconds() + tDelay - 540;
    var currentTimeStr = currentTime.toString();
    var currentTimeDigits = currentTimeStr.split('');
    var result = '';
    var index = 0;
    while (index < stringLengths.length) {
        if (getRandomIntInRange(0, 1) === 1) {
            result += generateComplexString(stringLengths[index]);
        }
        else {
            result += generateRandomString(stringLengths[index]);
        }
        if (Math.floor(Math.random() * 2) === 0) {
            result += ((_a = numberToCharMap[parseInt(currentTimeDigits[index])]) === null || _a === void 0 ? void 0 : _a.toUpperCase()) || '';
        }
        else {
            result += numberToCharMap[parseInt(currentTimeDigits[index])] || '';
        }
        index++;
    }
    if (getRandomIntInRange(0, 1) === 1) {
        result += userId + generateComplexString(getRandomIntInRange(4, 20));
    }
    else {
        result += userId + generateRandomString(getRandomIntInRange(4, 25));
    }
    result += '0=';
    return result;
}
exports.getPalive = getPalive;
