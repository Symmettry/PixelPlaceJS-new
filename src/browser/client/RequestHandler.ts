import { Color } from "../../util/data/Color";
import { QueueSide } from "../../util/data/Data";
import { Packets } from "../../util/packets/Packets";
import {  ChatCommandSet, ClientPackets, PixelPipeSettings, PixelPipeType } from "../SocketData";
import { ServerClient } from "./ServerClient";

export class RequestHandler {

    private client: ServerClient;

    pixelPipeSettings: PixelPipeSettings | null = null;

    private listeners: {[key: string]: (data: any) => Promise<boolean>} = {};

    private commandSet: ChatCommandSet | null = null;
    private commandPrefix: string | null = null;

    constructor(client: ServerClient) {
        this.client = client;

        this.client.onPacket(ClientPackets.PACKET_REQUEST, async (data) => {
            if(!data.startsWith("42")) return;

            const [key, d] = JSON.parse(data.substring(2));
            
            if(this.listeners[key]) {
                const cancel = await this.listeners[key](d);
                if(cancel) return;
                this.client.send(data);
            }
        })
        this.listeners[Packets.SENT.PIXEL] = this.pixel.bind(this);
        this.listeners[Packets.SENT.USERNAME] = this.username.bind(this);

        this.listeners[Packets.SENT.CHAT_MESSAGE] = this.chatMessage.bind(this);
    }

    allowPackets(...packets: string[]): void {
        for(const packet of packets) {
            const og = this.listeners[packet];
            this.listeners[packet] = async (d) => {
                return og ? og(d) : false;
            }
        }
    }

    writeCommands(prefix: string, commands: ChatCommandSet) {
        this.commandSet = commands;
        this.commandPrefix = prefix;
    }

    private async username(d: any): Promise<boolean> {
        const name = await this.client.bot!.getUsername(d);
        this.client.sendCode(`window.ppHandler(new MessageEvent("message", { data: '42["username",{"id":${d},"name":"${name}"}]' }));`);
        return false;
    }

    private async pixel(d: any): Promise<boolean> {
        if(!this.pixelPipeSettings) return true;

        const { defendProtection = false, replaceProtection = true, pipeType = PixelPipeType.QUEUE_TO_FRONT } = this.pixelPipeSettings;

        const [x,y,col,brush] = d;
        const isProtected = this.client.bot!.isProtected(x, y);
        if(defendProtection && isProtected) return true;

        switch(pipeType) {
            case PixelPipeType.QUEUE_TO_FRONT:
            case PixelPipeType.QUEUE_TO_BACK: {
                this.client.bot!.placePixel({
                    x, y,
                    col, brush,
                    protect: replaceProtection && isProtected,
                    force: true,
                    wars: true,
                    side: pipeType == PixelPipeType.QUEUE_TO_BACK ? QueueSide.BACK : QueueSide.FRONT,
                });
                return true;
            }
            case PixelPipeType.PAUSE: {
                this.client.bot!.specialQueueInfo = { amount: -1, time: 2000, start: Date.now() };
                return false;
            }
            case PixelPipeType.ALLOW: {
                return false;
            }
        }
    }
      
    private async chatMessage(d: any): Promise<boolean> {
        if(!this.commandPrefix || !this.commandSet) return false;

        const msg = d.text;
        if(!msg.startsWith(this.commandPrefix)) return false;

        this.client.fakeChat({
            username: this.client.username,
            color: Color.LIGHT_GRAY,
            message: msg,
        });

        const reply = (message: string): boolean => {
            this.client.fakeChat({ message });
            return true;
        };

        const args = msg.substring(this.commandPrefix.length).split(" ");
        const cmd = args.shift();
        if(!this.commandSet[cmd]) return reply("Unknown command!");

        const response = await this.commandSet[cmd](args);
        if(!response) return true;

        return reply(response);
    }

}