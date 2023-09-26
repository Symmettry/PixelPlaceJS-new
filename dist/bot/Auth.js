"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Auth = void 0;
var Auth = /** @class */ (function () {
    function Auth(authObj, boardId) {
        this.authKey = authObj.authKey;
        this.authToken = authObj.authToken;
        this.authId = authObj.authId;
        this.boardId = boardId;
    }
    return Auth;
}());
exports.Auth = Auth;
