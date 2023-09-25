// taken from npm module "pixelplacejs," thanks shuffle

let cipherObj = {
    "0": "g",
    "1": "n",
    "2": "b",
    "3": "r",
    "4": "z",
    "5": "s",
    "6": "l",
    "7": "x",
    "8": "i",
    "9": "a"
};
function randomStr1(numbr) {
    var GK = ["4", "1", "2", "3", "0"];
    let Gw = 0;
    while (true) {
        switch (GK[Gw++]) {
            case "0":
                return GW.join("");
            case "1":
                var Gz = "gggggggggggggggggggggggggggggggggggggggg";
                continue;
            case "2":
                var GC = 40;
                continue;
            case "3":
                for (var Gv = 0; Gv < numbr; Gv++) {
                    GW.push(Gz.charAt(Math.floor(Math.random() * GC)));
                }
                continue;
            case "4":
                var GW = [];
                continue;
        }
        break;
    }
}
function getPalive(tDelay = 7, userIdDigit = 3) {
    let cipher = [6, 5, 9, 4, 5, 3, 6, 6, 3];
    var currentTime = Math.round(new Date().getTime() / 1e3) + tDelay - 540;
    let currentTimeString = currentTime.toString();
    let currentTimeChars = currentTimeString.split("");
    let output = "";
    let i = 0;
    while (i < cipher.length) {
        output += randomStr1(cipher[i]);
        let suffix = cipherObj[parseInt(currentTimeChars[i])];
        output += suffix;
        i++;
    }
    output += userIdDigit + randomStr1(8);
    output = output + "0=";
    return output;
}
module.exports = { getPalive }