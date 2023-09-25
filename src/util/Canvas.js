"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Canvas = void 0;
var ndarray_1 = require("ndarray");
var https = require("https");
var getPixels = require("get-pixels");
var Canvas = /** @class */ (function () {
    function Canvas(boardId) {
        this.boardId = boardId;
        this.colors = {
            '255, 255, 255': 0,
            '196, 196, 196': 1,
            '136, 136, 136': 2,
            '85, 85, 85': 3,
            '34, 34, 34': 4,
            '0, 0, 0': 5,
            '0, 54, 56': 39,
            '0, 102, 0': 6,
            '27, 116, 0': 49,
            '71, 112, 80': 40,
            '34, 177, 76': 7,
            '2, 190, 1': 8,
            '81, 225, 25': 9,
            '148, 224, 68': 10,
            '152, 251, 152': 41,
            '251, 255, 91': 11,
            '229, 217, 0': 12,
            '230, 190, 12': 13,
            '229, 149, 0': 14,
            '255, 112, 0': 42,
            '255, 57, 4': 21,
            '229, 0, 0': 20,
            '206, 41, 57': 43,
            '255, 65, 106': 44,
            '159, 0, 0': 19,
            '107, 0, 0': 18,
            '255, 117, 95': 23,
            '160, 106, 66': 15,
            '99, 60, 31': 17,
            '153, 83, 13': 16,
            '187, 79, 0': 22,
            '255, 196, 159': 24,
            '255, 223, 204': 25,
            '255, 167, 209': 26,
            '207, 110, 228': 27,
            '125, 38, 205': 45,
            '236, 8, 236': 28,
            '130, 0, 128': 29,
            '51, 0, 119': 46,
            '2, 7, 99': 31,
            '81, 0, 255': 30,
            '0, 0, 234': 32,
            '4, 75, 255': 33,
            '0, 91, 161': 47,
            '101, 131, 207': 34,
            '54, 186, 255': 35,
            '0, 131, 199': 36,
            '0, 211, 221': 37,
            '69, 255, 200': 38,
            '181, 232, 238': 48
        };
        this.init();
    }
    Canvas.prototype.init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var dimensions, canvasWidth, canvasHeight;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getDimensions()];
                    case 1:
                        dimensions = _a.sent();
                        canvasWidth = dimensions.width;
                        canvasHeight = dimensions.height;
                        this.pixelData = (0, ndarray_1.default)(new Float64Array(canvasWidth * canvasHeight), [canvasWidth, canvasHeight]);
                        this.loadCanvasPicture();
                        return [2 /*return*/];
                }
            });
        });
    };
    Canvas.prototype.getClosestColorId = function (r, g, b) {
        var minDistance = Infinity;
        var closestColorId = -1;
        for (var color in this.colors) {
            var _a = color.split(', ').map(Number), r2 = _a[0], g2 = _a[1], b2 = _a[2];
            var distance = Math.sqrt(Math.pow(r - r2, 2) + Math.pow(g - g2, 2) + Math.pow(b - b2, 2));
            if (distance < minDistance) {
                minDistance = distance;
                closestColorId = this.colors[color];
            }
        }
        return closestColorId;
    };
    Canvas.prototype.getColorId = function (r, g, b) {
        return this.colors["".concat(r, ", ").concat(g, ", ").concat(b)] != null ? this.colors["".concat(r, ", ").concat(g, ", ").concat(b)] : -1;
    };
    Canvas.prototype.loadCanvasPicture = function () {
        return __awaiter(this, void 0, void 0, function () {
            var imageUrl;
            var _this = this;
            return __generator(this, function (_a) {
                imageUrl = 'https://pixelplace.io/canvas/' + this.boardId + '.png?t200000=' + Date.now();
                https.get(imageUrl, function (response) {
                    var chunks = [];
                    response
                        .on('data', function (chunk) {
                        chunks.push(chunk);
                    })
                        .on('end', function () {
                        var buffer = Buffer.concat(chunks);
                        getPixels(buffer, 'image/png', function (err, pixels) {
                            var _a;
                            if (err) {
                                console.error(err);
                                return;
                            }
                            for (var x = 0; x < pixels.shape[0]; x++) {
                                for (var y = 0; y < pixels.shape[1]; y++) {
                                    var r = pixels.get(x, y, 0);
                                    var g = pixels.get(x, y, 1);
                                    var b = pixels.get(x, y, 2);
                                    if (!(r == 204 && g == 204 && b == 204)) {
                                        var colId = _this.getColorId(r, g, b);
                                        if (colId == -1) {
                                            console.log(r, g, b);
                                        }
                                        else {
                                            (_a = _this.pixelData) === null || _a === void 0 ? void 0 : _a.set(x, y, colId);
                                        }
                                    }
                                }
                            }
                        });
                    })
                        .on('error', function (error) {
                        console.error(error);
                    });
                });
                return [2 /*return*/];
            });
        });
    };
    Canvas.prototype.loadCanvasData = function (canvas) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                canvas.forEach(function (pixel) {
                    _this.loadPixelData(pixel);
                });
                return [2 /*return*/];
            });
        });
    };
    Canvas.prototype.loadPixelData = function (pixel) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var x, y, col;
            return __generator(this, function (_b) {
                x = pixel[0], y = pixel[1], col = pixel[2];
                (_a = this.pixelData) === null || _a === void 0 ? void 0 : _a.set(x, y, col);
                return [2 /*return*/];
            });
        });
    };
    Canvas.prototype.getDimensions = function () {
        return __awaiter(this, void 0, void 0, function () {
            var res, json, width, height;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, fetch("https://pixelplace.io/api/get-painting.php?id=" + this.boardId + "&connected=1", {
                            "headers": {
                                "accept": "application/json, text/javascript, */*; q=0.01",
                                "accept-language": "en-US,en;q=0.9",
                                "sec-ch-ua": "\"Chromium\";v=\"116\", \"Not)A;Brand\";v=\"24\", \"Opera GX\";v=\"102\"",
                                "sec-ch-ua-mobile": "?0",
                                "sec-ch-ua-platform": "\"Windows\"",
                                "sec-fetch-dest": "empty",
                                "sec-fetch-mode": "cors",
                                "sec-fetch-site": "same-origin",
                                "x-requested-with": "XMLHttpRequest",
                                "Referer": "https://pixelplace.io/7-pixels-world-war",
                                "Referrer-Policy": "strict-origin-when-cross-origin"
                            },
                            "body": null,
                            "method": "GET"
                        })];
                    case 1:
                        res = _a.sent();
                        return [4 /*yield*/, res.json()];
                    case 2:
                        json = _a.sent();
                        width = json.painting.width;
                        height = json.painting.height;
                        return [2 /*return*/, { width: width, height: height }];
                }
            });
        });
    };
    return Canvas;
}());
exports.Canvas = Canvas;
