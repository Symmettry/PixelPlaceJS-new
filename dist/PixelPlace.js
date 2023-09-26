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
exports.Packets = exports.Modes = exports.PixelPlace = exports.Auth = void 0;
var Bot_1 = require("./bot/Bot");
var Auth_1 = require("./bot/Auth");
Object.defineProperty(exports, "Auth", { enumerable: true, get: function () { return Auth_1.Auth; } });
var Modes_1 = require("./util/Modes");
Object.defineProperty(exports, "Modes", { enumerable: true, get: function () { return Modes_1.Modes; } });
var PixelPlace = /** @class */ (function () {
    function PixelPlace(auths) {
        var _this = this;
        this.bots = [];
        auths.forEach(function (auth) {
            _this.bots.push(new Bot_1.Bot(auth));
        });
    }
    PixelPlace.prototype.Init = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, Promise.all(this.bots.map(function (bot) { return bot.Init(); }))];
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
    RECEIVED["AREA_FIGHT_START"] = "area_fight_start";
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
    RECEIVED["SERVER_TIME"] = "server_time";
})(RECEIVED || (RECEIVED = {}));
var SENT;
(function (SENT) {
    SENT["INIT"] = "init";
    SENT["PIXEL"] = "p";
    SENT["PONG_ALIVE"] = "pong.alive";
    SENT["CHAT_MESSAGE"] = "chat.message";
    SENT["USER_PROFILE"] = "user.profile";
    SENT["HOT_PAINTINGS"] = "hot.paintings";
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
