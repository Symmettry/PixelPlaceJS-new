import { Color } from "../data/Color";
import { ChatChannel, IArea, ItemName } from "../data/Data";
import { PPError } from "../data/Errors";
import { RECEIVED } from "./Packets";

export type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

/**
 * Types for packets.
 */
export interface PacketResponseMap {
    [RECEIVED.PIXEL]: PixelPacket,
    [RECEIVED.PIXEL_CONFIRM]: PixelConfirmPacket;
    [RECEIVED.RATE_CHANGE]: RateChangePacket,

    [RECEIVED.PING_ALIVE]: null,
    [RECEIVED.SERVER_TIME]: ServerTimePacket,

    [RECEIVED.LEAVE]: LeavePacket,
    [RECEIVED.JOIN]: JoinPacket,

    [RECEIVED.USER_PROFILE]: UserProfilePacket,
    [RECEIVED.USERNAME]: UsernamePacket;

    [RECEIVED.ERROR]: ErrorPacket,
    [RECEIVED.ERROR_SPECIAL]: SpecialErrorPacket,
    [RECEIVED.ERROR_CONNECT]: null,

    [RECEIVED.SAVE_TRACKING_CACHE]: SaveTrackingCachePacket,
    [RECEIVED.SAVE_TRACKING_PENDING]: SaveTrackingPendingPacket,

    [RECEIVED.PAINTINGS_HOT]: HotPaintingsPacket,
    [RECEIVED.PAINTING_PLAYERS]: PaintingPlayersPacket,

    [RECEIVED.AREA_FIGHT_START]: AreaFightStartPacket,
    [RECEIVED.AREA_FIGHT_END]: AreaFightEndPacket,
    [RECEIVED.AREA_FIGHT_BONUS_CHEST]: AreaFightBonusChestPacket,
    [RECEIVED.AREA_FIGHT_BONUS_PLAYER]: AreaFightBonusPlayerPacket,
    [RECEIVED.AREA_FIGHT_ZONE_CHANGE]: AreaFightZoneChangePacket,
    [RECEIVED.AREAS]: AreasPacket,

    [RECEIVED.NOTIFICATION_ITEM_USE]: ItemUseNotificationPacket,
    [RECEIVED.NOTIFICATION_ITEM_GIFT]: ItemGiftNotificationPacket,
    [RECEIVED.NOTIFICATION_COINS_GIFT]: CoinsGiftNotificationPacket,
    [RECEIVED.NOTIFICATION_GOLDEN]: GoldenNotificationPacket,
    [RECEIVED.NOTIFICATION_SNOWBALL_ITEM]: SnowballItemNotificationPacket,
    [RECEIVED.NOTIFICATION_AUCTION_WIN]: AuctionWinNotificationPacket,

    [RECEIVED.AUCTION_NEW_BID]: AuctionNewBidPacket,
    [RECEIVED.AUCTION_LOST_BID]: AuctionLostBidPacket,
    [RECEIVED.AUCTION_NEW_PAINTING]: AuctionNewPaintingPacket,

    [RECEIVED.COIN_ISLAND_OWNER_CHANGE]: CoinIslandOwnerChangePacket,
    [RECEIVED.COIN_ISLAND_OWNER]: CoinIslandOwnerPacket,

    [RECEIVED.CANVAS]: CanvasPacket,
    [RECEIVED.CANVAS_ACCESS_REQUESTED]: CanvasAccessRequestedPacket,
    [RECEIVED.CANVAS_SUCCESS]: CanvasSuccessPacket,
    [RECEIVED.CANVAS_ALERT]: CanvasAlertPacket,
    [RECEIVED.CANVAS_RELOAD]: null,
    [RECEIVED.CANVAS_COOLDOWN]: CanvasCooldownPacket,
    [RECEIVED.CANVAS_COOLDOWN_DOT]: CanvasCooldownDotPacket,
    [RECEIVED.CANVAS_PROTECTION]: null,

    [RECEIVED.CHAT_STATS]: ChatStatsPacket,
    [RECEIVED.CHAT_SYSTEM_MESSAGE]: ChatSystemMessagePacket,
    [RECEIVED.CHAT_SYSTEM_DELETE]: ChatSystemDeletePacket,
    [RECEIVED.CHAT_SYSTEM_ANNOUNCE]: ChatSystemAnnouncePacket,
    [RECEIVED.CHAT_CUSTOM_MESSAGE]: ChatCustomMessagePacket,
    [RECEIVED.CHAT_PAINTING_DELETE]: ChatPaintingDeletePacket,
    [RECEIVED.CHAT_LOADED]: ChatLoadedPacket,
    [RECEIVED.CHAT_MESSAGE]: ChatMessagePacket,

