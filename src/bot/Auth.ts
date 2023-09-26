export class Auth {

    authKey: string;
    authToken: string;
    authId: string;

    boardId: number;

    constructor(authObj: {[key: string]: string}, boardId: number) {
        this.authKey = authObj.authKey;
        this.authToken = authObj.authToken;
        this.authId = authObj.authId;

        this.boardId = boardId;
    }

}