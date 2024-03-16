import { isFunction } from "@biu/shared"
import { ReactiveEffect, track, trackEffects, triggerEffects } from "./effect"

export type ComputedGetter<T> = (oldValue?: T) => T
export type ComputedSetter<T> = (newValue: T) => void

export interface WritableComputedOptions<T> {
  get: ComputedGetter<T>
  set: ComputedSetter<T>
}
export class ComputedRefImpl<T> {
  public _value!: T
  public effect: ReactiveEffect // 用于收集依赖
  public dep: Set<any> = new Set() // 收集的依赖
  public dirty = true // true表示需要重新计算
  public __v_isRef = true
  public __v_isReadonly = false
  constructor(getter: ComputedGetter<T>, public setter: ComputedSetter<T>) {
    // ...
    this.effect = new ReactiveEffect(getter, () => {
      // 属性变化时，进行调度触发更新
      if (!this.dirty) {
        this.dirty = true
        // 触发更新
        triggerEffects(this.dep)
      }
    })
  }
  get value() {
    // 收集依赖
    trackEffects(this.dep)
    if (this.dirty) {
      this.dirty = false
      this._value = this.effect.run() as T
    }
    return this._value
  }
  set value(newValue: T) {
    this.setter(newValue)
  }
}
export function computed<T>(getterOrOptions: ComputedGetter<T> | WritableComputedOptions<T>) {
  let onlyGetter = isFunction(getterOrOptions)
  let getter: ComputedGetter<T>
  let setter: ComputedSetter<T>
  if (onlyGetter) {
    getter = getterOrOptions as ComputedGetter<T>
    setter = () => {
      console.warn('Write operation failed: computed value is readonly')
    }
  } else {
    ({ get: getter, set: setter } = getterOrOptions as WritableComputedOptions<T>)
  }
  return new ComputedRefImpl(getter, setter)
}