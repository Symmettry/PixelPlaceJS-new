import { Color } from "../data/Color";
import { BoardID, ChatChannel } from "../data/Data";
import { SENT } from "./Packets";

export interface PacketSendMap {

    [SENT.INIT]: ClientInitPacket,

    [SENT.PIXEL]: ClientPixelPacket,

    [SENT.PONG_ALIVE]: ClientPongPacket,

    [SENT.CHAT_COMMAND]: ClientChatCommandPacket,
    [SENT.CHAT_MESSAGE]: ClientChatMessagePacket,

    [SENT.USER_PROFILE]: ClientUserProfilePacket,
    [SENT.USERS_PROFILE]: ClientUsersProfilePacket,
    [SENT.USERNAME]: ClientUsernamePacket,

    [SENT.HOT_PAINTINGS]: null,
    [SENT.PAINTING_PLAYERS]: ClientPaintingPlayersPacket,
    [SENT.PAINTING_COMMAND]: ClientPaintingCommandPacket,

    [SENT.SAVE_TRACKING_PENDING]: ClientSaveTrackingPendingPacket,

    [SENT.HB]: ClientHBPacket,

    [SENT.SNOWBALL]: ClientSnowballPacket,

}

/** Packet sent when initiating pixel place. Describes the account. */
export type ClientInitPacket = {

    /** The authentication key for the bot. Non-logged in accounts will have this empty. */
    authKey?: string,
    /** The authentication token for the bot. Non-logged in accounts will have this empty. */
    authToken?: string,
    /** The authentication key for the bot. This can not be empty. */
    authId: string,

    /** The canvas id the bot will reside on. This can not be empty. */
    boardId: number,

};

/** Sent to place pixels. */
export type ClientPixelPacket = [

    /** X position of the pixel. */
    x: number,
    /** Y position of the pixel. */
    y: number,
    
    /** Color of the pixel. -100 is ocean color for mods */
    color: Color | -100,

    /** Brush number of the pixel. Default is 1. */
    brush: number,

];

/** Keepalive for the server, for ratelimit and stuff. Value is the pong data. */
export type ClientPongPacket = string;

/** Commands like /ban and /unban on paintings. */
export type ClientPaintingCommandPacket = {
    cmd: string, // usually "/ban" or "/unban" (contains the / as well)
    target: string, // name of person being targeted by the commaind
    boardId: BoardID, // board id.
};

/** Converts user ids to user names. This requires premium on pixelplace. Value is a user id. */
export type ClientUsernamePacket = number;

/** Serialized data for chat messages. */
export type ClientChatMessagePacket = {
    /** The message being sent. */
    text: string,
    /** The type of chat to send the message to. */
    type: ChatChannel,
    /** Targeted user; this is the username for who you're whispering to. Empty for normal chat messages, since it won't do anything. */
    target: string,
    /** Mentioned user. Will be empty string if you don't ping anyone. */
    mention: string,
    /** The color of the message being sent. */
    color: Color,
};

/** Something something pixelplace staff command. */
export type ClientChatCommandPacket = {
    cmd: string,
    type: unknown,
};

/** Returns information on whether a user is online along with information on them. Value is their username (not user id). */
export type ClientUserProfilePacket = string;

/** Does the same as ClientUserProfilePacket but it can contain multiple usernames. On pixelplace it's used for guild & follower info. */
export type ClientUsersProfilePacket = ClientUserProfilePacket[];

/** Returns all the users on a painting. Value is the canvas id. */
export type ClientPaintingPlayersPacket = number;

/** I dunno. Value is the canvas id. */
export type ClientSaveTrackingPendingPacket = number;

/** No idea. The client sends this every so often with value " " */
export type ClientHBPacket = string;

export type ClientSnowballPacket = {
    /** Owmince why did you add "/snowball" to the snowball packet when it's another packet??????? WHY?! */
    cmd: "/snowball",
    /** Username of person to give snowball effect to. */
    target: string,
};