import { def, isObject, toRawType, warn } from "@biu/shared"
import { ReactiveFlags } from "./constants"
import { RawSymbol } from "./ref"
import { mutableHandlers } from "./baseHandlers"
import { mutableCollectionHandlers } from "./collectionHandlers"

export interface Target {
  [ReactiveFlags.SKIP]?: boolean // 跳过代理，见 makeRaw方法
  [ReactiveFlags.IS_REACTIVE]?: boolean // 是否是响应式对象
  [ReactiveFlags.IS_READONLY]?: boolean // 是否是只读对象
  [ReactiveFlags.IS_SHALLOW]?: boolean // 是否是浅层代理
  [ReactiveFlags.RAW]?: any // 原始对象
}

export const reactiveMap = new WeakMap<Target, any>() // 存储响应式对象
export const shallowReactiveMap = new WeakMap<Target, any>() // 存储浅层代理对象
export const readonlyMap = new WeakMap<Target, any>() // 存储只读对象
export const shallowReadonlyMap = new WeakMap<Target, any>() // 存储浅层只读对象

enum TargetType {
  INVALID = 0,
  COMMON = 1,
  COLLECTION = 2,
}

/**
 * @description 判断是什么类型的对象
 * @param rawType string
 * @returns TargetType
 */
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

/**
 * @description 获取对象类型
 * @param value 
 * @returns 
 */
function getTargetType(value: Target) {
  // 如果是跳过代理或者不可扩展的对象，返回无效类型
  if (value[ReactiveFlags.SKIP] || !Object.isExtensible(value)) {
    return TargetType.INVALID
  }
  return targetTypeMap(toRawType(value))
}

/**
 * @param target 被代理的对象
 * @param isReadonly 是否定义为只读
 * @param baseHandlers 基础代理方法
 * @param collectionHandlers 集合代理方法 
 * @param proxyMap  代理对象的缓存
 * @returns 代理对象
 */
function createReactiveObject(
  target: Target,
  isReadonly: boolean,
  baseHandlers: ProxyHandler<any>,
  collectionHandlers: ProxyHandler<any>,
  proxyMap: WeakMap<Target, any>,
) {
  if (!isObject(target)) {
    // 非对象类型无法被代理
    if (__DEV__) {
      warn(`value cannot be made reactive: ${String(target)}`)
    }
    return target
  }
  /**
   * 如果target已经是一个Proxy对象，直接返回
   * 例外：在一个响应式对象上调用readonly()方法
   * 
   * @example
   * const obj = reactive({})
   * const copy= reactive(obj)
   * const readonlyCopy = readonly(copy)
   * obj === copy // true
   * obj === readonlyCopy // false
   */
  if (
    target[ReactiveFlags.RAW] &&
    !(isReadonly && target[ReactiveFlags.IS_REACTIVE])
  ) {
    return target
  }
  /**
   * 如果target已经有对应的Proxy对象，直接返回
   * @example 
   * const obj = {}
   * const reactiveObj = reactive(obj)
   * const copy = reactive(obj)
   * copy === reactiveObj // true
   */
  const existingProxy = proxyMap.get(target)
  if (existingProxy) {
    return existingProxy
  }
  /**
   * 如果target不是对象类型，直接返回
   * @example
   * const obj = 1
   * const reactiveObj = reactive(obj) // 1
   */
  const targetType = getTargetType(target)
  if (targetType === TargetType.INVALID) {
    return target
  }
  const proxy = new Proxy(
    target,
    targetType === TargetType.COLLECTION ? collectionHandlers : baseHandlers,
  )
  proxyMap.set(target, proxy)
  return proxy
}

export type Raw<T> = T & { [RawSymbol]?: true }

export function markRaw<T extends object>(value: T): Raw<T> {
  if (Object.isExtensible(value)) {
    /**
     * 为对象添加一个标记，表示这个对象不需要被代理
     * @example
     * const obj = markRaw({})
     * const copy = reactive(obj)
     */
    def(value, ReactiveFlags.SKIP, true)
  }
  /**
   * @question :如果是不可扩展的对象，它是如何实现不被代理的？
   * @answer :在代理时：通过Object.isExtensible()方法判断对象是否可扩展，如果不可扩展，直接返回原对象
   */

  return value
}

export function reactive(target: object) {
  if (isReadonly(target)) {
    /**
     * 如果target是只读对象，直接返回
     */
    return target
  }
  return createReactiveObject(
    target,
    false,
    mutableHandlers,
    mutableCollectionHandlers,
    reactiveMap,
  )
}

function isReadonly(target: Target) {
  return !!target[ReactiveFlags.IS_READONLY]
}