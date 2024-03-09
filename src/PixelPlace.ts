import { Bot } from "./bot/Bot";
import { Auth } from "./bot/Auth";

class PixelPlace {

    bots: Bot[];

    constructor(auths: Auth[], autoRestart: boolean = true, handleErrors: boolean = true) {
        this.bots = [];
        auths.forEach(auth => {
            this.bots.push(new Bot(auth, autoRestart, handleErrors)); // create each bot instance
        });
    }

    async Init(): Promise<void> {
        return new Promise<void>((resolve) => {
            Promise.all(this.bots.map(bot => bot.Init())).then(() => setTimeout(resolve, 3000));
        });
    }

}

export { PixelPlace };