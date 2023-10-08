// packets sent via the server
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
    USERNAME = "username",
    COIN_ISLAND_OWNER_CHANGE = "coin_island_owner_change",
    AREAS = "areas",
    CANVAS_SUCCESS = "canvas.success",
    CANVAS_ALERT = "canvas.alert",
    SAVE_TRACKING_CACHE = "save.tracking.cache",
    AUCTION_WIN_NOTIFICATION = "auction.notification.win",
    AUCTION_NEW_BID = "auction.new.bid",
}

// packets the client can send
enum SENT {
    INIT = "init",
    PIXEL = "p",
    PONG_ALIVE = "pong.alive",
    CHAT_MESSAGE = "chat.message",
    USER_PROFILE = "user.profile",
    HOT_PAINTINGS = "hot.paintings",
    USERNAME = "username",
}

// I don't know which ones these are.
enum UNKNOWN {
    PREMIUM_MOD = "premium.mod",
    SAVE_TRACKING_PENDING = "save.tracking.pending",
    QUEUE = "queue",
    PAINTING_PLAYERS = "painting.players",
    CHAT_CUSTOM_MESSAGE = "chat.custom.message",
    CHAT_CUSTOM_ANNOUNCE = "chat.custom.announce",
    CHAT_PAINTING_DELETE = "chat.painting.delete",
    CHAT_COMMAND = "chat.command",
}

// Library packets
enum LIBRARY {
    SOCKET_CLOSE = "socket_close",
    ERROR = "error",
}

export class Packets {
    static RECEIVED: typeof RECEIVED = RECEIVED;
    static SENT: typeof SENT = SENT;
    static UNKNOWN: typeof UNKNOWN = UNKNOWN;
    static LIBRARY: typeof LIBRARY = LIBRARY;
    static ALL: string = "*";
}