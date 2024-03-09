/**
 * Image drawing modes. The x,y coordinates are still top left regardless of the mode.
 */
export enum Modes {

    /** Starts from the top left and goes right then down. */
    TOP_LEFT_TO_RIGHT = 0,
    /** Starts from the top right and goes left then down. */
    TOP_RIGHT_TO_LEFT = 1,

    /** Starts from the bottom left and goes right then up. */
    BOTTOM_LEFT_TO_RIGHT = 2,
    /** Starts from the bottom right and goes left then up. */
    BOTTOM_RIGHT_TO_LEFT = 3,

    /** Starts from the top left then goes down then right. */
    LEFT_TOP_TO_BOTTOM = 4,
    /** Starts from the bottom left then goes up then right. */
    LEFT_BOTTOM_TO_TOP = 5,

    /** Starts from the top right then goes down then left. */
    RIGHT_TOP_TO_BOTTOM = 6,
    /** Starts from the bottom right then goes up then left. */
    RIGHT_BOTTOM_TO_TOP = 7,

    /** Draws from the center outward. */
    FROM_CENTER = 8,
    /** Draws from the outside to the center. */
    TO_CENTER = 9,

    /** Draws randomly. */
    RAND = 10,

}