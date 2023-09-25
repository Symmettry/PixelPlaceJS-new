"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
exports.Bot = void 0;
var PAlive_js_1 = require("../util/PAlive.js");
var Canvas_js_1 = require("../util/Canvas.js");
var ws_1 = __importDefault(require("ws"));
var ImageDrawer_js_1 = require("../util/ImageDrawer.js");
var Protector = __importStar(require("../util/Protector.js"));
var PixelPlace_js_1 = require("../PixelPlace.js");
var Bot = /** @class */ (function () {
    function Bot(auth) {
        Object.defineProperty(this, 'authKey', { value: auth.authKey, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'authToken', { value: auth.authToken, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'authId', { value: auth.authId, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'boardId', { value: auth.boardId, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'listeners', { value: new Map(), writable: false, enumerable: true, configurable: false });
        this.lastPlaced = 0;
    }
    Bot.prototype.on = function (key, func) {
        var _a;
        if (!this.listeners.has(key))
            this.listeners.set(key, []);
        (_a = this.listeners.get(key)) === null || _a === void 0 ? void 0 : _a.push(func);
    };
    Bot.prototype.Init = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        // Connect to PixelPlace
                        Object.defineProperty(_this, 'socket', { value: new ws_1.default('wss://pixelplace.io/socket.io/?EIO=4&transport=websocket'), writable: false, enumerable: true, configurable: false });
                        // Create the canvas
                        Object.defineProperty(_this, 'canvas', { value: new Canvas_js_1.Canvas(_this.boardId), writable: false, enumerable: true, configurable: false });
                        _this.pixels = [];
                        _this.socket.on('open', function () {
                            Protector.detectAll(_this);
                        });
                        _this.socket.on('message', function (buffer) { return __awaiter(_this, void 0, void 0, function () {
                            var data, index, cube, json, id, message, _a, key, value, _b;
                            var _c;
                            return __generator(this, function (_d) {
                                switch (_d.label) {
                                    case 0:
                                        data = buffer.toString();
                                        index = data.indexOf("{");
                                        cube = data.indexOf("[");
                                        if (index === -1 || (cube < index && cube != -1)) {
                                            index = cube;
                                        }
                                        json = index !== -1 ? index : -1;
                                        id = json == -1 ? data : data.substring(0, json);
                                        message = json == -1 ? data.substring(id.length) : JSON.parse(data.substring(json));
                                        _a = id;
                                        switch (_a) {
                                            case "0": return [3 /*break*/, 1];
                                            case "40": return [3 /*break*/, 2];
                                            case "2": return [3 /*break*/, 3];
                                            case "42": return [3 /*break*/, 4];
                                        }
                                        return [3 /*break*/, 13];
                                    case 1:
                                        this.socket.send("40");
                                        return [3 /*break*/, 13];
                                    case 2:
                                        this.socket.send("42[\"init\",{\"authKey\":\"".concat(this.authKey, "\",\"authToken\":\"").concat(this.authToken, "\",\"authId\":\"").concat(this.authId, "\",\"boardId\":").concat(this.boardId, "}]"));
                                        return [3 /*break*/, 13];
                                    case 3:
                                        this.socket.send("3");
                                        return [3 /*break*/, 13];
                                    case 4:
                                        key = message[0];
                                        value = message[1];
                                        if (this.listeners.has(key)) { // if there are listeners for this key
                                            (_c = this.listeners.get(key)) === null || _c === void 0 ? void 0 : _c.forEach(function (listener) { return listener(value); }); // then send the value!
                                        }
                                        _b = key;
                                        switch (_b) {
                                            case PixelPlace_js_1.Packets.RECEIVED.CHAT_STATS: return [3 /*break*/, 5];
                                            case PixelPlace_js_1.Packets.RECEIVED.PING_ALIVE: return [3 /*break*/, 8];
                                            case PixelPlace_js_1.Packets.RECEIVED.PIXEL: return [3 /*break*/, 9];
                                            case PixelPlace_js_1.Packets.RECEIVED.CANVAS: return [3 /*break*/, 10];
                                        }
                                        return [3 /*break*/, 12];
                                    case 5: // sent once initiated
                                    return [4 /*yield*/, this.canvas.init()];
                                    case 6:
                                        _d.sent();
                                        return [4 /*yield*/, this.canvas.loadCanvasPicture()];
                                    case 7:
                                        _d.sent();
                                        return [3 /*break*/, 12];
                                    case 8:
                                        this.socket.send("42[\"pong.alive\", \"".concat((0, PAlive_js_1.getPalive)(7), "\"]"));
                                        return [3 /*break*/, 12];
                                    case 9:
                                        this.canvas.loadCanvasData(value);
                                        Protector.detectPixels(this, value);
                                        return [3 /*break*/, 12];
                                    case 10: // canvas
                                    return [4 /*yield*/, this.canvas.loadCanvasData(value)];
                                    case 11:
                                        _d.sent();
                                        setTimeout(resolve, 3000);
                                        return [3 /*break*/, 12];
                                    case 12: return [3 /*break*/, 13];
                                    case 13: return [2 /*return*/];
                                }
                            });
                        }); });
                        _this.socket.on('close', function () {
                            console.log('PPJS Closed.');
                        });
                        _this.socket.on('error', function (error) {
                            console.error('PPJS error:', error);
                            reject(); // error, reject promise
                        });
                    })];
            });
        });
    };
    Bot.prototype.getPixelAt = function (x, y) {
        var _a;
        return (_a = this.canvas.pixelData) === null || _a === void 0 ? void 0 : _a.get(x, y);
    };
    Bot.prototype.getColorId = function (r, g, b) {
        return this.canvas.getColorId(r, g, b);
    };
    Bot.prototype.genPlacementSpeed = function () {
        return Math.floor(Math.random() * 10) + 20;
    };
    Bot.prototype.placePixel = function (x, y, col, brush, protect, force) {
        if (brush === void 0) { brush = 1; }
        if (protect === void 0) { protect = false; }
        if (force === void 0) { force = false; }
        return __awaiter(this, void 0, void 0, function () {
            var deltaTime, placementSpeed;
            var _this = this;
            return __generator(this, function (_a) {
                deltaTime = Date.now() - this.lastPlaced;
                placementSpeed = this.genPlacementSpeed();
                if (deltaTime < placementSpeed) {
                    return [2 /*return*/, new Promise(function (resolve, _reject) { return __awaiter(_this, void 0, void 0, function () {
                            var _this = this;
                            return __generator(this, function (_a) {
                                setTimeout(function () { return __awaiter(_this, void 0, void 0, function () {
                                    return __generator(this, function (_a) {
                                        switch (_a.label) {
                                            case 0: return [4 /*yield*/, this.placePixel(x, y, col, brush, protect, force)];
                                            case 1:
                                                _a.sent();
                                                resolve();
                                                return [2 /*return*/];
                                        }
                                    });
                                }); }, placementSpeed - deltaTime + 1);
                                return [2 /*return*/];
                            });
                        }); })];
                }
                else {
                    return [2 /*return*/, new Promise(function (resolve, _reject) {
                            if (protect) {
                                Protector.protect(x, y, col);
                            }
                            if (!force && _this.getPixelAt(x, y) == col) {
                                resolve();
                            }
                            else {
                                var data = "[".concat(x, ", ").concat(y, ", ").concat(col, ", ").concat(brush, "]");
                                _this.emit("p", data);
                                _this.lastPlaced = Date.now();
                                setTimeout(resolve, placementSpeed - (deltaTime - placementSpeed) + 1);
                            }
                        })];
                }
                return [2 /*return*/];
            });
        });
    };
    Bot.prototype.emit = function (key, value) {
        var data = "42[\"".concat(key, "\",").concat(value.toString(), "]");
        this.socket.send(data);
    };
    Bot.prototype.drawImage = function (x, y, path, protect, force) {
        if (protect === void 0) { protect = false; }
        if (force === void 0) { force = false; }
        return __awaiter(this, void 0, void 0, function () {
            var drawer;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        drawer = new ImageDrawer_js_1.ImageDrawer(this, x, y, path, protect, force);
                        return [4 /*yield*/, drawer.begin()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    return Bot;
}());
exports.Bot = Bot;
