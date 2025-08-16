import fs from 'fs';
import { Bot, IBotParams, Modes, PixelPlace } from '..';
import { Color } from '../util/data/Color';
import { IImage, IPixel } from '../util/data/Data';

type Args = { [key: string]: [string | number | boolean | CallData, string] };
type RuntimeArgs = { [key: string]: string | number | boolean }

type ArgsFunc = () => RuntimeArgs;
type ExpectFunc = (...args: (string | [string, string])[]) => RuntimeArgs;
type OptionalFunc = (...args: [string, any][]) => RuntimeArgs;
type ErrorFunc = (err: any) => void;
type OnlyFunc = (...args: string[]) => void;

type CallData = [name: string, args: Args];

interface Command {
    cmd: string,
    args: ArgsFunc,
    expect: ExpectFunc;
    optional: OptionalFunc;
    error: ErrorFunc;
    only: OnlyFunc;
}

export class PPScript {

    private data: string;
    private commands: Command[] = [];

    private loggedIn: boolean = false;

    private params: {[key: string]: IBotParams} = {};
    private bots: {[key: string]: Bot} = {};

    private pp: PixelPlace | undefined = undefined;

    private variables: {[key: string]: any} = {};

    private internalFunctions: {[key: string]: Function} = {
        js: (args: RuntimeArgs, error: ErrorFunc) => {
            if(!args.string0) error("Need a string to process!");
            return eval(args.string0 as string);
        }
    };

    private functions: {[key: string]: Function} = {

    };

    constructor(file: string) {
        if(!fs.existsSync(file))
            this.throwError(`Unknown file: '${file}'`);

        if(!file.endsWith(".ppscript"))
            this.throwError(`Invalid file: '${file}'`);

        this.data = fs.readFileSync(file, 'utf-8');

        this.parse();
    }

    private throwError(string: string) {
        console.log("Error:", string);
        process.exit();
    }

    private parseValue(key: string, val: string, parts: string[], i: number, endWhenFind?: string): [number, string | boolean | number | CallData, string] {
        if(val.startsWith('"')) {
            if(val.endsWith('"')) return [i, val.substring(1, val.length - 1), 'string'];
            
            let string = val.substring(1);

            let j = i + 1;
            for(;j<parts.length;j++) {
                const strPart = parts[j];
                if(strPart.endsWith('"')) {
                    string += " " + strPart.slice(0, -1);
                    break;
                }
                if(strPart.endsWith('"' + endWhenFind)) {
                    string += " " + strPart.slice(0, -2);
                    break;
                }
                string += " " + strPart;
            }
            return [j, string, 'string'];
        }
        const num = parseFloat(val);
        if(!isNaN(num)) return [i, num, 'number'];
        const lower = val.toLowerCase();
        if(lower == 'true'  || lower == 'yes') return [i, true , 'boolean'];
        if(lower == 'false' || lower == 'no' ) return [i, false, 'boolean'];

        if(val.includes("(")) {
            const ident = val.substring(0, val.indexOf("("));
            if(val.endsWith(")")) {
                const next = val.substring(val.indexOf("(") + 1, val.length - 1);
                let args = {};
                if(next.length > 0) {
                    this.parseArg(args, [next], i);
                }
                return [i, [ident, args], 'call'];
            }
            const slice = parts.slice(i);
            slice[0] = slice[0].substring(key.length + ident.length + 2);
            let args: Args = this.parseArgs(slice, ')');
            return [i, [ident, args], 'call'];
        }

        return [i, val, 'identifier'];
    }