    [RECEIVED.QUEUE]: QueuePacket;
    [RECEIVED.PREMIUM_MOD]: null,

    [RECEIVED.LIB_ALL]: [key: string, value: unknown],
    [RECEIVED.LIB_RAW]: string,
    [RECEIVED.LIB_ERROR]: Error,
    [RECEIVED.LIB_SOCKET_CLOSE]: [code: number, reason: Buffer],
    [RECEIVED.LIB_SENT]: string,
}

/**
 * Message tuple for string -> packet. Idk why this exists idfk...
 */
export type MessageTuple<T extends keyof PacketResponseMap> = [T, PacketResponseMap[T]];

/**
 * Packet for areas so you don't put IArea[] weirdly.
 */
export type AreasPacket = IArea[];

/**
 * Packet for new painting being sold.
 */
export type AuctionNewPaintingPacket = {
    /** Owner of the painting; this is who is selling the painting. */
    owner_username: string,
    /** Unique id of the painting */
    frame_id: number,
    /** Unique id of the auction. */
    id: number,
    /** The starting bid amount (ppcoins) */
    current_bid: number
};

/**
 * Packet for auction lost.
 */
export type AuctionLostBidPacket = {
    /** Id of the auction. */
    id: number,
    /** Current bidder username. */
    current_bid_username: string
};

/**
 * Packet for new auction.
 */
export type AuctionNewBidPacket = {
    /** Id of the auction. */
    id: number,
    /** No idea. */
    under_action: number,
    /** Current bid. */
    current_bid: number,
    /** Username of the current bidder. */
    current_bid_username: string,
    /** The amount of bids on the auction. */
    bids: number,
    /** The time that the auction expires. */
    auction_expire_time: number
};

/**
 * Tells the cooldown for dotting on the canvas.
 */
export type CanvasCooldownDotPacket = number;

/**
 * Tells the cooldown of the canvas.
 */
export type CanvasCooldownPacket = number;

/**
 * Alert message.
 */
export type CanvasAlertPacket = string;

/**
 * Success message.
 */
export type CanvasSuccessPacket = string;

/**
 * Tells how many requests to the canvas you have.
 */
export type CanvasAccessRequestedPacket = number;

export type PixelPacketData = [
    /** The x coordinate of the pixel. */
    x: number,
    /** The y coordinate of the pixel. */
    y: number,
    /** The color being placed. */
    col: Color,
    /** The brush id. */
    brush: number,
    /** If premium, a user id will be present. It will also be your user id if it's a response packet. */
    userId?: number,
];
type RequireUserId<T extends any[]> =
    T extends [...infer Head, number?] ? [...Head, number] : T;

/**
 * Contains an array of pixel data.
 */
export type PixelPacket = PixelPacketData[];

/**
 * Contains 1 pixel packet data with the userid of yourself
 */
export type PixelConfirmPacket = [RequireUserId<PixelPacketData>];

/**
 * Also contains an array of pixel data, but this packet is only sent at the start.
 */
export type CanvasPacket = PixelPacketData[];

/**
 * Represents a user profile.
 */
export type UserProfilePacket = {
    /** The user's color. */
    color: number,
    /** Whether the user is top 5 golden bars. */
    golden: boolean,
    /** Whether the user has the Halloween effect. */
    halloween: boolean,
    /** The user's last activity timestamp. */
    lastActivity: number,
    /** The user's name. */
    name: string,
    /** Whether the user is online. This will be true if all other values are set. */
    online: true,
    /** The user's current painting. */
    painting: number,
    /** Whether the user has the rainbow effect. */
    rainbow: boolean,
    /** The name of the canvas of the user. */
    slug: string,
    /** The user's username. */
    username: string,
    /** Whether the user has the Christmas effect. */
    xmas: boolean,
    /** The user's x-coordinate. */
    x: number,
    /** The user's y-coordinate. */
    y: number,
} | {
    /** Whether the user is online. This will be false if all other values aren't set. */
    online: false,
};

/**
 * Represents a notification for item use.
 */
export type ItemUseNotificationPacket = {
    /** The user id of the sender. */
    userId: number,
    /** The username of the sender. */
    from: string,
    /** The item id. */
    item: number,
    /** The item name. */
    itemName: ItemName,
    /** The painting id. */
    painting: number,
    /** The x-coordinate. */
    x: number,
    /** The y-coordinate. */
    y: number,
    /** The zoom level. */
    zoom?: number,
    /** No idea. Color maybe? */
    c: string,
};

