"use strict";
// taken from npm module "pixelplacejs," thanks shuffle
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = (function (serverTime) {
    var currentTime = new Date().getTime() / 1e3;
    var tdelay = 0;
    if (serverTime < currentTime) {
        tdelay = serverTime - currentTime;
    }
    else
        serverTime > currentTime && (tdelay = serverTime - currentTime);
    return Math.round(tdelay);
});