    private parseArg(args: Args, parts: string[], i: number, endWhenFind?: string): number {
        let part = parts[i];

        if(part.startsWith("#")) return parts.length;

        let end = false;
        if(endWhenFind && part.endsWith(endWhenFind)) {
            part = part.slice(0, -1);
            end = true;
        }

        const eq = part.indexOf("=");
        if(eq == -1) {
            if(part.endsWith(":")) {
                switch(part.slice(0, -1)) {
                    case "forever":
                        args['number0'] = [Infinity, 'number'];
                        break;
                }
                return end ? parts.length : i;
            }

            const [newI, value, type] = this.parseValue("", part, parts, i, endWhenFind);
            if(type == 'identifier') {
                args[value as string] = [value, type];
            } else {
                let index = 0;
                while(args.hasOwnProperty(type + index)) index++;
                args[type + index] = [value, type];
            }
            return end ? parts.length : newI;
        }

        const key = part.substring(0, eq);

        const val = part.substring(eq + 1, part.length);

        const [newI, value, type] = this.parseValue(key, val, parts, i, endWhenFind);
        args[key] = [value, type];

        return end ? parts.length : newI;
    }

    private parseArgs(parts: string[], endWhenFind?: string): Args {
        let args: Args = {};
    
        for(let i=0;i<parts.length;i++) {
            i = this.parseArg(args, parts, i, endWhenFind);
        }

        return args;
    }

    private implVariable(value: string): string {
        return value.replaceAll(/{(.*?)}/g, (n: string, p1: string) => this.variables[p1] ?? '<unset>');
    }

    private runtimeProcess(data: [string | boolean | number | CallData, string], error: ErrorFunc): string | boolean | number {
        switch(data[1]) {
            case 'string': {
                return this.implVariable(data[0] as string);
            }
            case 'identifier': {
                return this.variables[data[0] as string];
            }
            case 'call': {
                const [ident, args] = data[0] as CallData;
                return (this.internalFunctions[ident] ?? this.functions[ident] ?? (() => error(`No function named '${ident}'`)))(this.convertArgs(args, error), error);
            }
            default: {
                return data[0] as string;
            }
        }
    }

    private sanitize(key: string): string {
        if(key == 'var' || key == 'const' || key == 'let') key = '_' + key;
        return key;
    }

    private convertArgs(args: Args, error: ErrorFunc): RuntimeArgs {
        const newArgs: RuntimeArgs = {};
        Object.entries(args).forEach(([key, value]) => {
            newArgs[this.sanitize(key)] = this.runtimeProcess(value, error);
        });
        return newArgs;
    }

    private genExpect(args: Args, error: ErrorFunc): ExpectFunc {
        return (...expectedArgs: (string | [string, string])[]) => {
            const missingArg = expectedArgs.find(n => !args[typeof n == 'string' ? n : n[0]]);
            if(missingArg != undefined) error(`Expected key '${typeof missingArg == 'string' ? missingArg : missingArg[0]}'`);

            const newArgs: RuntimeArgs = this.convertArgs(args, error);

            expectedArgs.forEach(val => {
                let key, expected;
                if(typeof val == 'string') {
                    key = val;
                    expected = val.slice(0, -1);
                } else {
                    key = val[0];
                    expected = val[1];
                }
                if(expected != 'any' && typeof newArgs[key] != expected) {
                    error(`Invalid type for key '${key}', expected '${expected}', got '${typeof newArgs[key]}'`);
                }
            });
            
            return newArgs;
        };
    }

    private genOptional(args: Args, error: ErrorFunc): OptionalFunc {
        return (...optionalArgs: [string, any][]) => {
            const res: RuntimeArgs = {};
            for(const [key, def] of optionalArgs) {
                const sanitized = this.sanitize(key);

                const there = args[key];
                if(there != undefined) {
                    const processed = this.runtimeProcess(there, error);
                    if(typeof processed != typeof def) error(`Invalid type for key '${key}', expected '${typeof def}', got '${typeof processed}'`);
                    res[sanitized] = processed;
                    continue;
                }

                res[sanitized] = def;
            }
            return res;
        }
    }

    private genError(cmd: string, line: number): ErrorFunc {
        return (str: any) => {
            this.throwError(`On line ${line+1}, cmd '${cmd}': ${str}`);
        }
    }

