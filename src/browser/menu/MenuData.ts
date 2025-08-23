import { EvalString } from "../SocketData";

/** Called from button clicks */
export type ButtonCall = () => void;
/** Called from toggle clicks, status is if it's checked or not */
export type ToggleCall = (status: boolean) => void;

/** Functions */
export type ServerFunction = ButtonCall | ToggleCall;
/** Callback, can be client, server, or both */
export type BrowserCallback<T extends ServerFunction> = { client: EvalString, server: T } | EvalString | T;

/** Style data */
export type StyleType = string | CSSStyleSheet;

export type TextObject = {
    /** Text type */
    type: "text",
    /** The text */
    text: string;
};
export type ButtonObject = {
    /** Button type */
    type: "button",
    /** Text of object, defaults to empty */
    text?: string;
    /** Code to run on click */
    onClick: BrowserCallback<ButtonCall>;
};
export type InputObject = {
    /** Input type */
    type: "input",
    /** Default text for the input */
    defaultText?: string;
    /** Placeholder for the input */
    placeholder?: string;
    /** Optional text to display as well */
    text?: string;
    /** Optional text style */
    textStyle?: StyleType;
};
export type ToggleObject = {
    /** Toggle type */
    type: "toggle",
    /** Optional style for the label */
    labelStyle?: StyleType;
    /** Code to run on change */
    onClick: BrowserCallback<ToggleCall>;
    /** Text to describe it */
    text: string;
};

export type MenuObject = (TextObject | ButtonObject | InputObject | ToggleObject) & {
    /** Optional style data */
    style?: StyleType;
    /** ID of the object. Will be ppjs_<type> if not set. Will become ppjs_<id>, and can be accessed in eval with id("<id>") <- this adds ppjs_ automatically */
    id?: string;
};
export type Menu = {
    /** Style of the menu itself */
    style?: StyleType;
    /** Objects in the menu */
    objects: MenuObject[];
};
/** List of menus, key is tag */
export type MenuData = {[key: string]: Menu};