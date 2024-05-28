import { IAuthData } from "../util/data/Data";

/**
 * Contains authentication data and other info for the pixelplace bot.
 */
export class Auth {

    boardId: number;
    uidManager: boolean;

    authKey: () => string = () => "";
    authToken: () => string = () => "";
    authId: () => string = () => "";

    /**
     * Authentication for pixelplace
     * @param authObj Auth data for pixelplace. Can be created with { authKey: "key", authToken: "token", authId: "id" }
     * @param boardId The board id the account will be on, e.g. 7
     * @param uidManager This will enable the bot's uid manager. This defaults to false and will only work if the bot is premium and can be accessed with bot.uidMan
     */
    constructor(authObj: IAuthData | null, boardId: number, uidManager: boolean = false) {
        // pixelplace auth data
        if(authObj != null) {
            // data is redacted to prevent any eval() calls from stealing auth data. Protects chat bots that stupidly do this
            this.authKey = () => {
                const data = authObj.authKey;
                authObj.authKey = "[REDACTED]";
                return data;
            }
            this.authToken = () => {
                const data = authObj.authToken;
                authObj.authToken = "[REDACTED]";
                return data;
            }
            this.authId = () => {
                const data = authObj.authId;
                authObj.authId = "[REDACTED]";
                return data;
            }
        }

        this.boardId = boardId;
        this.uidManager = uidManager;
    }

    /**
     * Generates empty auth data for a logged out account.
     * @param boardId The board id the account will be on, e.g. 7
     * @param uidManager This will enable the bot's uid manager. This defaults to false and will only work if the bot is premium and can be accessed with bot.uidMan
     * @returns An empty auth data
     */
    static empty(boardId: number, uidManager: boolean = false): Auth {
        return new Auth(null, boardId, uidManager);
    }

}