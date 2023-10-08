import { Bot } from "./bot/Bot";
import { Auth } from "./bot/Auth";

class PixelPlace {

    bots: Bot[];

    constructor(auths: Auth[], autoRestart: boolean = true) {
        this.bots = [];
        auths.forEach(auth => {
            this.bots.push(new Bot(auth, autoRestart));
        })
    }

    async Init(): Promise<void> {
        return new Promise<void>(async (resolve, _reject) => {
            await Promise.all(this.bots.map(bot => bot.Init()));
            setTimeout(resolve, 3000);
        });
    }

}

export { PixelPlace };