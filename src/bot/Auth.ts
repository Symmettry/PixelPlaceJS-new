import { IAuthData } from "../util/data/Data";

export class Auth {

    boardId: number;
    authKey: () => string = () => "";
    authToken: () => string = () => "";
    authId: () => string = () => "";

    constructor(authObj: IAuthData | null, boardId: number) {
        // pixelplace auth data
        if(authObj != null) {
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
    }

    static empty(boardId: number): Auth {
        return new Auth(null, boardId);
    }

}