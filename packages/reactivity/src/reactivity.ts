import { isObject } from '@biu/shared'
import { ReactiveFlags } from './constants'
import { baseHandlers } from './baseHandlers'

type Target = {
  [ReactiveFlags.IS_REACTIVE]?: boolean
}


const reactiveMap = new WeakMap() // 缓存已经代理过的对象
// 将数据转为响应式
export function reactive(target: object) {
  if (!isObject(target)) return // 不是对象直接返回
  if (target[ReactiveFlags.IS_REACTIVE]) {
    /**
     * 如果已经是响应式对象直接返回
     * const a = reactive({ a: 1 })
     * const b = reactive(a)
     * b === a //=> true
     */
    return target
  }
  if (reactiveMap.has(target)) {
    /**
     * 如果已经代理过直接返回
     * const original = { a: 1 }
     * const a = reactive(original)
     * const b = reactive(original)
     * b === a //=> true
     */

    return reactiveMap.get(target)
  }
  const proxy = new Proxy(target, baseHandlers)
  reactiveMap.set(target, proxy) // 缓存代理对象
  return proxy
}

export function isReactive<T>(target: T): boolean {
  return (target as Target)[ReactiveFlags.IS_REACTIVE] === true
}