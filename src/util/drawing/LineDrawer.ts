import { Bot } from "../../bot/Bot";
import { constant } from "../Constant";
import { DelegateMethod } from "ts-delegate";
import { PixelFlags } from "../data/Data";
import { populate } from "../FlagUtil";

const epsilon = 0.001;

export type Line = {
    /** X start of the line */
    x0: number;
    /** Y start of the line */
    y0: number;
    /** X end of the line */
    x1: number;
    /** Y end of the line */
    y1: number;
    /** Color */
    col: number;
    /** Thickness, defaults to 1 */
    thickness?: number;
} & PixelFlags;

export class LineDrawer {

    /**
     * Draws a line between two positions (experimental).
     * @param x1 The initial x position.
     * @param y1 The initial y position.
     * @param x2 The ending x position.
     * @param y2 The ending y position.
     * @param col The color to draw with.
     * @param thickness How thick the line is (due to this being an experimental function, it can bug at weird angles.)
     * @param protect If the pixels should be replaced when another player modifies them.
     * @param wars If the pixels should place inside of war zones during wars (will get you banned if mods see it).
     * @param force If the pixel packet should still be sent if it doesn't change the color.
     */
    @DelegateMethod(true)
    static async drawLine(bot: Bot, line: Line) {
        
        bot.stats.lines.drawing++;

        await new LineDrawer(bot, line).begin();

        bot.stats.lines.drawing--;
        bot.stats.lines.finished++;

    }

    private bot!: Bot;
    
    private x0: number;
    private y0: number;
    private x1: number;
    private y1: number;

    col: number;
    private thickness: number;

    flags: PixelFlags;

    constructor(bot: Bot, line: Line) {
        constant(this, 'bot', bot);
        
        this.x0 = line.x0;
        this.y0 = line.y0;
        this.x1 = line.x1;
        this.y1 = line.y1;

        this.col = line.col;

        this.thickness = line.thickness ?? 1;
        this.flags = populate(line);
    }

    async begin(): Promise<void> {

        const dx = Math.abs(this.x0 - this.x1);
        const dy = Math.abs(this.y0 - this.y1);
        const sx = this.x0 < this.x1 ? 1 : -1;
        const sy = this.y0 < this.y1 ? 1 : -1;
        let err = dx - dy;
        
        const slope = dy / dx;
    
        for (let i = 0; i < this.thickness; i++) {
            let x = this.x0;
            let y = this.y0;
    
            while (Math.abs(x - this.x1) > epsilon || Math.abs(y - this.y1) > epsilon) {
                await this.bot.placePixel({
                    x: Math.round(x),
                    y: Math.round(y),
                    col: this.col,
                    ref: this.flags,
                });
    
                const err2 = 2 * err;
                if (err2 > -dy) {
                    err -= dy;
                    x += sx;
                }
                if (err2 < dx) {
                    err += dx;
                    y += sy;
                }
            }
    
            this.x0 += Math.round(1 / Math.sqrt(1 + slope * slope)) * (this.y1 > this.y0 ? -1 : 1);
            this.y0 += Math.round(1 / Math.sqrt(1 + 1 / (slope * slope))) * (this.x1 > this.x0 ? 1 : -1);
            this.x1 += Math.round(1 / Math.sqrt(1 + slope * slope)) * (this.y1 > this.y0 ? -1 : 1);
            this.y1 += Math.round(1 / Math.sqrt(1 + 1 / (slope * slope))) * (this.x1 > this.x0 ? 1 : -1);
        }

    }

}