/**
 * Represents a notification for item gift.
 */
export type ItemGiftNotificationPacket = {
    /** The sender's username. */
    from: string,
    /** The recipient's username. */
    to: string,
    /** The item id. */
    item: ItemName,
};

/**
 * Represents a notification for coins gift.
 */
export type CoinsGiftNotificationPacket = {
    /** The sender's username. */
    from: string,
    /** The recipient's username. */
    to: string,
    /** The amount of coins. */
    amount: number,
};

/**
 * Represents a golden notification.
 */
export type GoldenNotificationPacket = {
    /** The username of the golden user. */
    username: string,
    /** No idea. */
    way: number,
};

/**
 * Represents a notification for a snowball item use.
 */
export type SnowballItemNotificationPacket = {
    /** The sender's username. */
    from: string,
    /** The recipient's username. */
    to: string,
    /** The amount of times they were snowballed. */
    snowballed: number,
};

/**
 * Represents a notification for an auction win.
 */
export type AuctionWinNotificationPacket = {
    /** The owner's username. */
    owner_username: string,
    /** The frame id. */
    frame_id: number,
    /** The auction id. */
    id: number,
    /** The current bid. */
    current_bid: number
};

/**
 * Represents a new bid in an auction.
 */
export type NewBidAuctionPacket = {
    /** The auction id. */
    id: number,
    /** The id of the user under action. */
    under_action: number,
    /** The current bid. */
    current_bid: number,
    /** The username of the current bidder. */
    current_bid_username: string,
    /** The number of bids. */
    bids: number,
    /** The expiration time of the auction. */
    auction_expire_time: number
};

/**
 * Represents a lost bid in an auction.
 */
export type LostBidAuctionPacket = {
    /** The auction id. */
    id: number,
    /** The username of the current bidder. */
    current_bid_username: string
};

/**
 * Represents a new painting in an auction.
 */
export type NewPaintingAuctionPacket = {
    /** The owner's username. */
    owner_username: string,
    /** The frame id. */
    frame_id: number,
    /** The auction id. */
    id: number,
    /** The current bid. */
    current_bid: number
};

/**
 * Represents a change in the owner of a coin island.
 */
export type CoinIslandOwnerChangePacket = {
    /** The island number. */
    island: number,
    /** The username of the previous owner. */
    from: string,
    /** The amount of coins. */
    amount: number
};

/**
 * Represents the owner of a coin island.
 */
export type CoinIslandOwnerPacket = {
    /** The username of the owner. */
    from: string,
    /** The island number. */
    island: number
};

/**
 * A number describing the pixeling rate in milliseconds.
 */
export type RateChangePacket = number;

/**
 * A number describing the time on the server (seconds, not milliseconds).
 */
export type ServerTimePacket = number;

/**
 * Name of the person who left.
 */
export type LeavePacket = string;

/**
 * Name of the person who joined.
 */
export type JoinPacket = string;

/**
 * A packet for premium users that show the username of a user id.
 */
export type UsernamePacket = {
    /** The user id of the person. */
    id: number,
    /** The name of the user. */
    name: string,
}

/**
 * A number with the error code.
 */
export type ErrorPacket = PPError | number;

/**
 * Special error.
 */
export type SpecialErrorPacket = {
    /** The error code. */
    id: number,
    /** A special message. */
    message: string,
}

/**
 * Some timestamp. No idea what it's for.
 */
export type SaveTrackingCachePacket = number;

/**
 * No idea.
 */
export type SaveTrackingPendingPacket = {
    /** No idea. */
    pixels: { [key: string]: any },
    /** No idea. */
    names: { [key: string]: any },
}

/**
 * An array of the current top paintings.
 */
export type HotPaintingsPacket = {
    /** No idea. */
    access: number,
    /** The default color on the painting. */
    defaultColor: number,
    /** No idea. */
    guild: number,
    /** The painting id. */
    id: number,
    /** The name of the painting. */
    name: string,
    /** If it's nsfw. */
    nsfw: number,
    /** How many are online the painting. */
    online: number
    /** How many pixels have been placed on the painting. */
    pixels: number,
    /** Shortened name of the painting. */
    slug: string,
    /** No idea. */
    twitch: number,
    /** Max x value. Probably for display? */
    xMax: number
}[];

/**
 * A packet describing all players on a painting.
 */
export type PaintingPlayersPacket = {
    /** The user id & their color + username. */
    [id: number]: {color: number, username: string}
};

export enum FightType {
    GUILD = 0,
    PLAYER = 1,
}

/**
 * Owi's area display is dog ass
 * 
 * It's ok ppjs got it
 */
