import { type Dep, createDep } from './dep'
import { DirtyLevels, type TrackOpTypes, TriggerOpTypes } from './constants'
import {
  activeEffect,
  pauseScheduling,
  resetScheduling,
  shouldTrack,
  trackEffects,
  triggerEffects,
} from './effect'
import { isArray, isIntegerKey, isMap, isSymbol } from '@biu/shared'
type KeyToDepMap = Map<any, Dep>
const targetMap = new WeakMap<object, KeyToDepMap>()

export const ITERATE_KEY = Symbol(__DEV__ ? 'iterate' : '')
export const MAP_KEY_ITERATE_KEY = Symbol(__DEV__ ? 'Map key iterate' : '')

export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target) // 获取目标对象的依赖映射
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map())) // 如果没有,则创建一个新的
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep(() => depsMap!.delete(key)))) // 如果没有,则创建一个新的，并且设置清理函数
    }
    trackEffects(activeEffect, dep, __DEV__ ? { target, type, key } : void 0) // 追踪依赖
  }
}
export function trigger(target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>,) {
  const depsMap = targetMap.get(target) // 获取目标对象的依赖映射
  if (!depsMap) return
  let deps: (Dep | undefined)[] = [] // 依赖数组
  if (type === TriggerOpTypes.CLEAR) {
    // 清空操作,则触发所有依赖
    deps = [...depsMap.values()]
  }
  else if (key === 'length' && Array.isArray(target)) {
    // 如果是数组,则触发length的依赖
    const newLen = Number(newValue)
    depsMap.forEach((dep, key) => {
      if (key === 'length' || (!isSymbol(key) && key >= newLen)) {
        deps.push(dep)
      }
    })
  }
  else {
    // 其他情况,则触发key对应的依赖
    if (key !== void 0) {
      deps.push(depsMap.get(key))
    }

    const targetIsArray = isArray(target)
    const targetisMap = isMap(target)

    if (type === TriggerOpTypes.ADD) {
      if (!targetIsArray) {
        deps.push(depsMap.get(ITERATE_KEY))
        if (targetisMap) {
          deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
        }
      } else if (isIntegerKey(key)) {
        deps.push(depsMap.get('length'))
      }
    }
    else if (type === TriggerOpTypes.DELETE) {
      if (!targetIsArray) {
        deps.push(depsMap.get(ITERATE_KEY))
        if (targetisMap) {
          deps.push(depsMap.get(MAP_KEY_ITERATE_KEY))
        }
      }
    }
    else if (type === TriggerOpTypes.SET) {
      if (isMap(target)) {
        deps.push(depsMap.get(ITERATE_KEY))
      }
    }
    pauseScheduling()

    for (let dep of deps) {
      if (dep) {
        triggerEffects(dep, DirtyLevels.Dirty, __DEV__ ? { target, type, key, newValue, oldValue, oldTarget } : void 0)
      }
    }
    resetScheduling()
  }
}