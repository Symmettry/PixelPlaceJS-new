// packets sent via the server
enum RECEIVED {
    PIXEL = "p",

    LEAVE = "l",
    JOIN = "j",

    PING_ALIVE = "ping.alive",
    SERVER_TIME = "server_time",

    RATE_CHANGE = "rate_change",
    USER_PROFILE = "user.profile",
    USERNAME = "username",
    QUEUE = "queue",
    PREMIUM_MOD = "premium.mod",

    ERROR = "throw.error",
    ERROR_SPECIAL = "throw.error.special",
    ERROR_CONNECT = "connect_error",

    SAVE_TRACKING_CACHE = "save.tracking.cache",
    SAVE_TRACKING_PENDING = "save.tracking.pending",

    PAINTINGS_HOT = "hot.paintings",
    PAINTING_PLAYERS = "painting.players",

    AREA_FIGHT_START = "area_fight_start",
    AREA_FIGHT_END = "area_fight_end",
    AREA_FIGHT_BONUS_CHEST = "area_fight_bonus_chest",
    AREAS = "areas",

    NOTIFICATION_ITEM_USE = "item.notification.use",
    NOTIFICATION_ITEM_GIFT = "item.notification.gift",
    NOTIFICATION_COINS_GIFT = "coins.notification.gift",
    NOTIFICATION_GOLDEN = "golden.notification",
    NOTIFICATION_SNOWBALL_ITEM = "item.notification.snowball",
    NOTIFICATION_AUCTION_WIN = "auction.notification.win",

    AUCTION_NEW_BID = "auction.new.bid",
    AUCTION_LOST_BID = "auction.lost.bid",
    AUCTION_NEW_PAINTING = "auction.new.painting",

    COIN_ISLAND_OWNER_CHANGE = "coin_island_owner_change",
    COIN_ISLAND_OWNER = "coin_island_owner",

    CANVAS = "canvas",
    CANVAS_ACCESS_REQUESTED = "canvas.access.requested",
    CANVAS_SUCCESS = "canvas.success",
    CANVAS_ALERT = "canvas.alert",
    CANVAS_RELOAD = "reload",
    CANVAS_COOLDOWN = "cooldown",
    CANVAS_COOLDOWN_DOT = "cooldown_dot",
    CANVAS_PROTECTION = "protection",

    CHAT_STATS = "chat.stats",
    CHAT_SYSTEM_MESSAGE = "chat.system.message",
    CHAT_SYSTEM_DELETE = "chat.system.delete",
    CHAT_SYSTEM_ANNOUNCE = "chat.system.announce",
    CHAT_COMMAND = "chat.command",
    CHAT_CUSTOM_MESSAGE = "chat.custom.message",
    CHAT_CUSTOM_ANNOUNCE = "chat.custom.announce",
    CHAT_PAINTING_DELETE = "chat.painting.delete",
    CHAT_LOADED = "chat.messages.loaded",
    CHAT_MESSAGE = "chat.user.message",
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

// Library packets
enum LIBRARY {
    SOCKET_CLOSE = "socket_close",
    ERROR = "error",
}

export class Packets {
    static RECEIVED: typeof RECEIVED = RECEIVED;
    static SENT: typeof SENT = SENT;
    static LIBRARY: typeof LIBRARY = LIBRARY;
    static ALL: string = "*";
    static RAW: string = "**";
}