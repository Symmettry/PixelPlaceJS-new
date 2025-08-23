export enum ServerPackets {
    CUSTOM = 0,
    CODE = 1,
    SETTINGS = 2,
    SOCKET_SEND = 3,
    MENU_DATA = 4,
    MENU_CHANGE = 5,
    ADD_TO_MENU = 6,
}

export enum ClientPackets {
    /** Custom data; anything you make it do */
    CUSTOM = 0,
    /** Socket data; from the pixelplace socket */
    SOCKET_DATA = 1,
    /** JSON of info like userId, boardId, premium status, etc. */
    INFO = 2,
    /** Sends canvas data */
    CANVAS_ONE = 3,
    /** 3000*3000=9,000,000 which is 8.5mb and more than the 8mb max.... sigh */
    CANVAS_TWO = 4,
    /** Whenever the browser by default tries to send a packet (like if you manually draw) this will call with packetData.  */
    PACKET_REQUEST = 5,
    /** UUID Callbacks from UI input */
    REQUEST_CALLBACK = 6,
}

/** Events through the socket */
export enum SocketEvent {
    /** Userscript connected */
    CONNECTION,
    /** Userscript disconnected */
    DISCONNECTION,
    /** Custom data received */
    CUSTOM_DATA,
    /** PXP Socket data received */
    SOCKET_DATA,
}

/** Settings for browser connections to userscript */
export type BrowserSettings = {
    /** If the connected clients should be turned into bots; they will send all messages and requests through this. It will bypass cloudflare too! */
    browserClient: boolean;
    /** Prints a lot of debug information */
    debugger: boolean;
    /** Debugger clear lines */
    lineClears: boolean;
};

export enum PixelPipeType {
    /** Adds pixels to the bots pixel queue */
    QUEUE_TO_BACK,
    /** Adds pixels to the front of the pixel queue */
    QUEUE_TO_FRONT,
    /** Pauses the bots pixel queue to place the pixels */
    PAUSE,
    /** Allows pixel packet to be sent normally, only should really be used if you freeze the bot or aren't pixeling with it. */
    ALLOW,
}
export type PixelPipeSettings = {
    /** How the pixels are piped; defaults to QUEUE_TO_FRONT */
    pipeType?: PixelPipeType;
    /** If you pixel on a protected pixel it'll replace the color. Defaults to true. */
    replaceProtection?: boolean;
    /** Disallow placing pixels on protected areas */
    defendProtection?: boolean;
}

/** Takes in the arguments and will respond with the output or empty */
export type ChatCommand = (args: string[]) => Promise<string | null>;

/** Maps commands to functions */
export type ChatCommandSet = {[key: string]: ChatCommand};

/** Code that is eval'd on the browser */
export type EvalString = string;