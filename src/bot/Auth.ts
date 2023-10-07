export class Auth {

    authKey: string;
    authToken: string;
    authId: string;

    boardId: number;

    isPremium: boolean;

    constructor(authObj: {[key: string]: string}, boardId: number, isPremium: boolean=false) {
        this.authKey = authObj.authKey;
        this.authToken = authObj.authToken;
        this.authId = authObj.authId;

        this.boardId = boardId;

        this.isPremium = isPremium;
        if(isPremium) {
            console.log("~~INFO~~ An auth was defined as premium, if the account is not premium it will send warnings.");
        }
    }

}