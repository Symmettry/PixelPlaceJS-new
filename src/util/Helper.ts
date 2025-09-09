export function constant(instance: any, key: any, value: any): void {
    Object.defineProperty(instance, key, {
        value,
        writable: false,
        enumerable: true,
        configurable: false
    });
}

export function orDefault<T extends Object, K extends keyof T, V>(inst: T, key: K, def: V): NonNullable<V> {
    return (inst[key] ?? def) as NonNullable<V>;
}
export function confirm<T extends Object, K extends keyof T, L extends T[K]>(inst: T, key: K, message: string): inst is T & { [P in K]: L } {
    if(inst[key] != undefined) return true;
    throw new Error(message);
}