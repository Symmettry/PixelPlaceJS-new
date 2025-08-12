/**
 * Packets that are received from pixelplace.
 */
export enum RECEIVED {
    /** Includes pixel data. [[x,y,brush,col,userId?],etc.] */
    PIXEL = "p",
    /** Contains pixel data + your userid; this is sent back every time you send a pixel. */
    PIXEL_CONFIRM = "<INTERNAL_PIXEL_CONFIRM>",
    /** The minimum rate of pixeling that the bot should follow. */
    RATE_CHANGE = "rate_change",

    /** Has no data. Asks the client to send pong.alive */
    PING_ALIVE = "ping.alive",
    /** Includes the server time. Used for pong.alive */
    SERVER_TIME = "server_time",

    /** Includes a username of a player who left. "username" */
    LEAVE = "l",
    /** Includes a username of a player who joined. "username" */
    JOIN = "j",

    /** User profile information.*/
    USER_PROFILE = "user.profile",
    /** This is sent to premium accounts when they request the username from a uid. */
    USERNAME = "username",

    /** Error */
    ERROR = "throw.error",
    /** Special error */
    ERROR_SPECIAL = "throw.error.special",
    /** Connection error */
    ERROR_CONNECT = "connect_error",

    /** Something with save tracking */
    SAVE_TRACKING_CACHE = "save.tracking.cache",
    /** Something with save tracking */
    SAVE_TRACKING_PENDING = "save.tracking.pending",

    /** Hot paintings. */
    PAINTINGS_HOT = "hot.paintings",
    /** The players on the painting. */
    PAINTING_PLAYERS = "painting.players",

    /** War start */
    AREA_FIGHT_START = "area_fight_start",
    /** War end */
    AREA_FIGHT_END = "area_fight_end",
    /** War bonus chest */
    AREA_FIGHT_BONUS_CHEST = "area_fight_bonus_chest",
    /** Something giving items to players */
    AREA_FIGHT_BONUS_PLAYER = "area_fight_bonus_player",
    /** Changes for war zone boundaries. */
    AREA_FIGHT_ZONE_CHANGE = "area_fight_zone_change",
    /** All war areas */
    AREAS = "areas",

    /** Item use notification */
    NOTIFICATION_ITEM_USE = "item.notification.use",
    /** Item gift notification */
    NOTIFICATION_ITEM_GIFT = "item.notification.gift",
    /** Coin gift notification */
    NOTIFICATION_COINS_GIFT = "coins.notification.gift",
    /** Golden notification */
    NOTIFICATION_GOLDEN = "golden.notification",
    /** Snowball notification */
    NOTIFICATION_SNOWBALL_ITEM = "item.notification.snowball",
    /** Auction win notification */
    NOTIFICATION_AUCTION_WIN = "auction.notification.win",

    /** New action bid */
    AUCTION_NEW_BID = "auction.new.bid",
    /** Lost action bid */
    AUCTION_LOST_BID = "auction.lost.bid",
    /** New auction */
    AUCTION_NEW_PAINTING = "auction.new.painting",

    /** Coin island owner change */
    COIN_ISLAND_OWNER_CHANGE = "coin_island_owner_change",
    /** Current coin island owner */
    COIN_ISLAND_OWNER = "coin_island_owner",

    /** Canvas data. Includes all pixels placed within now and the last board.png update. */
    CANVAS = "canvas",
    /** Canvas access requested */
    CANVAS_ACCESS_REQUESTED = "canvas.access.requested",
    /** Canvas success */
    CANVAS_SUCCESS = "canvas.success",
    /** Canvas alert */
    CANVAS_ALERT = "canvas.alert",
    /** Canvas reload */
    CANVAS_RELOAD = "reload",
    /** Canvas cooldown */
    CANVAS_COOLDOWN = "cooldown",
    /** Canvas cooldown for dotting */
    CANVAS_COOLDOWN_DOT = "cooldown_dot",
    /** Canvas protection */
    CANVAS_PROTECTION = "protection",

    /** Statistics for chat */
    CHAT_STATS = "chat.stats",
    /** System message */
    CHAT_SYSTEM_MESSAGE = "chat.system.message",
    /** Deletion of a username's messages */
    CHAT_SYSTEM_DELETE = "chat.system.delete",
    /** System announcement */
    CHAT_SYSTEM_ANNOUNCE = "chat.system.announce",
    /** Custom message */
    CHAT_CUSTOM_MESSAGE = "chat.custom.message",
    /** Custom announcement */
    CHAT_CUSTOM_ANNOUNCE = "chat.custom.announce",
    /** Painting deleted message */
    CHAT_PAINTING_DELETE = "chat.painting.delete",
    /** Sent when chat is loaded fully */
    CHAT_LOADED = "chat.messages.loaded",
    /** Chat message */
    CHAT_MESSAGE = "chat.user.message",

    /** Queue status for the server full */
    QUEUE = "queue",
    /** It gives you premium for a week. What? */
    PREMIUM_MOD = "premium.mod",
    
    /** Library packets */

    /** All 42[] packets */
    LIB_ALL = "*",
    /** All received packets */
    LIB_RAW = "**",
    /** All sent packets */
    LIB_SENT = "***",
    /** When the socket closes */
    LIB_SOCKET_CLOSE = "socket_close",
    /** Socket error */
    LIB_ERROR = "error",
}

/**
 * Packets sent from the client.
 */
export enum SENT {
    /** Contains auth data. */
    INIT = "init",

    /** Contains pixel data. */
    PIXEL = "p",
    /** Reply to ping.alive */
    PONG_ALIVE = "pong.alive",

    /** Chat commands (not /here). */
    CHAT_COMMAND = "chat.command",
    /** Chat messages */
    CHAT_MESSAGE = "chat.message",
    /** Request for info on a user profile */
    USER_PROFILE = "user.profile",
    /** Also request for info on a user profile but in an array */
    USERS_PROFILE = "users.profile",
    /** Request username from id. Premium only. */
    USERNAME = "username",

    /** Request for hot paintings */
    HOT_PAINTINGS = "hot.paintings",
    /** Request for players on a painting */
    PAINTING_PLAYERS = "painting.players",
    /** Commands for moderators on paintings. Example: { cmd: "/ban", target: "Symmettry", boardId: 81313 } */
    PAINTING_COMMAND = "painting.command",

    /** Don't know why save tracking has anything server sided, but it does. */
    SAVE_TRACKING_PENDING = "save.tracking.pending",

    /** This is some packet that's randomly sent every 5 seconds. No idea what it does. */
    HB = "hb",
    /** Fires a snowball at someone */
    SNOWBALL = "snowball",
}

/**
 * Different events in pixelplace. Includes all received and sent packets (that I know of), along with library data.
 */
export class Packets {
    static RECEIVED: typeof RECEIVED = RECEIVED;
    static SENT: typeof SENT = SENT;
}
