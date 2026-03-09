import { ImagePixels } from "../drawing/ImageDrawer";
import { Pixel, PixelSetData } from "./Data";

export type DrawHook = (x: number, y: number) => Promise<void>;
export type HypotFunction = (dx: number, dy: number) => number;

export type Coord = [number, number];

// A BaseMode generates coordinates from pixels
export type BaseMode = (pixels: PixelSetData) => Coord[];

// ModeConfig transforms the coordinate order, optionally using hypot or pixel data
export type ModeConfig = (coords: Coord[], pixels: PixelSetData, hypot: HypotFunction, base: BaseMode) => Coord[];

export type DrawingFunction = (pixels: PixelSetData, draw: DrawHook, hypot: HypotFunction) => Promise<void>;

// The composable drawing function
export class Modes {

    private constructor() {}

    static of(base: BaseMode, configs: readonly ModeConfig[] = []): DrawingFunction {
        return async (pixels, draw, hypot) => {
            let coords = base(pixels);
            for (const config of configs) {
                coords = config(coords, pixels, hypot, base);
            }
            for (const [x, y] of coords) {
                await draw(x, y);
            }
        };
    }
}

// -------------------- Base Traversals -------------------- //

export const BaseModes = {
    /**
     * Traverses the image row by row, top to bottom, left to right.
     * Can be used with ModeConfigs.REVERSE and ModeConfigs.REVERSE_ROWS to get other results
     */
    ROWS: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++)
                coords.push([x, y]);
        return coords;
    },

    /**
     * Traverses the image column by column, left to right, top to bottom.
     */
    COLUMNS: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        for (let x = 0; x < pixels.width; x++)
            for (let y = 0; y < pixels.height; y++)
                coords.push([x, y]);
        return coords;
    },

    /**
     * Traverses diagonally from the top-left corner.
     */
    DIAGONAL_TL: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const max = pixels.width + pixels.height - 1;
        for (let d = 0; d < max; d++)
            for (let y = 0; y <= d; y++) {
                const x = d - y;
                if (x < pixels.width && y < pixels.height)
                    coords.push([x, y]);
            }
        return coords;
    },

    /**
     * Traverses diagonally from the top-right corner.
     */
    DIAGONAL_TR: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const max = pixels.width + pixels.height - 1;
        for (let d = 0; d < max; d++)
            for (let y = 0; y <= d; y++) {
                const x = pixels.width - 1 - (d - y);
                if (x >= 0 && y < pixels.height)
                    coords.push([x, y]);
            }
        return coords;
    },

    /**
     * Traverses pixels in a random order.
     * Has some special compatibilities with ModeConfigs
     */
    RANDOM: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        for (let y = 0; y < pixels.height; y++)
            for (let x = 0; x < pixels.width; x++)
                coords.push([x, y]);

        for (let i = coords.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [coords[i], coords[j]] = [coords[j], coords[i]];
        }

        return coords;
    },

    /**
     * Spiral pattern in square steps from the center outward.
     */
    SQUARE_SPIRAL: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const cx = (pixels.width / 2) | 0;
        const cy = (pixels.height / 2) | 0;

        let x = cx, y = cy;
        let dx = 1, dy = 0;
        let segment = 1, step = 0, changes = 0;
        const total = pixels.width * pixels.height;

        for (let i = 0; i < total; i++) {
            if (x >= 0 && x < pixels.width && y >= 0 && y < pixels.height)
                coords.push([x, y]);

            x += dx;
            y += dy;
            step++;

            if (step === segment) {
                step = 0;
                const t = dx;
                dx = -dy;
                dy = t;
                changes++;
                if ((changes & 1) === 0) segment++;
            }
        }

        return coords;
    },

    /**
     * Traverses the image in concentric square rings from the center.
     */
    SQUARE_RINGS: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];
        const cx = (pixels.width / 2) | 0;
        const cy = (pixels.height / 2) | 0;
        const max = Math.max(cx, cy);

        for (let r = 0; r <= max; r++) {
            for (let x = cx - r; x <= cx + r; x++) {
                const y1 = cy - r, y2 = cy + r;
                if (x >= 0 && x < pixels.width && y1 >= 0) coords.push([x, y1]);
                if (x >= 0 && x < pixels.width && y2 < pixels.height) coords.push([x, y2]);
            }
            for (let y = cy - r + 1; y <= cy + r - 1; y++) {
                const x1 = cx - r, x2 = cx + r;
                if (x1 >= 0 && y >= 0 && y < pixels.height) coords.push([x1, y]);
                if (x2 < pixels.width && y >= 0 && y < pixels.height) coords.push([x2, y]);
            }
        }

        return coords;
    },

    /**
     * Hilbert style hamiltonian cycle
     * Only works well on even length and width.
     */
    HILBERT: (pixels: PixelSetData): Coord[] => {
        const coords: Coord[] = [];

        const size = 1 << Math.ceil(Math.log2(Math.max(pixels.width, pixels.height)));
        const total = size * size;

        const rot = (n: number, x: number, y: number, rx: number, ry: number): [number, number] => {
            if (ry === 0) {
                if (rx === 1) {
                    x = n - 1 - x;
                    y = n - 1 - y;
                }
                const t = x;
                x = y;
                y = t;
            }
            return [x, y];
        };

        const d2xy = (n: number, d: number): Coord => {
            let x = 0;
            let y = 0;
            let t = d;

            for (let s = 1; s < n; s <<= 1) {
                const rx = 1 & (t >> 1);
                const ry = 1 & (t ^ rx);
                const r = rot(s, x, y, rx, ry);
                x = r[0];
                y = r[1];
                x += s * rx;
                y += s * ry;
                t >>= 2;
            }

            return [x, y];
        };

        for (let i = 0; i < total; i++) {
            const [x, y] = d2xy(size, i);
            if (x < pixels.width && y < pixels.height)
                coords.push([x, y]);
        }

        return coords;
    },

    /**
     * Hamiltonian cycle that looks like snake AI
     * Only works with even width / height
     * 
     * VERY SLOW.. Takes like ~10 seconds for 100x100 images. Do not use on high sets unless you want to wait lmfao
     */
    HAMILTONIAN_SNAKE: (grid: PixelSetData): Coord[] => {
        const { width, height } = grid;
        if (width % 2 !== 0 || height % 2 !== 0) {
            throw new Error("Width and height must both be even to generate a Hamiltonian cycle.");
        }

        const key = "Hamiltonian " + width + "x" + height;
        console.time(key);

        let xmax = width - 1;
        let ymax = height - 1;

        const path: Coord[] = [];
        let left_end = true;

        function inSublattice(x: number, y: number) {
            return x >= 0 && x <= xmax && y >= 0 && y <= ymax;
        }

        function reversePath(i1: number, i2: number, path: Coord[]) {
            let jlim = Math.floor((i2 - i1 + 1) / 2);
            for (let j = 0; j < jlim; j++) {
                const temp = path[i1 + j];
                path[i1 + j] = path[i2 - j];
                path[i2 - j] = temp;
            }
        }

        function backbiteLeft(step: Coord, n: number): number {
            const neighbour: Coord = [path[0][0] + step[0], path[0][1] + step[1]];
            if (inSublattice(neighbour[0], neighbour[1])) {
                let inPath = false;
                for (let j = 1; j < n; j += 2) {
                    if (neighbour[0] === path[j][0] && neighbour[1] === path[j][1]) {
                        inPath = true;
                        if (j > 0) reversePath(0, j - 1, path);
                        break;
                    }
                }
                if (!inPath) {
                    left_end = !left_end;
                    reversePath(0, n - 1, path);
                    path.push(neighbour);
                    n++;
                }
            }
            return n;
        }

        function backbiteRight(step: Coord, n: number): number {
            const neighbour: Coord = [path[n - 1][0] + step[0], path[n - 1][1] + step[1]];
            if (inSublattice(neighbour[0], neighbour[1])) {
                let inPath = false;
                for (let j = n - 2; j >= 0; j -= 2) {
                    if (neighbour[0] === path[j][0] && neighbour[1] === path[j][1]) {
                        inPath = true;
                        reversePath(j + 1, n - 1, path);
                        break;
                    }
                }
                if (!inPath) {
                    path.push(neighbour);
                    n++;
                }
            }
            return n;
        }

        function backbite(n: number): number {
            const stepChoices: Coord[] = [
                [1, 0], [-1, 0], [0, 1], [0, -1]
            ];
            const step = stepChoices[Math.floor(Math.random() * 4)];
            if (Math.random() < 0.5) {
                n = backbiteLeft(step, n);
            } else {
                n = backbiteRight(step, n);
            }
            return n;
        }

        // initialize path with a random start
        path.push([Math.floor(Math.random() * (xmax + 1)), Math.floor(Math.random() * (ymax + 1))]);
        let n = 1;
        const nattempts = 10 * width * height * Math.pow(Math.log(2 + width * height), 2);

        while (n < width * height) {
            for (let i = 0; i < nattempts; i++) {
                n = backbite(n);
            }
        }

        // close the cycle
        const minDist = 1 + (n % 2);
        while (Math.abs(path[n - 1][0] - path[0][0]) + Math.abs(path[n - 1][1] - path[0][1]) !== minDist) {
            n = backbite(n);
        }

        console.timeEnd(key);
        return path;
    },

} as const;

