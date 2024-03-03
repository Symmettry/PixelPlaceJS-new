import { IAuthData } from "../util/data/Data";

export class Auth {

    authKey: string = "-";
    authToken: string = "-";
    authId: string = "-";

    boardId: number;

    constructor(authObj: IAuthData | boolean, boardId: number) {
        // pixelplace auth data
        if(typeof authObj != "boolean") {
            this.authKey = authObj.authKey;
            this.authToken = authObj.authToken;
            this.authId = authObj.authId;
        }

        this.boardId = boardId;
    }

    static empty(boardId: number): Auth {
        return new Auth(true, boardId);
    }

}