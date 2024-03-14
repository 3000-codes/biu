import { hasChanged } from '@biu/shared'
import { DirtyLevels } from './constants'
import { Dep } from './dep'
import { toReactive, toRaw, isShallow, isReadonly } from './reactive'

declare const RefSymbol: unique symbol
export interface Ref<T = any> {
  value: T
  /**
   * Type differentiator only.
   * We need this to be in public d.ts but don't want it to show up in IDE
   * autocomplete, so we use a private Symbol instead.
   */
  [RefSymbol]: true
}

type RefBase<T> = {
  dep?: Dep
  value: T
}

export function isRef<T>(r: Ref<T> | unknown): r is Ref<T>
export function isRef(r: any): r is Ref {
  return !!(r && r.__v_isRef === true)
}

/**
 * @description 追踪ref的值
 * @param ref 
 */
function trackRefValue(ref) { }
/**
 * @description ref的值发生改变,触发依赖
 * @param ref 
 */
function triggerRefValue(ref, dirtyLevel: DirtyLevels, newVal) { }

class RefImp<T> {
  private _value: T // 值
  private _rawValue: T // 原始值

  public dep?: Dep = undefined // 依赖, 用于收集依赖
  public readonly __v_isRef = true // 标识是ref

  constructor(value: T, private readonly _shallow: boolean) {
    this._rawValue = _shallow ? value : toRaw(value)
    this._value = _shallow ? value : toReactive(value)
  }

  get value() {
    trackRefValue(this)
    return this._value
  }

  set value(newVal) {
    const useDirectValue = this._shallow || isShallow(newVal) || isReadonly(newVal) // 是否使用原始值
    newVal = useDirectValue ? newVal : toRaw(newVal) // 使用原始值
    if (hasChanged(newVal, this._rawValue)) { // 值发生改变
      this._rawValue = newVal
      this._value = useDirectValue ? newVal : toReactive(newVal)
      triggerRefValue(this, DirtyLevels.Dirty, newVal)
    }
  }




}