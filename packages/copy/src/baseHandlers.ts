/**
 * @file baseHandler.ts
 * @description proxy 对于基础类型的处理
 */
import { Target, isReadonly, isShallow, reactive, reactiveMap, readonly, readonlyMap, shallowReactiveMap, shallowReadonlyMap, toRaw, } from "./reactive"
import { ReactiveFlags, TrackOpTypes, TriggerOpTypes } from "./constants";
import { hasChanged, hasOwn, isArray, isIntegerKey, isObject, isSymbol, makeMap } from "@biu/shared";
import { track, trigger } from "./reactiveEffect";
import { pauseScheduling, pauseTracking, resetScheduling, resetTracking } from "./effect";
import { isRef } from "./ref";

/**
 * @description 创建数组的代理
 */
function createArrayInstrumentations() {
  const instrumentations: Record<string, Function> = {}
  const identities = ['includes', 'indexOf', 'lastIndexOf']
  identities.forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      const arr = toRaw(this) as any
      for (let i = 0, l = this.length; i < l; i++) {
        track(arr, TrackOpTypes.GET, i + '') // 追踪数组的索引
      }
      const res = arr[key](...args)
      if (res === -1 || res === false) {
        return arr[key](...args.map(toRaw))
      } else {
        return res
      }

    }
  })

  const methods = ['push', 'pop', 'shift', 'unshift', 'splice']
  methods.forEach(key => {
    instrumentations[key] = function (this: unknown[], ...args: unknown[]) {
      pauseTracking() // 暂停追踪
      pauseScheduling() // 暂停调度
      const arr = toRaw(this) as any
      const res = arr[key].apply(this, args)
      resetScheduling() // 重置调度
      resetTracking() // 重置追踪
      return res
    }
  })

  return instrumentations
}

function hasOwnProperty(this: object, key: string) {
  const obj = toRaw(this)
  track(obj, TrackOpTypes.HAS, key)
  return obj.hasOwnProperty(key)
}

const arrayInstrumentations = createArrayInstrumentations()

const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`)
const builtInSymbols = new Set(
  Object.getOwnPropertyNames(Symbol)
    .filter(key => key !== 'arguments' && key !== 'caller') // 兼容ios
    .map(key => (Symbol as any)[key])
    .filter(isSymbol)
)

class BaseReactiveHandler implements ProxyHandler<object> {
  constructor(protected readonly _shallow = false, protected readonly _readonly = false) { }

  get(target: Target, key: string | symbol, receiver: object) {
    const isReadonly = this._readonly,
      isShallow = this._shallow;
    if (key === ReactiveFlags.IS_REACTIVE) {
      // 如果是响应式对象
      return !isReadonly;
    }
    if (key === ReactiveFlags.IS_READONLY) {
      // 如果是只读对象
      return isReadonly;
    }
    if (key === ReactiveFlags.IS_SHALLOW) {
      // 如果是浅层对象
      return isShallow;
    }
    if (key === ReactiveFlags.RAW) {
      // 如果是已代理的原始对象
      const mapper = isReadonly ?
        isShallow ?
          shallowReadonlyMap :
          readonlyMap
        : isShallow ?
          shallowReactiveMap :
          reactiveMap;
      const value = mapper.get(target);
      if (receiver === value || Object.getPrototypeOf(receiver) === value) {
        return target;
      }
      return
    }

    // 数组处理
    const arrarTarget = Array.isArray(target); // 判断是否是数组
    if (!isReadonly) {
      if (arrarTarget && hasOwn(arrayInstrumentations, key)) {
        return Reflect.get(arrayInstrumentations, key, receiver)
      }
      if (key === 'hasOwnProperty') {
        return hasOwnProperty
      }
    }

    const res = Reflect.get(target, key, receiver)

    // 处理内置的symbol
    if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
      return res
    }

    if (!isReadonly) {
      track(target, TrackOpTypes.GET, key)
    }

    if (isShallow) {
      // 如果是浅层对象,则返回原始值
      return res
    }

    if (isRef(res)) {
      return arrarTarget && isIntegerKey(key) ? res : res.value
    }
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res)
    }
    return res

  }
}

class MutableHandler extends BaseReactiveHandler {
  constructor(shallow = false) {
    super(shallow, false)
  }

  set(target: Target, key: string | symbol, value: unknown, receiver: object): boolean {
    let oldValue = (target as any)[key]
    if (!this._shallow) {
      const isOldValueReadonly = isReadonly(oldValue)
      if (!isShallow(value) && !isReadonly(value)) {
        oldValue = toRaw(oldValue)
        value = toRaw(value)
      }
      if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
        if (isOldValueReadonly) {
          return false
        } else {
          oldValue.value = value
          return true
        }
      }
    }

    const hadKey = isArray(target) && isIntegerKey(key) ? Number(key) < target.length : hasOwn(target, key)
    const result = Reflect.set(target, key, value, receiver)

    if (target === toRaw(receiver)) {
      if (!hadKey) {
        // 添加属性
        trigger(target, TriggerOpTypes.ADD, key, value)
      } else if (hasChanged(value, oldValue)) {
        // 修改属性
        trigger(target, TriggerOpTypes.SET, key, value, oldValue)
      }
    }

    return result
  }

  deleteProperty(target: Target, key: string | symbol): boolean {
    const hadKey = hasOwn(target, key)
    const oldValue = (target as any)[key]
    const result = Reflect.deleteProperty(target, key)
    if (result && hadKey) {
      trigger(target, TriggerOpTypes.DELETE, key, undefined, oldValue)
    }
    return result
  }

  has(target: Target, key: string | symbol): boolean {
    const result = Reflect.has(target, key)
    if (!isSymbol(key) || !builtInSymbols.has(key)) {
      track(target, TrackOpTypes.HAS, key)
    }
    return result
  }

  ownKeys(target: Target): (string | symbol)[] {
    track(target, TrackOpTypes.ITERATE, isArray(target) ? 'length' : 'keys')
    return Reflect.ownKeys(target)
  }
}
class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(isShallow, true)
  }

  set(target: object, key: string | symbol) {
    if (__DEV__) {
      console.warn(
        `Set operation on key "${String(key)}" failed: target is readonly.`,
        target,
      )
    }
    return true
  }

  deleteProperty(target: object, key: string | symbol) {
    if (__DEV__) {
      console.warn(
        `Delete operation on key "${String(key)}" failed: target is readonly.`,
        target,
      )
    }
    return true
  }
}

export const mutableReactiveHandlers: ProxyHandler<object> = new MutableHandler()

export const readonlyHandlers: ProxyHandler<object> = new ReadonlyReactiveHandler()

export const shallowReactiveHandlers: ProxyHandler<object> = new MutableHandler(true)

export const shallowReadonlyHandlers: ProxyHandler<object> = new ReadonlyReactiveHandler(true)