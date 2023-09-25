const { getPalive } = require("./util/PAlive.js");
const { Canvas } = require("./util/Canvas.js");
const WebSocket = require('ws');

class PixelPlaceError extends Error { }

class PixelPlace {
    
    constructor(authKey, authToken, authId, boardId) {
        Object.defineProperty(this, 'authKey', {value: authKey, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authToken', {value: authToken, writable: false, enumerable: true, configurable: false});
        Object.defineProperty(this, 'authId', {value: authId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'boardId', {value: boardId, writable: false, enumerable: true, configurable: false});

        Object.defineProperty(this, 'listeners', {value: new Map(), writable: false, enumerable: true, configurable: false});
    }

    on(key, func) {
        if(!this.listeners.has(key)) this.listeners.set(key, []);
        this.listeners.get(key).push(func);
    }

    async Init() {
        return new Promise((resolve, reject) => {
            // Connect to PixelPlace
            const socket = new WebSocket('wss://pixelplace.io/socket.io/?EIO=4&transport=websocket');

            // Create the canvas
            Object.defineProperty(this, 'canvas', {value: new Canvas(this.boardId), writable: false, enumerable: true, configurable: false});
            
            this.pixels = [];

            socket.on('open', () => {
                resolve(); // await pp.Init();

                var pixelplacer = () => {
                    if(this.pixels.length > 0) {
                        var [x, y, col, brush] = this.pixels.shift();
                        socket.send(`42["p", [${x}, ${y}, ${col}, ${brush}]]`)
                    }
                    setTimeout(pixelplacer, 20);
                }
                pixelplacer();
            });

            socket.on('message', (data) => {
                data = data.toString(); // buffer -> string
                
                // Gets the data and ID of the response
                let index = data.indexOf("{");
                var cube = data.indexOf("[");
                if (index === -1 || (cube < index && cube != -1)) {
                    index = cube;
                }
                const json = index !== -1 ? index : -1; 
                var id = json == -1 ? data : data.substring(0, json);

                // if JSON, parse, else keep it
                var message = json == -1 ? data.substring(id.length) : JSON.parse(data.substring(json));

                switch(id) {
                    case "0": // socket.io start
                        socket.send("40");
                        break;
                    case "40": // socket.io finish
                        socket.send(`42["init",{"authKey":"${this.authKey}","authToken":"${this.authToken}","authId":"${this.authId}","boardId":${this.boardId}}]`);
                        break;
                    case "2": // socket.io keepalive
                        socket.send("3");
                        break;
                    case "42": // message
                        var key = message[0];
                        var value = message[1];
                        if(this.listeners.has(key)) { // if there are listeners for this key
                            this.listeners.get(key).forEach(listener => listener(value)); // then send the value!
                        }
                        switch(key) {
                            case "ping.alive": // pixelplace keepalive
                                socket.send(`42["pong.alive", "${getPalive()}"]`)
                                break;
                            case "canvas": // why are these 2 separate keys? they do the same thing owmince lol
                            case "p": // pixels
                                this.canvas.loadCanvasData(value);
                                break;
                        }
                        break;
                }
            });

            socket.on('close', () => {
                console.log('PPJS Closed.');
            });

            socket.on('error', (error) => {
                console.error('PPJS error:', error);
                reject(); // error, reject promise
            });
        });
    }

    getPixelAt(x, y) {
        return this.canvas.get(x, y);
    }

    getColorId(r, g, b) {
        return this.canvas.getColorId(r, g, b);
    }

    placePixel(x, y, col, brush=1) {
        this.pixels.push([x, y, col, brush]);
    }

}

var Packets = {};
Packets["INIT"] = "init";
Packets["PIXEL"] = "p";
Packets["JOIN"] = "j";
Packets["LEAVE"] = "l";
Packets["PALIVE"] = "ping.alive";
Packets["POALIVE"] = "pong.alive";
Packets["NEW_CHAT_MESSAGE"] = "chat.user.message";
Packets["DELETE_CHAT_MESSAGE"] = "chat.system.delete";
Packets["CHAT_LOADED"] = "chat.messages.loaded";
Packets["CHAT_SEND_MESSAGE"] = "chat.message";
Packets["CANVAS"] = "canvas";
Packets["CHAT_STATS"] = "chat.stats";
Packets["RATE_CHANGE"] = "rate_change";
Packets["FIGHT_START"] = "area_fight_start";
Packets["FIGHT_END"] = "area_fight_end";
Packets["ERROR"] = "throw.error";
Packets["ITEM_USED"] = "item.notification.use";
Packets["PREMIUM_MOD"] = "premium.mod";
Packets["SAVE_TRACKING_CACHE"] = "save.tracking.cache";
Packets["SAVE_TRACKING_PENDING"] = "save.tracking.pending";
Packets["QUEUE"] = "queue";
Packets["SPECIAL_ERROR"] = "throw.error.special";
Packets["PROTECTION"] = "protection";
Packets["COOLDOWN"] = "cooldown";
Packets["COOLDOWN_DOT"] = "cooldown_dot";
Packets["RELOAD"] = "reload";
Packets["CANVAS_ACCESS_REQUESTED"] = "canvas.access.requested";
Packets["USER_PROFILE"] = "user.profile";
Packets["PAINTING_PLAYERS"] = "painting.players";
Packets["HOT_PAINTINGS"] = "hot.paintings";
Packets["COINS_GIFT_NOTIFICATION"] = "coins.notification.gift";
Packets["GOLDEN_NOTIFICATION"] = "golden.notification";
Packets["ITEM_NOTIFICATION_SNOWBALL"] = "item.notification.snowball";
Packets["ITEM_NOTIFICATION_GIFT"] = "item.notification.gift";
Packets["CHAT_SYSTEM_MESSAGE"] = "chat.system.message";
Packets["CANVAS_SUCCESS"] = "canvas.success";
Packets["CANVAS_ALERT"] = "canvas.alert";
Packets["CHAT_CUSTOM_MESSAGE"] = "chat.custom.message";
Packets["CHAT_CUSTOM_ANNOUNCE"] = "chat.custom.announce";
Packets["CHAT_PAINTING_DELETE"] = "chat.painting.delete";
Packets["CHAT_SYSTEM_DELETE"] = "chat.system.delete";
Packets["CHAT_MESSAGES_LOADED"] = "chat.messages.loaded";
Packets["CHAT_COMMAND"] = "chat.command";
Packets["AREAS"] = "areas";
Packets["SERVER_TIME"] = "server_time";
Packets["USERNAME"] = "username";

module.exports = { PixelPlace, Packets };