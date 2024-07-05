/**
 * All error codes from throw.error (that are useful)
 */
export enum PPError {
    LOGGED_OUT = 0,
    SESSION_EXPIRE = 1,
    SELECT_USERNAME = 2,
    INVALID_COLOR = 3,
    PREMIUM_COLOR = 4,
    INVALID_COORDINATES = 5,
    CANVAS_DISABLED = 6,
    PREMIUM_ENDED_CANVAS = 7,
    COOLDOWN = 8,
    PRIVATE_CANVAS = 9,
    NEED_CANVAS_APPROVAL = 10,
    PLACING_TOO_FAST = 11,
    CANVAS_TERMINATED = 12,
    ERROR_CANVAS_DATA = 13,
    ERROR_CANVAS_ACCESS_DATA = 14,
    TOO_MANY_INSTANCES = 15,
    TOO_MANY_USERS_INTERNET = 16,
    PIXELPLACE_DISABLED = 17,
    SERVER_FULL = 18,
    RELOADING = 19,
    ACCOUNT_DISABLED = 20,
    PREMIUM_ISLAND_MESSAGE = 21,
    USER_OFFLINE = 22,
    SERVERS_FULL_AGAIN = 23,
    NEED_TO_BE_CONNECTED = 24,
    MESSAGES_TOO_FAST = 25,
    ACCOUNT_SUSPENDED_FROM_CHAT = 26,
    ACCOUNT_BANNED_FROM_CHAT = 27,
    NEED_USERNAME = 28,
    CANT_SEND_COMMANDS = 29,
    NEED_JOIN_GUILD = 30,
    NEED_PREMIUM = 31,
    PAINTING_ARCHIVED = 32,
    SERVERS_FULL_LIMITED_PER_USER = 33,
    SERVERS_FULL_LIMITED_PER_INTERNET = 34,
    GUILD_DISBANDED = 35,
    KICKED_FROM_GUILD = 36,
    RELOAD_PAGE = 39,
    INVALID_AUTH = 49,
    TOO_MANY_PACKETS = 50,
}
/**
 * A mapping of error codes to the message.
 */
export const ErrorMessages = {
    0: "You need to login on pixelplace.io first. Create an account, it's free!",
    1: "Your session expired, please refresh the page",
    2: "You need to create a username first",
    3: "Color not found",
    4: "This color is only available to premium subscribers",
    5: "Wrong coordinates",
    6: "This canvas has been temporarily disabled because its owner used premium settings on it and his membership has expired. Please wait for the owner to renew his premium membership or to revert canvas settings to non premium ones",
    7: "Your premium membership has expired and this canvas is using premium settings. To continue, please renew your membership or revert canvas settings back to non premium ones",
    8: "Please wait until the end of your cooldown",
    9: "This canvas is private, you can't draw on it",
    10: "To be able to place pixels on this canvas, you have to request approval from the owner",
    11: "You are placing pixels too fast, please slow down",
    12: "This canvas is terminated",
    13: "Error while getting canvas data",
    14: "Error while getting canvas access data",
    15: "You have too many instances of pixelplace.io opened, please close some windows/tabs. If you are using a proxy or shared connection, you may need to switch to a private one",
    16: "Too many users share your internet connection. If you are using a proxy or shared connection, you may need to switch to a private one or another proxy location",
    17: "Pixelplace.io has been disabled for your internet connection (are you  using a proxy ?)",
    18: "Server is full, please try again later",
    19: "Reloading..",
    20: "Your account has been temporarily disabled for placing pixels and/or sending messages too fast, try again in 5 minutes",
    21: "You need to be a Premium subscriber to draw on Prime Island",
    22: "User offline",
    23: "Servers full, please wait",
    24: "You need to be connected before sending messages",
    25: "You are sending messages too fast",
    26: "Your account is still suspended from the chat (temporarily)",
    27: "Your account is permanently banned from the chat, please contact moderators on discord or support@pixelplace.io if you need help",
    28: "You need to create a username before sending messages",
    29: "You are not allowed to send commands",
    30: "You need to join a Guild first",
    31: "You need to be a premium subscriber",
    32: "Painting archived",
    33: "Servers are full, we are limiting instances of pixelplace.io opened per user, please close some windows/tabs",
    34: "Servers are full, we are limiting instances of pixelplace.io opened per internet connections, please close some windows/tabs. If you are using a proxy or shared connection, you may need to switch to a private one",
    35: "Guild leader disbanded guild",
    36: "Kicked from guild",
    
    37: "Disconnect in 4 seconds",
    39: "Disconnect in 4 seconds -- consuming items and stuff",
    40: "Disconnect in 1 second",
    41: "Disconnect in 4 seconds",

    // throw.error.special!
    42: "This error tells the website to reload items in 1.5 seconds.",
    43: "Disconnect in 4 seconds with a special error message.",

    // coin island stuff
    44: "Says 'Welcome to Coin Island!' and disconnects you",
    45: "Says 'Welcome to Tiny Coin Island #1!' and disconnects you",
    46: "Says 'Welcome to Tiny Coin Island #2!' and disconnects you",
    47: "Says 'Welcome to Tiny Coin Island #3!' and disconnects you",

    // auth id
    49: "Invalid Auth Id",

    // request spam
    50: "Too much requests coming from your internet connection. Please wait a minute and refresh your page. Are you using a proxy or public/shared connection?",
};