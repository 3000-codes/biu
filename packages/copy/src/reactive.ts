import { isObject, toRawType } from "@biu/shared";
import { ReactiveFlags } from "./constants";
import { mutableReactiveHandlers, readonlyHandlers, } from "./baseHandlers";
import { mutableCollectionHandlers, readonlyCollectionHandlers } from "./collectionHandlers";
export interface Target {
    [ReactiveFlags.SKIP]?: boolean
    [ReactiveFlags.IS_REACTIVE]?: boolean
    [ReactiveFlags.IS_READONLY]?: boolean
    [ReactiveFlags.IS_SHALLOW]?: boolean
    [ReactiveFlags.RAW]?: any
}
enum TargetType {
    INVALID = 0,
    COMMON = 1,
    COLLECTION = 2,
}

export const reactiveMap = new WeakMap<Target, any>() // 缓存响应式对象
export const shallowReactiveMap = new WeakMap<Target, any>() // 缓存浅层响应式对象
export const readonlyMap = new WeakMap<Target, any>() // 缓存只读对象
export const shallowReadonlyMap = new WeakMap<Target, any>() // 缓存浅层只读对象

function targetTypeMap(rawType: string) {
    switch (rawType) {
        case 'Object':
        case 'Array':
            return TargetType.COMMON
        case 'Map':
        case 'Set':
        case 'WeakMap':
        case 'WeakSet':
            return TargetType.COLLECTION
        default:
            return TargetType.INVALID
    }
}

export function isReadonly(value: unknown): boolean {
    return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}

export function isShallow(value: unknown): boolean {
    return !!(value && (value as Target)[ReactiveFlags.IS_SHALLOW])
}

function getTargetType(value: Target) {
    return value[ReactiveFlags.SKIP] || !Object.isExtensible(value)
        ? TargetType.INVALID
        : targetTypeMap(toRawType(value))
}

/**
 * @description 将对象转换为原始值
 * @param v 
 * @returns 
 */
export function toRaw<T>(observed: T): T {
    const raw = observed && (observed as Target)[ReactiveFlags.RAW] //如果是响应式对象,则返回原始值
    return raw ? toRaw(raw) : observed
}

export function reactive(target: object) {
    if (isReadonly(target)) return target;
    return createReactiveObject(
        target,
        false,
        mutableReactiveHandlers,
        mutableCollectionHandlers,
        reactiveMap,
    )
}

export function readonly(target: object) {
    return createReactiveObject(
        target,
        true,
        readonlyHandlers,
        readonlyCollectionHandlers,
        readonlyMap,
    )
}

export const toReactive = <T extends unknown>(v: T): T => {
    return isObject(v) ? reactive(v) : v;
};

export const toReadonly = <T extends unknown>(v: T): T => {
    return isObject(v) ? readonly(v) : v;
};

function createReactiveObject(
    target: Target,
    isReadonly: boolean,
    baseHandlers: ProxyHandler<any>,
    collectionHandlers: ProxyHandler<any>,
    proxyMap: WeakMap<Target, any>) {
    // return target;
    if (!isObject(target)) {
        // 如果不是对象,则直接返回
        console.warn(`value cannot be made reactive: ${String(target)}`);
        return target;
    }

    if (target[ReactiveFlags.RAW] && !(isReadonly && target[ReactiveFlags.IS_REACTIVE])) {
        // 如果已经是响应式对象,则直接返回
        return target;
    }

    const existingProxy = proxyMap.get(target); // 获取代理对象
    if (existingProxy) {
        // 如果已经有代理对象,则直接返回
        return existingProxy;
    }

    const targetType = getTargetType(target); // 获取目标类型
    if (targetType === TargetType.INVALID) {
        return target;
    }

    const proxy = new Proxy(
        target,
        targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers
    );

    proxyMap.set(target, proxy); // 缓存代理对象
    return proxy;
}