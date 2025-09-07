import { ServerClient } from "../../browser/client/ServerClient";
import { constant } from "../../util/Constant";
import { IAuthData, IBotParams } from "../../util/data/Data";
import { MessageTuple, PacketResponseMap, PixelConfirmPacket, PixelPacket } from "../../util/packets/PacketResponses";
import { Packets, RECEIVED } from "../../util/packets/Packets";
import { Connection } from "./Connection";
import { InternalListeners } from "./InternalListeners";

export type PacketListeners = Map<string | Packets, [func: (...args: any) => void | ((args: any) => void), pre: boolean][]>;

export class PacketHandler {

    private connection!: Connection;

    private authKey!: string;
    private authToken!: string;
    private authId!: string;

    internalListeners!: InternalListeners;
    listeners!: PacketListeners;

    constructor(connection: Connection, params: IBotParams | ServerClient) {
        constant(this, 'connection', connection);

        constant(this, 'listeners', new Map());

        if(!(params instanceof ServerClient)) this.updateAuth((params as IBotParams).authData);

        this.internalListeners = new InternalListeners(connection.bot, connection);
    }

    updateAuth(authData: IAuthData): void {
        this.authKey = authData.authKey;
        this.authToken = authData.authToken;
        this.authId = authData.authId;
    }

    async evaluatePacket(data: string) {
        if(this.listeners.has(Packets.RECEIVED.LIB_RAW)) {
            this.listeners.get(Packets.RECEIVED.LIB_RAW)?.forEach(listener => listener[0](data));
        }
                
        // Gets the data and ID of the response. This is quite ugly but who cares fr!!!
        let index = data.indexOf("{"); // brace
        const cube = data.indexOf("["); // box
        if (index === -1 || (cube < index && cube != -1)) { 
            // if there is no brace or if the box is behind the brace & exists.
            index = cube;
        }
        // if there is a brace/box, we will substring to get the id & json, otherwise we will leave it as is
        const json = index !== -1 ? index : -1;
        const id = json == -1 ? data : data.substring(0, json);

        // if JSON, parse, else keep it
        let message;
        try {
            message = json == -1 ? data.substring(id.length) : JSON.parse(data.substring(json));
        } catch (error) {
            message = data.substring(id.length);
            console.log(`Error parsing packet:\n- DATA: ${data}\n- ERROR: ${error}`);
        }
        switch(id) {
            case "0": // socket.io start
                this.connection.send("40");
                break;
            case "40": // socket.io finish
                if(!this.authKey || !this.authId || !this.authToken) {
                    this.connection.emit(Packets.SENT.INIT, {authId: "", boardId: this.connection.boardId});
                } else {
                    this.connection.sendInit(this.authKey, this.authToken, this.authId, this.connection.boardId);
                }
                //this.authKey = this.authToken = this.authId = "[REDACTED]";

                setTimeout(() => {
                    if(!this.connection.connected) {
                        console.error("Pixelplace has not responded in 10 seconds! Verify your auth data is correct and that pixelplace is online!");
                    }
                }, 10000);
                break;
            case "2": // socket.io keepalive
                this.connection.send("3");
                break;
            case "42": {// message
                this.handlePXPMessage(message);
            }
        }
    }

    private async handlePXPMessage<T extends keyof PacketResponseMap>(message: MessageTuple<T>) {
        let key: keyof PacketResponseMap = message[0];
        let value: PacketResponseMap[typeof key] = message[1] as PacketResponseMap[typeof key];

        if (key == RECEIVED.PIXEL) {
            const pixel = value as PixelPacket;
            if (pixel.length == 1 && pixel[0][4] == this.connection.bot.userId) {
                key = RECEIVED.PIXEL_CONFIRM;
                value = message[1] as PixelConfirmPacket;
            }
        }

        // Packet listeners pre
        this.announce(key, value, true);

        // built-in functions, e.g. keepalive and pixels.
        this.announceInternal(key, value);

        // Packet listeners post
        this.announce(key, value, false);
    }

    private announce<T extends keyof RECEIVED>(key: RECEIVED[T], value: unknown, pre: boolean) {
        // per-key
        if(this.listeners.has(key)) { // if there are listeners for this key
            this.listeners.get(key)?.forEach(listener => listener[1] == pre && listener[0](value)); // then send the value!
        }
        // all-keys
        if(this.listeners.has(Packets.RECEIVED.LIB_ALL)) {
            this.listeners.get(Packets.RECEIVED.LIB_ALL)?.forEach(listener => listener[1] == pre && listener[0](key, value));
        }
    }

    private announceInternal<T extends keyof RECEIVED>(key: RECEIVED[T], value: unknown) {
        if(!this.internalListeners.map.has(key)) return;
        this.internalListeners.map.get(key)?.forEach(listener => listener[0](value));
    }

}