export enum FightLocation {
    AUSTRALIAN = 0,
    RUSSIAN = 1,
    AFRICAN = 2,
    ANTARCTICAN = 3,
    CANADIAN = 4,
    BRAZILIAN = 5,
    CHINESE = 6,
    GREENLAND = 7,
    UNITED_STATES = 8,
}

/**
 * Represents an area fight start notification.
 */
export type AreaFightStartPacket = {
    /** The timestamp when the fight ends. */
    fightEndAt: EpochTimeStamp,
    /** The type of fight. */
    fightType: FightType,
    /** Location id. */
    id: FightLocation,
    /** The timestamp of the next fight. */
    nextFightAt: EpochTimeStamp
};

/**
 * Represents an area fight end notification.
 */
export type AreaFightEndPacket = {
    /** The canvas id. */
    canvas: number,
    /** Whether the area was defended. */
    defended: boolean,
    /** The fight type. */
    fightType: FightType,
    /** Location id. */
    id: FightLocation,
    /** Seconds to next fight. */
    nextFight: number,
    /** The type of the next fight. */
    nextFightType: FightType,
    /** The number of ores gained. */
    ores: number,
    /** The owner of the area. */
    ownedBy: string,
    /** The guild of the area owner. */
    ownedByGuild: string,
    /** The amount of battle points earned. */
    points: number,
    /** The previous owner of the area. */
    previousOwner: string,
    /** The stats of the area. */
    stats: { guild: string, pixels: number, username: string, users: number }[],
    /** The total stats. */
    total: { guilds: number, pixels: number, users: number }
};

/**
 * Represents an area fight bonus chest notification.
 */
export type AreaFightBonusChestPacket = {
    /** The username of the recipient. */
    username: string,
    /** The amount of treasure chests received. */
    amount: number
};

/**
 * Represents an area fight bonus item notification.
 */
export type AreaFightBonusPlayerPacket = {
    /** The username of the recipient. */
    username: string,
    /** The item received. */
    item: number
};

/**
 * Represents an area fight zone change notification.
 */
export type AreaFightZoneChangePacket = {
    /** The ending x-coordinate. */
    xEnd: number,
    /** The starting x-coordinate. */
    xStart: number,
    /** The ending y-coordinate. */
    yEnd: number,
    /** The starting y-coordinate. */
    yStart: number
};

/**
 * Represents chat statistics.
 */
export type ChatStatsPacket = [
    /** The number of connected users. */
    connected: number,
    /** The number of online users. Somehow different than connected, and it's a higher number. */
    onlineCount: number,
    /** The number of users on the painting. */
    onPainting: number | null,
    /** No idea. */
    unknown: number[],
];

/**
 * Represents a system message in chat.
 */
export type ChatSystemMessagePacket = number;

/**
 * Represents a system message deletion in chat.
 */
export type ChatSystemDeletePacket = string;

/**
 * Represents a system announcement in chat.
 */
export type ChatSystemAnnouncePacket = string;

/**
 * Represents a custom message in chat.
 */
export type ChatCustomMessagePacket = string;

/**
 * Represents a painting deletion message in chat.
 */
export type ChatPaintingDeletePacket = string;

/**
 * Represents the loaded state of chat.
 */
export type ChatLoadedPacket = number;

/**
 * Represents a chat message.
 */
export type ChatMessagePacket = {
    /** The username of the sender. */
    username: string,
    /** The color of the message. */
    color: number,
    /** The guild of the sender. */
    guild: string,
    /** The message content. */
    message: string,
    /** Whether the sender is an admin. */
    admin: boolean,
    /** Whether the sender is a moderator. */
    mod: boolean,
    /** Whether the sender is a chat moderator. */
    chatmod: boolean,
    /** Whether the sender has a premium account. */
    premium: boolean,
    /** The icons of the sender. */
    icons: string[],
    /** Whether the message has the rainbow effect. */
    rainbow: boolean,
    /** Whether the message has the Christmas effect. */
    xmas: boolean,
    /** Whether the message has the Halloween effect. */
    halloween: boolean,
    /** The channel of the message. */
    channel: ChatChannel,
    /** The number of golden pixels? idk */
    golden: number,
    /** The mentioned user. */
    mention: string,
    /** The target of the message (whispers only). */
    target: string,
    /** The type of message. */
    type: string,
    /** The number of snowballs on the user. */
    snowballed: number,
    /** The timestamp when the message was created. */
    createdAt: string
};

/**
 * Describes position in queue.
 */
export type QueuePacket = {
    /** Time until out of queue. */
    time: string,
    /** Position in queue. */
    position: string,
}