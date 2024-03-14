
import { hasChanged } from "@biu/shared"
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from "./constants"
import { track, trigger } from "./effect"

class BaseHandlers implements ProxyHandler<any> {
  get(target: any, key: string | symbol, receiver: any) {
    if (key === ReactiveFlags.IS_REACTIVE) return true // 判断是否是响应式对象

    const res = Reflect.get(target, key, receiver)
    console.log('get', key, res)
    track(target, TrackOpTypes.GET, key)
    return res
  }
  set(target: any, key: string | symbol, value: any, receiver: any) {
    const oldValue = target[key]
    const res = Reflect.set(target, key, value, receiver)
    console.log('set', key, value)
    if (hasChanged(value, oldValue)) {
      // 如果值发生变化，触发依赖更新
      console.log('trigger', key)
      trigger(target, TriggerOpTypes.SET, key, value, oldValue)
    }
    return res
  }
}

export const baseHandlers: ProxyHandler<any> = new BaseHandlers()