import { randomUUID, UUID } from "crypto";
import { Menu, MenuData, MenuObject } from "./MenuData";

// don't ask

function convertStyle(style?: string | CSSStyleSheet) {
    if(!style || typeof style == 'string') return style ?? "";
    return Array.from(style.cssRules)
        .map(rule => rule.cssText)
        .join("\n");
}

function createEvalCall(client: string, uuid: UUID, obj: MenuObject): string {
    obj.id ??= "of_" + uuid;
    return `() => { ${client}; requestCallback("${uuid}"${obj.type == 'toggle' ? `, id("${obj.id}").checked` : ""}); }`;
}

export function convertObject(obj: MenuObject): [eval: string | null, obj: any, callback: [UUID, Function] | null] {
    const o: any = {...obj};
    if(o.onClick) {
        let ev: string | null = null, cb: [UUID, Function] | null = null;
        switch(typeof o.onClick) {
            case 'string': {
                // it'll keep it as an eval
                break;
            }
            case 'function': {
                // gotta make a callback
                const uuid = randomUUID();
                cb = [uuid, o.onClick];
                o.onClick = createEvalCall("", uuid, obj);
                break;
            }
            case 'object': {
                // make both!
                const { client, server } = o.onClick;
                const uuid = randomUUID();
                cb = [uuid, server];
                o.onClick = createEvalCall(client, uuid, obj);
            }
        }
        o.id = obj.id;
        return [ev, o, cb];
    }
    if(o.textStyle) {
        o.textStyle = convertStyle(o.textStyle);
    }
    return [null, o, null];
}

export function convertMenu(menu: Menu) {
    let evv = "", cbb: any = {};
    const style = convertStyle(menu.style);
    const objects = menu.objects.map((o: MenuObject) => {
        const [evalValue, obj, cb] = convertObject(o);
        if(evalValue) evv += evalValue + "\n";
        if(cb) cbb[cb[0]] = cb[1];
        return obj;
    });
    return { evv, cbb, d: { style, objects } };
}

export function menuToWire(data: MenuData): [eval: string, menu: string, callbacks: {[key: UUID]: Function}] {
    let ev = "", me: any = {}, callbacks: any = {};
    for(const [tag, menu] of Object.entries(data)) {
        const { d, evv, cbb } = convertMenu(menu);
        ev += evv;
        Object.entries(cbb).forEach(([uuid, func]) => callbacks[uuid] = func);
        me[tag] = d;
    }
    return [ev, JSON.stringify(me), callbacks];
}