    private genOnly(args: Args, error: ErrorFunc): OnlyFunc {
        return (...onlyArgs: string[]) => {
            for(const key of Object.keys(args)) {
                if(!onlyArgs.includes(key)) error(`Unexpected key '${key}'`);
            }
        };
    }

    private parse() {
        const lines: [string, number][] = this.data.split("\n").map((n, i) => [n, i]);

        for(const [line, number] of lines) {
            const trim = line.trim();
            if(trim.length == 0) continue;

            const parts = trim.split(" ");
            const cmd = parts.shift()!;

            const args = this.parseArgs(parts);

            const error = this.genError(cmd, number);

            const argsFunc = () => this.convertArgs(args, error);
            const expect = this.genExpect(args, error);
            const optional = this.genOptional(args, error);
            const only = this.genOnly(args, error);

            this.commands.push({ cmd, args: argsFunc, expect, optional, error, only });
        }
    }

    private async create(command: Command): Promise<PixelPlace> {
        if(this.pp) return this.pp;

        const entries = Object.entries(this.params);
        if(entries.length == 0) command.error("No bot parameters found!");

        let p = [], n = [];
        for(const [name, param] of entries) {
            p.push(param);
            n.push(name);
        }

        this.pp = new PixelPlace(p);
        n.forEach((n, i) => this.bots[n] = this.pp!.bots[i]);
        return this.pp;
    }

    private async login(command: Command) {
        const place = await this.create(command);
        await place.Init();

        this.loggedIn = true;
    }

