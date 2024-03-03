// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function constant(instance: any, key: string, value: any) {
    Object.defineProperty(instance, key, {value: value, writable: false, enumerable: true, configurable: false});
}