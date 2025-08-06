import { Bot } from "../../bot/Bot";
import { constant } from "../Constant";

const epsilon = 0.001;

export class LineDrawer {

    private bot!: Bot;
    
    private x0: number;
    private y0: number;
    private x1!: number;
    private y1!: number;

    private col!: number;
    private thickness!: number;

    private protect!: boolean;
    private wars!: boolean;
    private force!: boolean;

    constructor(bot: Bot, x0: number, y0: number, x1: number, y1: number, col: number, thickness: number, protect: boolean, wars: boolean, force: boolean) {
        constant(this, 'bot', bot);
        
        this.x0 = x0;
        this.y0 = y0;
        this.x1 = x1;
        this.y1 = y1;

        constant(this, 'col', col);
        constant(this, 'thickness', thickness);

        constant(this, 'protect', protect);
        constant(this, 'wars', wars);
        constant(this, 'force', force);
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
                    protect: this.protect, 
                    wars: this.wars,
                    force: this.force,
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