// -------------------- Config Modifiers -------------------- //

export const ModeConfigs = {
    /**
     * Reverses the order of all coordinates.
     * Incompatible with: none.
     */
    REVERSE: (coords: Coord[]): Coord[] => coords.slice().reverse(),

    /**
     * Rotates all coordinates around a center point.
     * Default is 90 degrees clockwise.
     * 
     * Special functions:
     * ROTATE.center(x, y) -> sets rotation center (defaults to image center)
     * ROTATE.degrees(d) -> sets rotation in degrees
     * ROTATE.radians(r) -> sets rotation in radians
     */
    ROTATE: ((() => {
        const fn: any = (coords: Coord[], pixels: PixelSetData): Coord[] => {
            const cx = fn.cx ?? Math.floor(pixels.width / 2);
            const cy = fn.cy ?? Math.floor(pixels.height / 2);
            const angle = fn.angle ?? Math.PI / 2; // default 90 degrees

            const cos = Math.cos(angle);
            const sin = Math.sin(angle);

            return coords.map(([x, y]) => {
                const dx = x - cx;
                const dy = y - cy;
                const rx = Math.round(cx + dx * cos - dy * sin);
                const ry = Math.round(cy + dx * sin + dy * cos);
                return [rx, ry];
            });
        };

        fn.cx = undefined;
        fn.cy = undefined;
        fn.angle = Math.PI / 2;

        fn.center = (x: number, y: number) => {
            fn.cx = x;
            fn.cy = y;
            return fn;
        };

        fn.degrees = (deg: number) => {
            fn.angle = (deg * Math.PI) / 180;
            return fn;
        };

        fn.radians = (rad: number) => {
            fn.angle = rad;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),

    /**
     * Separates pixels into a checkered pattern.
     * Incompatible with: none.
     */
    CHECKERED: (coords: Coord[]): Coord[] => {
        const first: Coord[] = [];
        const second: Coord[] = [];
        for (const [x, y] of coords)
            if ((x + y) & 1) second.push([x, y]);
            else first.push([x, y]);
        return [...first, ...second];
    },

    /**
     * Reverses every other row (snake pattern).
     * Incompatible with: REVERSE_ROWS may produce unexpected results.
     */
    SNAKE: (coords: Coord[], pixels: PixelSetData): Coord[] => {
        const rows: Coord[][] = Array.from({ length: pixels.height }, () => []);
        for (const c of coords) rows[c[1]].push(c);
        const result: Coord[] = [];
        for (let y = 0; y < rows.length; y++)
            result.push(...((y & 1) === 0 ? rows[y] : rows[y].reverse()));
        return result;
    },

    /**
     * Sorts pixels clockwise around the center.
     * Incompatible with: CENTRAL_SORT.
     */
    ANGLE_CW: (coords: Coord[], pixels: PixelSetData): Coord[] => {
        const cx = pixels.width / 2;
        const cy = pixels.height / 2;
        return coords
            .map(c => ({ c, a: Math.atan2(c[1] - cy, c[0] - cx) }))
            .sort((a, b) => a.a - b.a)
            .map(v => v.c);
    },

    /**
     * Sorts pixels counter-clockwise around the center.
     * Incompatible with: CENTRAL_SORT.
     */
    ANGLE_CCW: (coords: Coord[], pixels: PixelSetData): Coord[] => {
        const cx = pixels.width / 2;
        const cy = pixels.height / 2;
        return coords
            .map(c => ({ c, a: Math.atan2(c[1] - cy, c[0] - cx) }))
            .sort((a, b) => b.a - a.a)
            .map(v => v.c);
    },

    /**
     * Sorts pixels by distance from the center (closest first).
     * Incompatible with: ANGLE_CW, ANGLE_CCW.
     * 
     * Special function:
     * CENTRAL_SORT.center(x, y) -> sets the center at which it'll draw from. if not called, it'll default to the middle. This is relative, 0-maxX not coordinates.
     */
    CENTRAL_SORT: ((() => {
        const fn: any = (coords: Coord[], pixels: PixelSetData, hypot: HypotFunction, base: BaseMode): Coord[] => {
            const cx = fn.cx ?? Math.floor(pixels.width / 2);
            const cy = fn.cy ?? Math.floor(pixels.height / 2);

            const nhypot =
                base === BaseModes.RANDOM
                    ? (a: number, b: number) => hypot(a, b) + Math.floor(Math.random() * 5) - 3
                    : hypot;

            return coords
                .map(c => ({ c, d: nhypot(c[0] - cx, c[1] - cy) }))
                .sort((a, b) => a.d - b.d)
                .map(v => v.c);
        };

        fn.cx = undefined;
        fn.cy = undefined;

        fn.center = (x: number, y: number) => {
            fn.cx = x;
            fn.cy = y;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),

    /**
     * Sorts pixels by diamond distance from the center.
     * Incompatible with: ANGLE_CW, ANGLE_CCW.
     * 
     * Special function:
     * DIAMOND_SORT.center(x, y) -> sets the center at which it'll draw from. if not called, it'll default to the middle. This is relative, 0-maxX not coordinates.
     */
    DIAMOND_SORT: ((() => {
        const fn: any = (coords: Coord[], pixels: PixelSetData): Coord[] => {
            const cx = fn.cx ?? Math.floor(pixels.width / 2);
            const cy = fn.cy ?? Math.floor(pixels.height / 2);

            return coords
                .map(c => ({ c, d: Math.abs(c[0] - cx) + Math.abs(c[1] - cy) }))
                .sort((a, b) => a.d - b.d)
                .map(v => v.c);
        };

        fn.cx = undefined;
        fn.cy = undefined;

        fn.center = (x: number, y: number) => {
            fn.cx = x;
            fn.cy = y;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),

    /**
     * Reverses each row independently.
     * Incompatible with: SNAKE may produce unexpected results.
     */
    REVERSE_ROWS: (coords: Coord[], pixels: PixelSetData) => {
        const rows: Coord[][] = Array.from({ length: pixels.height }, () => []);
        for (const [x, y] of coords) rows[y].push([x, y]);
        const result: Coord[] = [];
        for (const row of rows) result.push(...row.reverse()); 
        return result;
    },

    /**
     * Offsets the pixels by either a fixed amount or by a percent
     * Does nothing without special function calls
     * 
     * Special Functions:
     * OFFSET.percent(p) -> 0-100 and sets the offset percent
     * OFFSET.amount(amt) -> sets the offset amount
     */
    OFFSET: ((() => {
        const fn = (coords: Coord[]): Coord[] => {
            const n = coords.length;
            if (n === 0) return coords.slice();

            let realOffset = 0;

            if (fn.offpercent && fn.offpercent > 0) {
                realOffset = Math.floor((n * fn.offpercent) / 100);
            } else if (fn.offset) {
                realOffset = ((fn.offset % n) + n) % n; // normalize negative/overflow
            }

            if (realOffset === 0) return coords.slice();

            return coords.slice(realOffset).concat(coords.slice(0, realOffset));
        };

        fn.offset = 0;
        fn.offpercent = 0;

        fn.percent = (p: number) => {
            if (p < 0 || p > 100) throw new Error("percent must be 0-100");
            fn.offpercent = p;
            return fn;
        };

        fn.amount = (amt: number) => {
            fn.offset = amt;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),

    /**
     * Splices coordinates: either removes a range or keeps only a range.
     * 
     * Special functions:
     * SPLICE.start(i) -> sets starting index (defaults to 0)
     * SPLICE.end(i) -> sets ending index (defaults to -1 / unset)
     * SPLICE.amount(n) -> sets number of coords to remove (defaults to 0)
     * SPLICE.remove(flag) -> if true, removes the selected range; if false, keeps only the selected range (defaults to true)
     * 
     * Behavior:
     * - If start() and end() are set:
     *     - remove=true: keeps coords outside [start, end), removes inside
     *     - remove=false: keeps only [start, end)
     * - If only start() is set, end defaults to -1 (unset), amount() is used to determine how many to remove
     */
    SPLICE: ((() => {
        const fn: any = (coords: Coord[]): Coord[] => {
            const n = coords.length;
            if (n === 0) return coords.slice();

            const s = Math.max(0, Math.min(fn.startIndex ?? 0, n));
            const e = fn.endIndex ?? -1;
            const amt = Math.min(Math.max(fn.removeAmount ?? 0, 0), n - s);
            const remove = fn.removeFlag ?? true;

            if (e >= 0) {
                const end = Math.max(s, Math.min(e, n));
                if (remove) {
                    // remove selected range
                    return coords.slice(0, s).concat(coords.slice(end));
                } else {
                    // keep only selected range
                    return coords.slice(s, end);
                }
            } else {
                if (remove) {
                    // remove amount starting from s
                    return coords.slice(0, s).concat(coords.slice(s + amt));
                } else {
                    // keep only amount starting from s
                    return coords.slice(s, s + amt);
                }
            }
        };

        fn.startIndex = 0;
        fn.endIndex = -1;
        fn.removeAmount = 0;
        fn.removeFlag = true;

        fn.start = (i: number) => {
            fn.startIndex = i;
            return fn;
        };

        fn.end = (i: number) => {
            fn.endIndex = i;
            return fn;
        };

        fn.amount = (n: number) => {
            fn.removeAmount = n;
            return fn;
        };

        fn.remove = (flag: boolean) => {
            fn.removeFlag = flag;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),
    
    /**
     * Randomizes the order of rows or columns independently.
     */
    SHUFFLE_ROWS: ((() => {
        const fn: any = (coords: Coord[], pixels: PixelSetData): Coord[] => {
            const rows: Coord[][] = Array.from({ length: pixels.height }, () => []);
            for (const [x, y] of coords) rows[y].push([x, y]);

            // shuffle rows
            for (let i = rows.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [rows[i], rows[j]] = [rows[j], rows[i]];
            }

            return rows.flat();
        };
        return fn;
    }) as () => ModeConfig)(),

    SHUFFLE_COLUMNS: ((() => {
        const fn: any = (coords: Coord[], pixels: PixelSetData): Coord[] => {
            const cols: Coord[][] = Array.from({ length: pixels.width }, () => []);
            for (const [x, y] of coords) cols[x].push([x, y]);

            // shuffle columns
            for (let i = cols.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [cols[i], cols[j]] = [cols[j], cols[i]];
            }

            return cols.flat();
        };
        return fn;
    }) as () => ModeConfig)(),

    /**
     * Mirrors the coordinates horizontally or vertically.
     * Default is horizontal.
     */
    MIRROR: ((() => {
        const fn: any = (coords: Coord[], pixels: PixelSetData): Coord[] => {
            const result: Coord[] = [];
            if (fn.horizontal) {
                for (const [x, y] of coords) result.push([pixels.width - 1 - x, y]);
            } else {
                for (const [x, y] of coords) result.push([x, pixels.height - 1 - y]);
            }
            return result;
        };

        fn.horizontal = true;
        fn.vertical = false;

        fn.horizontalMirror = () => {
            fn.horizontal = true;
            fn.vertical = false;
            return fn;
        };

        fn.verticalMirror = () => {
            fn.horizontal = false;
            fn.vertical = true;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),

    /**
     * Takes every N-th pixel. Can remove skipped pixels or keep them for later.
     */
    STEP: ((() => {
        const fn: any = (coords: Coord[]): Coord[] => {
            const n = coords.length;
            if (n === 0) return coords.slice();
            const step = Math.max(1, fn.everyStep ?? 1);
            const remove = fn.removeFlag ?? true;

            if (remove) {
                // keep only every N-th pixel
                return coords.filter((_, i) => i % step === 0);
            } else {
                // place skipped pixels at the end
                const keep: Coord[] = [];
                const skip: Coord[] = [];
                for (let i = 0; i < n; i++) {
                    if (i % step === 0) keep.push(coords[i]);
                    else skip.push(coords[i]);
                }
                return keep.concat(skip);
            }
        };

        fn.everyStep = 1;
        fn.removeFlag = true;

        fn.every = (n: number) => {
            fn.everyStep = n;
            return fn;
        };

        fn.remove = (flag: boolean) => {
            fn.removeFlag = flag;
            return fn;
        };

        return fn;
    }) as () => ModeConfig)(),

    SORT_BY_COLOR: (coords: Coord[], pixels: PixelSetData) => {
        return coords
            .map(([x, y]) => ({ c: [x, y] as Coord, val: pixels.pixels[x][y] ?? 0 }))
            .sort((a, b) => a.val - b.val)
            .map(v => v.c);
    },

} as const;