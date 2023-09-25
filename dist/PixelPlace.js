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
exports.Packets = exports.PixelPlace = void 0;
var PAlive_js_1 = require("./util/PAlive.js");
var Canvas_js_1 = require("./util/Canvas.js");
var ws_1 = __importDefault(require("ws"));
var ImageDrawer_js_1 = require("./util/ImageDrawer.js");
var Protector = __importStar(require("./util/Protector.js"));
var PixelPlace = /** @class */ (function () {
    function PixelPlace(authKey, authToken, authId, boardId) {
        Object.defineProperty(this, 'authKey', { value: authKey, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'authToken', { value: authToken, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'authId', { value: authId, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'boardId', { value: boardId, writable: false, enumerable: true, configurable: false });
        Object.defineProperty(this, 'listeners', { value: new Map(), writable: false, enumerable: true, configurable: false });
    }
    PixelPlace.prototype.on = function (key, func) {
        var _a;
        if (!this.listeners.has(key))
            this.listeners.set(key, []);
        (_a = this.listeners.get(key)) === null || _a === void 0 ? void 0 : _a.push(func);
    };
    PixelPlace.prototype.Init = function () {
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
                            resolve(); // await pp.Init();
                        });
                        _this.socket.on('message', function (buffer) {
                            var _a;
                            var data = buffer.toString(); // buffer -> string
                            // Gets the data and ID of the response
                            var index = data.indexOf("{");
                            var cube = data.indexOf("[");
                            if (index === -1 || (cube < index && cube != -1)) {
                                index = cube;
                            }
                            var json = index !== -1 ? index : -1;
                            var id = json == -1 ? data : data.substring(0, json);
                            // if JSON, parse, else keep it
                            var message = json == -1 ? data.substring(id.length) : JSON.parse(data.substring(json));
                            switch (id) {
                                case "0": // socket.io start
                                    _this.socket.send("40");
                                    break;
                                case "40": // socket.io finish
                                    _this.socket.send("42[\"init\",{\"authKey\":\"".concat(_this.authKey, "\",\"authToken\":\"").concat(_this.authToken, "\",\"authId\":\"").concat(_this.authId, "\",\"boardId\":").concat(_this.boardId, "}]"));
                                    break;
                                case "2": // socket.io keepalive
                                    _this.socket.send("3");
                                    break;
                                case "42": // message
                                    var key = message[0];
                                    var value = message[1];
                                    if (_this.listeners.has(key)) { // if there are listeners for this key
                                        (_a = _this.listeners.get(key)) === null || _a === void 0 ? void 0 : _a.forEach(function (listener) { return listener(value); }); // then send the value!
                                    }
                                    switch (key) {
                                        case "ping.alive": // pixelplace keepalive
                                            _this.socket.send("42[\"pong.alive\", \"".concat((0, PAlive_js_1.getPalive)(7), "\"]"));
                                            break;
                                        case "canvas": // why are these 2 separate keys? they do the same thing owmince lol
                                        case "p": // pixels
                                            _this.canvas.loadCanvasData(value);
                                            Protector.detect(_this, value);
                                            break;
                                    }
                                    break;
                            }
                        });
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
    PixelPlace.prototype.getPixelAt = function (x, y) {
        var _a;
        return (_a = this.canvas.pixelData) === null || _a === void 0 ? void 0 : _a.get(x, y);
    };
    PixelPlace.prototype.getColorId = function (r, g, b) {
        return this.canvas.getColorId(r, g, b);
    };
    PixelPlace.prototype.placePixel = function (x, y, col, brush, protect, force) {
        var _this = this;
        if (brush === void 0) { brush = 1; }
        if (protect === void 0) { protect = false; }
        if (force === void 0) { force = false; }
        return new Promise(function (resolve, _reject) {
            if (protect) {
                Protector.protect(x, y, col);
            }
            if (!force && _this.getPixelAt(x, y) == col) {
                resolve();
            }
            else {
                _this.emit("p", "[".concat(x, ", ").concat(y, ", ").concat(col, ", ").concat(brush, "]"));
                setTimeout(resolve, 50);
            }
        });
    };
    PixelPlace.prototype.emit = function (key, value) {
        var data = "42[\"".concat(key, "\",").concat(value.toString(), "]");
        this.socket.send(data);
    };
    PixelPlace.prototype.drawImage = function (x, y, path, protect, force) {
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
    return PixelPlace;
}());
exports.PixelPlace = PixelPlace;
var RECEIVED;
(function (RECEIVED) {
    RECEIVED["LEAVE"] = "l";
    RECEIVED["JOIN"] = "j";
    RECEIVED["PING_ALIVE"] = "ping.alive";
    RECEIVED["DELETE_CHAT_MESSAGE"] = "chat.system.delete";
    RECEIVED["CHAT_LOADED"] = "chat.messages.loaded";
    RECEIVED["CHAT_MESSAGE"] = "chat.user.message";
    RECEIVED["CANVAS"] = "canvas";
    RECEIVED["CHAT_STATS"] = "chat.stats";
    RECEIVED["RATE_CHANGE"] = "rate_change";
    RECEIVED["AREA_FIGHT_START"] = "area_fighT_start";
    RECEIVED["AREA_FIGHT_END"] = "area_fight_end";
    RECEIVED["ERROR"] = "throw.error";
    RECEIVED["ITEM_USE_NOTIFICATION"] = "item.notification.use";
    RECEIVED["SPECIAL_ERROR"] = "throw.error.special";
    RECEIVED["PROTECTION"] = "protection";
    RECEIVED["COOLDOWN"] = "cooldown";
    RECEIVED["COOLDOWN_DOT"] = "cooldown_dot";
    RECEIVED["RELOAD"] = "reload";
    RECEIVED["CANVAS_ACCESS_REQUESTED"] = "canvas.access.requested";
    RECEIVED["USER_PROFILE"] = "user.profile";
    RECEIVED["HOT_PAINTINGS"] = "hot.paintings";
    RECEIVED["COINS_GIFT_NOTIFICATION"] = "coins.notification.gift";
    RECEIVED["GOLDEN_NOTIFICATION"] = "golden.notification";
    RECEIVED["SNOWBALL_ITEM_NOTIFICATION"] = "item.notification.snowball";
    RECEIVED["ITEM_NOTIFICATION_GIFT"] = "item.notification.gift";
    RECEIVED["CHAT_SYSTEM_MESSAGE"] = "chat.system.message";
    RECEIVED["CHAT_SYSTEM_DELETE"] = "chat.system.delete";
    RECEIVED["PIXEL"] = "p";
})(RECEIVED || (RECEIVED = {}));
var SENT;
(function (SENT) {
    SENT["INIT"] = "init";
    SENT["PIXEL"] = "p";
    SENT["PONG_ALIVE"] = "pong.alive";
    SENT["CHAT_MESSAGE"] = "chat.message";
    SENT["USER_PROFILE"] = "user.profile";
    SENT["HOT_PAINTINGS"] = "hot.paintings";
    SENT["SERVER_TIME"] = "server_time";
    SENT["USERNAME"] = "username";
})(SENT || (SENT = {}));
var UNKNOWN;
(function (UNKNOWN) {
    UNKNOWN["PREMIUM_MOD"] = "premium.mod";
    UNKNOWN["SAVE_TRACKING_CACHE"] = "save.tracking.cache";
    UNKNOWN["SAVE_TRACKING_PENDING"] = "save.tracking.pending";
    UNKNOWN["QUEUE"] = "queue";
    UNKNOWN["PAINTING_PLAYERS"] = "painting.players";
    UNKNOWN["CANVAS_SUCCESS"] = "canvas.success";
    UNKNOWN["CANVAS_ALERT"] = "canvas.alert";
    UNKNOWN["CHAT_CUSTOM_MESSAGE"] = "chat.custom.message";
    UNKNOWN["CHAT_CUSTOM_ANNOUNCE"] = "chat.custom.announce";
    UNKNOWN["CHAT_PAINTING_DELETE"] = "chat.painting.delete";
    UNKNOWN["CHAT_COMMAND"] = "chat.command";
    UNKNOWN["AREAS"] = "areas";
})(UNKNOWN || (UNKNOWN = {}));
var Packets = /** @class */ (function () {
    function Packets() {
    }
    Packets.RECEIVED = RECEIVED;
    Packets.SENT = SENT;
    Packets.UNKNOWN = UNKNOWN;
    return Packets;
}());
exports.Packets = Packets;
