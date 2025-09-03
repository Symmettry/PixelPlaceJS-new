// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function constant(instance: any, key: string, value: any) {
    Object.defineProperty(instance, key, {value: value, writable: false, enumerable: true, configurable: false});
}

// typescript for the mentally deranged (me)
export type Delegate<T extends any[]> = T extends [infer First, ...infer Rest] ? { [K in keyof First]: First[K]; } & Delegate<Rest> : {};
type IsExactly<T, U> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? true : false;

export type OmitFirst<F> =
  F extends (arg: any, ...rest: infer R) => infer Ret
    ? (...args: R) => Ret
    : F;

type OmitFirstIfSelf<F, Self> =
  F extends (arg: infer First, ...rest: any[]) => any
    ? IsExactly<First, Self> extends true
      ? OmitFirst<F>
      : F
    : F;

type DelegateFromCtor<C, Self> = {
  [K in keyof C as C[K] extends (...args: any[]) => any ? K : never]: OmitFirstIfSelf<C[K], Self>
};

export type DelegateStatic<T extends readonly any[], Self> =
  T extends [infer First, ...infer Rest]
    ? First extends abstract new (...args: any) => any
      ? DelegateFromCtor<First, Self> & DelegateStatic<Rest, Self>
      : DelegateStatic<Rest, Self>
    : {};


// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function delegate(self: any, delegateCandidates: any[]) {
    for(const candidate of delegateCandidates) {
        for (const key in Object.getPrototypeOf(candidate)) {
            self[key] = candidate[key].bind(candidate);
        }
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function delegateStatic(self: any, delegateCandidates: any[]) {
    for(const candidate of delegateCandidates) {
        for (const key in candidate) {
            const val = candidate[key];
            if (typeof val != "function") continue;

            self[key] = (...args: any[]) => val.apply(candidate, args.length + 1 == val.length
                ? [self, ...args]
                : args
            );
        }
    }
}
