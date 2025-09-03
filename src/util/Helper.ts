// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function constant(instance: any, key: string, value: any) {
    Object.defineProperty(instance, key, {value: value, writable: false, enumerable: true, configurable: false});
}

// typescript for the mentally deranged (me)
export type Delegate<T extends any[]> = T extends [infer First, ...infer Rest] ? { [K in keyof First]: First[K]; } & Delegate<Rest> : {};
export type DelegateStatic<T extends readonly any[], Self> =
  T extends [infer First, ...infer Rest]
    ? First extends abstract new (...args: any) => any
      ? {
          [K in keyof First as First[K] extends (...args: any[]) => any ? K : never]:
            First[K] extends (arg: infer A, ...rest: infer R) => infer Ret
              ? (<G>() => G extends A ? 1 : 2) extends (<G>() => G extends Self ? 1 : 2)
                ? (...args: R) => Ret
                : First[K]
              : First[K]
        } & DelegateStatic<Rest, Self>
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
