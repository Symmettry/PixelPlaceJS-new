export declare class Auth {
    authKey: string;
    authToken: string;
    authId: string;
    boardId: number;
    constructor(authObj: {
        [key: string]: string;
    }, boardId: number);
}
