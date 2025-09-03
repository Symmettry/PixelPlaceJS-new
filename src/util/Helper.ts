// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function constant(instance: any, key: string, value: any) {
    Object.defineProperty(instance, key, {value: value, writable: false, enumerable: true, configurable: false});
}

// typescript for the mentally deranged
export type Delegate<T extends any[]> = T extends [infer First, ...infer Rest] ? { [K in keyof First]: First[K]; } & Delegate<Rest> : {};
type OmitFirstArg<F> = F extends (arg: any, ...rest: infer R) => infer Ret
  ? (...args: R) => Ret
  : F;

export type DelegateStatic<T extends any[]> = 
  T extends [infer First, ...infer Rest]
    ? First extends abstract new (...args: any) => any
      ? { [K in keyof First]: OmitFirstArg<First[K]> } & DelegateStatic<Rest>
      : DelegateStatic<Rest>
    : {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function delegate(self: any, delegateFrom: any) {
    for (const key in Object.getPrototypeOf(delegateFrom)) {
        self[key] = delegateFrom[key].bind(delegateFrom);
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function delegateStatic(self: any, delegateCandidates: any[]) {
    for(const candidate of delegateCandidates) {
        for (const key in candidate) {
            const val = candidate[key];
            if (typeof val === "function") {
                self[key] = (...args: any[]) => val.apply(candidate, [self, ...args]);
            }
        }
    }
}
