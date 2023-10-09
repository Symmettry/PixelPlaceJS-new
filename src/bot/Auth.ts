import { IAuthData } from "../util/data/Data";

export class Auth {

    authKey: string;
    authToken: string;
    authId: string;

    boardId: number;

    constructor(authObj: IAuthData, boardId: number) {
        this.authKey = authObj.authKey;
        this.authToken = authObj.authToken;
        this.authId = authObj.authId;

        this.boardId = boardId;
    }

}