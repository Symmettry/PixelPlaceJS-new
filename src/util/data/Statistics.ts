import { Bot } from "../../bot/Bot";


/**
 * Contains statistics data for pixelplace.
 */
export interface IStatistics {
    /** Statistics related to pixels. */
    pixels: {
        /** Statistics relating to placing pixels. */
        placing: {
            /** Number of pixels successfully placed. */
            placed: number
            /** Number of pixel placement attempts. */
            attempted: number,
            /** Number of failed pixel placement attempts. */
            failed: number,
            /** Timestamp of the first pixel placement. */
            first_time: number,
            /** Average pixels placed per second. */
            per_second: number,
            /** Average pixels placed per second accounting for pauses. */
            continuous_per_second: number,
            /** Last pixel placement position. */
            last_pos: number[],
            /** Pixel confirm ping */
            ping: number,
        },
        /** Statistics related to pixel protection. */
        protection: {
            /** Number of pixels protected. */
            protected: number,
            /** Number of pixels repaired. */
            repaired: number,
            /** Timestamp of the last pixel repair. */
            last_repair: number,
        },
        /** Object mapping color codes to pixel counts. */
        colors: {
            [color: number]: number,
        },
    },
    /** Statistics related to images. */
    images: {
        /** Number of images being drawn. */
        drawing: number,
        /** Number of finished images. */
        finished: number,
    },
    /** Statistics related to text. */
    text: {
        /** Number of texts being drawn. */
        drawing: number,
        /** Number of finished text. */
        finished: number,
    },
    /** Statistics related to lines. */
    lines: {
        /** Number of lines being drawn. */
        drawing: number,
        /** Number of finished lines. */
        finished: number,
    },
    /** Statistics related to animations. */
    animations: {
        /** Number of animations being played */
        playing: number,
        /** Number of animations finished */
        finished: number,
    },
    /** Statistics related to the session. */
    session: {
        /** Total session time. */
        time: number,
        /** Number of errors during the session. */
        errors: number,
        /** Timestamp of session start. */
        beginTime: number,
    },
    /** Statistics related to the socket. */
    socket: {
        /** Number of messages sent over the socket. */
        sent: number,
        /** Number of messages received over the socket. */
        received: number,
    },
}

export function defaultStatistics(): IStatistics {
    return {
        pixels: {
            placing: {
                placed: 0,
                attempted: 0,
                failed: 0,
                first_time: -1,
                per_second: -1,
                continuous_per_second: -1,
                last_pos: [-1, -1],
                ping: -1,
            },
            protection: {
                protected: 0,
                repaired: 0,
                last_repair: -1,
            },
            colors: { },
        },
        images: {
            drawing: 0,
            finished: 0,
        },
        text: {
            drawing: 0,
            finished: 0,
        },
        animations: {
            playing: 0,
            finished: 0,
        },
        lines: {
            drawing: 0,
            finished: 0,
        },
        session: {
            time: -1,
            errors: 0,
            beginTime: -1,
        },
        socket: {
            sent: 0,
            received: 0,
        },
    }
}

export enum StatType {
    TIME,
    PLACED,
    ATTEMPTED,
    FAILED,
    RATE,
    CONT_RATE,
    PING,
    LAG,
    LOAD,
    SLOWDOWN,
    IMAGES,
    TEXT,
    LINES,
    ANIMATIONS,
    PROTECTED,
    REPAIRED,
    SOCKET,
    ERRORS
}

export type StatPrinterMode = "stdout" | "log";

export interface StatPrinterOptions {
    interval?: number;
    mode?: StatPrinterMode;
    delimiter?: string;
    stats: readonly StatType[];
}

const formatTime = (ms: number): string => {
    const s = Math.floor(ms / 1000);
    return `${s.toLocaleString()}s`;
};

const statResolvers: Record<StatType, (bot: Bot, s: IStatistics) => string> = {
    [StatType.TIME]: (bot, s) => `time ${formatTime(s.session.time)}`,
    [StatType.PLACED]: (bot, s) => `placed ${s.pixels.placing.placed}`,
    [StatType.ATTEMPTED]: (bot, s) => `attempts ${s.pixels.placing.attempted}`,
    [StatType.FAILED]: (bot, s) => `fail ${s.pixels.placing.failed}`,
    [StatType.RATE]: (bot, s) => `rate ${s.pixels.placing.per_second.toFixed(2)}/s`,
    [StatType.CONT_RATE]: (bot, s) => `rate_cont ${s.pixels.placing.continuous_per_second.toFixed(2)}/s`,
    [StatType.PING]: (bot, s) => `ping ${s.pixels.placing.ping.toFixed(2)}ms`,
    [StatType.LAG]: (bot) => `lag ${bot.lagAmount}`,
    [StatType.LOAD]: (bot) => {
        const barrier = bot.loadData.barriers[bot.currentBarrier + 1] ?? bot.loadData.reset;
        return `load ${bot.sustainingLoad}/${barrier}`;
    },
    [StatType.SLOWDOWN]: (bot) => `slow ${bot.loadData.increases[bot.currentBarrier]}ms`,
    [StatType.IMAGES]: (bot, s) => `img ${s.images.drawing}/${s.images.finished}`,
    [StatType.TEXT]: (bot, s) => `txt ${s.text.drawing}/${s.text.finished}`,
    [StatType.LINES]: (bot, s) => `lines ${s.lines.drawing}/${s.lines.finished}`,
    [StatType.ANIMATIONS]: (bot, s) => `anim ${s.animations.playing}/${s.animations.finished}`,
    [StatType.PROTECTED]: (bot, s) => `prot ${s.pixels.protection.protected}`,
    [StatType.REPAIRED]: (bot, s) => `rep ${s.pixels.protection.repaired}`,
    [StatType.SOCKET]: (bot, s) => `sock ${s.socket.sent}/${s.socket.received}`,
    [StatType.ERRORS]: (bot, s) => `err ${s.session.errors}`
};

export const startStatPrinter = (
    bot: Bot,
    options: StatPrinterOptions
): NodeJS.Timeout => {
    const interval = options.interval ?? 500;
    const mode = options.mode ?? "stdout";
    const delimiter = options.delimiter ?? "|";

    return setInterval(() => {
        const stats = bot.getStatistics();

        const line = options.stats
            .map((t) => statResolvers[t](bot, stats))
            .join(` ${delimiter} `);

        if (mode === "stdout") {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
            process.stdout.write(line);
            return;
        }

        console.log(line);
    }, interval);
};