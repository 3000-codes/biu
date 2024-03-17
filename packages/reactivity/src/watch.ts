import { NOOP, hasChanged, isFunction, isObject } from "@biu/shared";
import { ReactiveEffect } from "./effect";
import { isReactive } from "./reactivity";
type OnCleanup = (cleanupFn: () => void) => void
type WatchCallback = (newValue: any, oldValue: any, onCleanup?: OnCleanup) => void

function traverse(value: any, set: Set<any> = new Set()) {
  if (!isObject(value)) return // 递归终止条件1：不是对象
  if (set.has(value)) return value // 递归终止条件2：已经收集过
  set.add(value)
  for (const key in value) {
    traverse(value[key], set)
  }
  return value
}

export function watch(source: any, cb: WatchCallback) {
  let getter: () => any = NOOP
  if (isReactive(source)) {
    /**
     * 只有响应式对象才能进行依赖收集
     * const a = reactive({ a: 1 })
     * watch(a, (newValue, oldValue) => {})
     */
    // getter = () => source
    getter = () => traverse(source) // 收集依赖
  }
  else if (isFunction(source)) {
    /**
     * 如果是函数直接执行
     * const a = reactive({ a: 1 })
     * watch(() => a.a, (newValue, oldValue) => {})
     */
    getter = source // 函数直接执行
  }
  let clean: () => void
  const cleanup = (fn: () => void) => {
    clean = fn
  }
  let oldValue: any;
  const scheduler = () => {
    if (clean) {
      /**
       * 如果有清除函数，执行清除函数:阻断上次的异步请求
       * watch(() => input.value, async (newValue, oldValue, onCleanup) => {
       *    let clear= false
       *    onCleanup(() => {
       *      clear = true
       *    })
       *   const res = await fetch('https://api.github.com/users')
       *  if (clear) return
       * console.log(res)
       * })
       */
      clean()
    }
    const newValue = effect.run()
    if (hasChanged(newValue, oldValue)) {
      cb(newValue, oldValue, cleanup)
      oldValue = newValue
    }
  }
  const effect = new ReactiveEffect(getter, scheduler)
  oldValue = effect.run()
  return () => {
    effect.stop()
  }
}