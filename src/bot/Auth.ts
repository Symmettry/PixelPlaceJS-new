class Auth {

    authKey: string;
    authToken: string;
    authId: string;

    boardId: number;

    constructor(authKey: string, authToken: string, authId: string, boardId: number) {
        this.authKey = authKey;
        this.authToken = authToken;
        this.authId = authId;

        this.boardId = boardId;
    }

}