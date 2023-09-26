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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Protector = void 0;
var ndarray_1 = __importDefault(require("ndarray"));
var Protector = /** @class */ (function () {
    function Protector(canvasWidth, canvasHeight) {
        this.protectedPixels = (0, ndarray_1.default)(new Uint16Array(canvasWidth * canvasHeight), [canvasWidth, canvasHeight]);
    }
    Protector.prototype.protect = function (x, y, col) {
        this.protectedPixels.set(x, y, col);
    };
    Protector.prototype.unprotect = function (x, y) {
        this.protectedPixels.set(x, y, -1);
    };
    Protector.prototype.getColor = function (x, y) {
        return this.protectedPixels.get(x, y);
    };
    Protector.prototype.detectPixels = function (pp, pixels) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(pixels.map(function (pixel) { return __awaiter(_this, void 0, void 0, function () {
                            var x, y, col, protectColor;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        x = pixel[0], y = pixel[1], col = pixel[2];
                                        protectColor = this.getColor(x, y);
                                        if (!(protectColor != undefined && protectColor !== -1 && protectColor !== col)) return [3 /*break*/, 2];
                                        return [4 /*yield*/, pp.placePixel(x, y, protectColor, 1, true, false)];
                                    case 1:
                                        _a.sent();
                                        _a.label = 2;
                                    case 2: return [2 /*return*/];
                                }
                            });
                        }); }))];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    Protector.prototype.detectAll = function (pp) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, new Promise(function (resolve, _reject) { return __awaiter(_this, void 0, void 0, function () {
                            var x, y, protectColor;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0:
                                        x = 0;
                                        _a.label = 1;
                                    case 1:
                                        if (!(x < this.protectedPixels.shape[0])) return [3 /*break*/, 6];
                                        y = 0;
                                        _a.label = 2;
                                    case 2:
                                        if (!(y < this.protectedPixels.shape[1])) return [3 /*break*/, 5];
                                        protectColor = this.protectedPixels.get(x, y);
                                        if (!(protectColor != undefined && protectColor !== -1 && protectColor !== pp.getPixelAt(x, y))) return [3 /*break*/, 4];
                                        return [4 /*yield*/, pp.placePixel(x, y, protectColor, 1, true, false)];
                                    case 3:
                                        _a.sent();
                                        _a.label = 4;
                                    case 4:
                                        y++;
                                        return [3 /*break*/, 2];
                                    case 5:
                                        x++;
                                        return [3 /*break*/, 1];
                                    case 6:
                                        resolve();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                    case 1:
                        _a.sent();
                        setTimeout(function () { _this.detectAll(pp); }, 1000);
                        return [2 /*return*/];
                }
            });
        });
    };
    return Protector;
}());
exports.Protector = Protector;
