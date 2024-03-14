import { isObject } from '@biu/shared'
import { ReactiveFlags } from './constants'
// enum ReactiveFlags {
//   IS_REACTIVE = '__v_isReactive', // 是否是响应式对象
//   IS_READONLY = '__v_isReadonly' // 是否是只读对象
// }

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
  const proxy = new Proxy(target, {
    get(target, key, receiver) {
      if (key === ReactiveFlags.IS_REACTIVE) return true // 判断是否是响应式对象

      const res = Reflect.get(target, key, receiver)
      console.log('get', key, res)
      return res
    },
    set(target, key, value, receiver) {
      const res = Reflect.set(target, key, value, receiver)
      console.log('set', key, value)
      return res
    }
  })
  reactiveMap.set(target, proxy) // 缓存代理对象
  return proxy
}