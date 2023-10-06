import { Bot } from "./bot/Bot";
import { Auth } from "./bot/Auth";

class PixelPlace {

    bots: Bot[];

    constructor(auths: Auth[]) {
        this.bots = [];
        auths.forEach(auth => {
            this.bots.push(new Bot(auth));
        })
    }

    async Init(): Promise<void> {
        return new Promise<void>(async (resolve, _reject) => {
            await Promise.all(this.bots.map(bot => bot.Init()));
            setTimeout(resolve, 3000);
        });
    }

}

export { Auth, PixelPlace };