enum RECEIVED {
    LEAVE = "l",
    JOIN = "j",
    PING_ALIVE = "ping.alive",
    DELETE_CHAT_MESSAGE = "chat.system.delete",
    CHAT_LOADED = "chat.messages.loaded",
    CHAT_MESSAGE = "chat.user.message",
    CANVAS = "canvas",
    CHAT_STATS = "chat.stats",
    RATE_CHANGE = "rate_change",
    AREA_FIGHT_START = "area_fight_start",
    AREA_FIGHT_END = "area_fight_end",
    ERROR = "throw.error",
    ITEM_USE_NOTIFICATION = "item.notification.use",
    SPECIAL_ERROR = "throw.error.special",
    PROTECTION = "protection",
    COOLDOWN = "cooldown",
    COOLDOWN_DOT = "cooldown_dot",
    RELOAD = "reload",
    CANVAS_ACCESS_REQUESTED = "canvas.access.requested",
    USER_PROFILE = "user.profile",
    HOT_PAINTINGS = "hot.paintings",
    COINS_GIFT_NOTIFICATION = "coins.notification.gift",
    GOLDEN_NOTIFICATION = "golden.notification",
    SNOWBALL_ITEM_NOTIFICATION = "item.notification.snowball",
    ITEM_NOTIFICATION_GIFT = "item.notification.gift",
    CHAT_SYSTEM_MESSAGE = "chat.system.message",
    CHAT_SYSTEM_DELETE = "chat.system.delete",
    PIXEL = "p",
    SERVER_TIME = "server_time",
}
enum SENT {
    INIT = "init",
    PIXEL = "p",
    PONG_ALIVE = "pong.alive",
    CHAT_MESSAGE = "chat.message",
    USER_PROFILE = "user.profile",
    HOT_PAINTINGS = "hot.paintings",
    USERNAME = "username",
}
enum UNKNOWN {
    PREMIUM_MOD = "premium.mod",
    SAVE_TRACKING_CACHE = "save.tracking.cache",
    SAVE_TRACKING_PENDING = "save.tracking.pending",
    QUEUE = "queue",
    PAINTING_PLAYERS = "painting.players",
    CANVAS_SUCCESS = "canvas.success",
    CANVAS_ALERT = "canvas.alert",
    CHAT_CUSTOM_MESSAGE = "chat.custom.message",
    CHAT_CUSTOM_ANNOUNCE = "chat.custom.announce",
    CHAT_PAINTING_DELETE = "chat.painting.delete",
    CHAT_COMMAND = "chat.command",
    AREAS = "areas",
}

export class Packets {
    static RECEIVED: typeof RECEIVED = RECEIVED;
    static SENT: typeof SENT = SENT;
    static UNKNOWN: typeof UNKNOWN = UNKNOWN;
    static ALL: string = "*";
}