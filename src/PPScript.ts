import { PPScript } from "./ppscript/PPScript";

const args = process.argv;
args.shift();
args.shift();

new PPScript(args.join(" ")).run();