    private async processCmd(command: Command, i: number, breakFn: () => void): Promise<number> {
        switch(command.cmd) {
            case 'bot': {
                command.only('name', 'boardID', 'authKey', 'authToken', 'authId');

                const { authKey, authToken, authId }
                        = command.expect(['authKey', 'string'], ['authToken', 'string'], ['authId', 'string']);
                
                const { name, boardID, uidManager } = command.optional(['name', 'bot'], ['boardID', 7], ['uidManager', false]);

                this.params[(name as string)] = {
                    authData: {
                        authKey:   (authKey as string),
                        authToken: (authToken as string),
                        authId:    (authId as string),
                    },
                    boardID: boardID as number,
                    uidManager: uidManager as boolean,
                };
                break;
            }

            case 'create': {
                command.only();
                await this.create(command);
                break;
            }

            case 'login': {
                command.only();
                await this.login(command);
                break;
            }

            case 'draw': {
                if(!this.loggedIn) await this.login(command);
                
                const args = command.args();

                if(args.hasOwnProperty('image')) {
                    command.only('image', 'at', 'x', 'y', 'path', 'bot', 'mode', 'protect', 'fullProtect', 'transparent', 'wars', 'force', 'wait');
                    const { x, y, path } = command.expect(['x', 'number'], ['y', 'number'], ['path', 'string']);

                    const { bot, mode, protect, fullProtect, transparent, wars, force, wait }
                            = command.optional(
                                ['bot', Object.keys(this.bots)[0]],
                                ['mode', "TOP_LEFT_TO_RIGHT"], ['protect', false], ['fullProtect', false],
                                ['transparent', false], ['wars', false], ['force', false],
                                ['wait', true],
                            );

                    const modeStr = (mode as string);
                    let modeVal: Modes = Modes.TOP_LEFT_TO_RIGHT;
                    if(modeStr in Modes) {
                        modeVal = Modes[modeStr as keyof typeof Modes];
                    }

                    const botInst = this.bots[(bot as string)];
                    if(!botInst) command.error(`Unknown bot: ${bot}`);

                    const image: IImage = {
                        x: x as number,
                        y: y as number,
                        path: (path as string),
                        mode: modeVal,
                        protect: protect as boolean,
                        fullProtect: fullProtect as boolean,
                        transparent: transparent as boolean,
                        wars: wars as boolean,
                        force: force as boolean,
                    };

                    if(wait as boolean) await botInst.drawImage(image);
                    else botInst.drawImage(image);
                    break;
                }
                if(args.hasOwnProperty('pixel')) {
                    command.only('pixel', 'at', 'x', 'y', 'color', 'bot', 'brush', 'protect', 'wars', 'force', 'wait');
                    const { x, y, color } = command.expect(['x', 'number'], ['y', 'number'], ['color', 'string']);

                    const colorStr = (color as string);
                    const col: Color = colorStr in Color ? Color[colorStr as keyof typeof Color] : parseFloat(colorStr);
                    if(isNaN(col)) command.error(`Invalid color: ${color}`);

                    const { bot, brush, protect, wars, force, wait }
                            = command.optional(
                                ['bot', Object.keys(this.bots)[0]],
                                ['brush', 1], ['protect', false], ['wars', false], ['force', false],
                                ['wait', true],
                            );

                    const botInst = this.bots[(bot as string)];
                    if(!botInst) command.error(`Unknown bot: ${bot}`);

                    const pixel: IPixel = {
                        x: x as number,
                        y: y as number,
                        col,
                        brush: brush as number,
                        protect: protect as boolean,
                        wars: wars as boolean,
                        force: force as boolean,
                    };

                    if(wait as boolean) await botInst.placePixel(pixel);
                    else botInst.placePixel(pixel);
                    break;
                }
                command.error("Invalid draw; must be 'draw image' or 'draw pixel'")
                break;
            }

            case 'debug': {
                command.only('bot', 'shrinkPixelPacket', 'ignorePixelPacket', 'lineClears');
                if(!this.pp) command.error(`Run 'create' first!`);

                const { bot, shrinkPixelPacket, ignorePixelPacket, lineClears }
                        = command.optional(
                            ['bot', Object.keys(this.bots)[0]],
                            ['shrinkPixelPacket', false], ['ignorePixelPacket', false], ['lineClears', false],
                        );

                const botInst = this.bots[(bot as string)];
                if(!botInst) command.error(`Unknown bot: ${bot}`);

                botInst.addDebugger({
                    shrinkPixelPacket: shrinkPixelPacket as boolean,
                    ignorePixelPacket: ignorePixelPacket as boolean,
                    lineClears: lineClears as boolean,
                });
                break;
            }

            case 'print': {
                command.only('string0', 'lineClear', 'newLine');
                const { string0 } = command.expect('string0');

                const { lineClear, newLine } = command.optional(['lineClear', false], ['newLine', true]);

                if(lineClear as boolean) {
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                }
                process.stdout.write((string0 as string) + (newLine ? '\n' : ''));
                break;
            }

            case 'set': {
                for(const [key, value] of Object.entries(command.args())) {
                    this.variables[key] = value;
                }
                break;
            }

            case 'sleep': {
                command.only('number0');
                const { number0 } = command.expect('number0');

                await new Promise<void>((resolve) => setTimeout(resolve, number0 as number));
                break;
            }

            case 'repeat': {
                command.only('number0', 'var');
                const { number0 } = command.expect('number0');

                const { _var } = command.optional(['var', 'index']);
                const keyStr = (_var as string);

                const times = number0 as number;
                if(times <= 0) command.error('Loop must repeat 1+ times.');
                if(times != Math.floor(times)) command.error('Must loop a whole number amount of times');

                let shouldBreak: boolean = false;
                let breakIndex = -1;
                loop:
                for(let j=0;j<times;j++) {
                    if(keyStr != '') this.variables[keyStr] = j+1;
                    for(let k=i+1;k<this.commands.length;k++) {
                        const command = this.commands[k];
                        if(command.cmd == 'end') {
                            breakIndex = k;
                            break;
                        }
                        
                        k = await this.processCmd(command, k, () => { shouldBreak = true; });

                        if(shouldBreak) break loop;
                    }
                }
                i = breakIndex;
                break;
            }

            case 'break': {
                command.only();
                breakFn();
                break;
            }
        }
        return i;
    }

    async run() {

        for(let i=0;i<this.commands.length;i++) {
            const command = this.commands[i];
            i = await this.processCmd(command, i, () => {throw new Error(`Invalid break`)});
        }

    }

}