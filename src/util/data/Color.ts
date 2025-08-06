/**
 * Enumeration of colors.
 * @enum {number}
 */
export enum Color {

    WHITE = 0,

    LIGHT_GRAY = 1,
    A_BIT_LIGHT_GRAY = 60,
    GRAY = 2,
    DARK_GRAY = 3,
    A_BIT_DARKER_GRAY = 61,
    DARKER_GRAY = 4,
    EVEN_DARKER_GRAY = 62,
    BLACK = 5,

    DARK_BLUE_GREEN = 39,
    DARKER_GREEN = 6,
    DARK_GREEN = 49,
    GRAY_GREEN = 40,
    CYAN_GREEN = 7,
    GREEN = 8,
    LIGHT_GREEN = 9,
    LIGHTER_GREEN = 10,
    NEON_GREEN = 51,
    PALE_GREEN = 50,

    LIME_YELLOW = 58,
    YELLOW_GREEN = 41,
    YELLOW = 11,
    DARK_YELLOW = 12,
    YELLOW_ORANGE = 13,

    LIGHTER_ORANGE = 14,
    LIGHT_ORANGE = 42,
    ORANGE = 21,
    WEIRD_ORANGE = 52,
    BROWN_ORANGE = 57,

    RED = 20,
    CARMINE = 43,
    LIGHT_RED = 44,
    DARK_RED = 19,
    DARKER_RED = 18,

    SUNBURN_TAN = 23,

    LIGHT_BROWN = 15,
    DARK_BROWN = 17,
    BROWN = 16,
    GOLDEN_BROWN = 22,

    TAN = 24,
    LIGHT_TAN = 25,

    PINK = 26,
    PINK_IN_A_DIFFERENT_FONT = 54,

    LIGHTER_PURPLE = 27,
    LIGHT_PURPLE = 45,

    MAGENTA = 28,

    GRAYISH_MAROONISH_RASPBERRISH_BROWN = 53,

    DARK_PURPLE = 29,
    DARKER_PURPLE = 46,
    EVEN_DARKER_PURPLE = 63,
    WHAT_THE_FUCK_DARKER_PURPLE = 55,
    ANOTHER_FUCKING_PURPLE = 56,

    DARKER_BLUE = 31,

    PURPLE = 30,

    DARK_BLUE = 32,
    BLUE = 33,
    DARK_TEAL = 47,
    GRAY_BLUE = 34,
    SKY_BLUE = 35,
    TEAL = 36,
    DARK_CYAN = 37,
    CYAN = 38,
    NAVY_BLUE = 59,

    BLUE_GREEN_WHITE = 48, // dunno it's just 181,232,238

    /** Ocean is -1, which in Uint8Array will become 65535. */
    OCEAN = 65535,
}