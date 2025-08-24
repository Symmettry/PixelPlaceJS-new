import { BrushTypes, PixelFlags, QueueSide, RawFlags } from "./data/Data";

export function populate<T extends PixelFlags>(unkFlags: T): T & RawFlags {
    const flags = truthful(unkFlags);

    flags.async ??= true;
    flags.brush ??= BrushTypes.NORMAL;
    flags.force ??= false;
    flags.protect ??= false;
    flags.side ??= QueueSide.BACK;
    flags.wars ??= false;
    flags.replaceProtection ??= true;

    if ("fullProtect" in flags) {
        (flags as typeof flags & { fullProtect?: boolean }).fullProtect &&= flags.protect;
    }

    return flags;
}

function hasRef<T extends PixelFlags>(
    flags: T
): flags is T & { ref: PixelFlags } {
    return "ref" in flags && flags.ref !== undefined;
}

function truthful<T extends PixelFlags>(flags: T): T & RawFlags {
    if (hasRef(flags)) {
        const ref = truthful(flags.ref);

        const editable = flags as T & RawFlags;
        editable.async   = ref.async;
        editable.brush   = ref.brush;
        editable.protect = ref.protect;
        editable.force   = ref.force;
        editable.side    = ref.side;
        editable.wars    = ref.wars;
        editable.replaceProtection = ref.replaceProtection;

        return editable;
    }
    return flags;
}
