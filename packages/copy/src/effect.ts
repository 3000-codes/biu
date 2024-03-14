import { extend } from "@biu/shared";
import { ComputedRefImpl } from "./computed";
import { DirtyLevels, TrackOpTypes, TriggerOpTypes } from "./constants";
import { Dep } from "./dep";
import { EffectScope, recordEffectScope } from "./effectScope";
export type EffectScheduler = (...args: any[]) => any // 调度函数
export type DebuggerEvent = {
  effect: ReactiveEffect
} & DebuggerEventExtraInfo

export type DebuggerEventExtraInfo = {
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}

export let shouldTrack = true;
export let pauseScheduleStack = 0
export let activeEffect: ReactiveEffect | undefined
const trackStack: boolean[] = []
const queueEffectSchedulers: EffectScheduler[] = []


export function pauseTracking() {
  trackStack.push(shouldTrack)
  shouldTrack = false
}

export function resetTracking() {
  const last = trackStack.pop()
  shouldTrack = last === undefined ? true : last
}

export function pauseScheduling() {
  pauseScheduleStack++
}

export function resetScheduling() {
  pauseScheduleStack--
  while (!pauseScheduleStack && queueEffectSchedulers.length) {
    queueEffectSchedulers.shift()!()
  }
}

function triggerComputed(computed: ComputedRefImpl<any>) {
  return computed.value
}

/**
 * 
 * @param effect 
 * @description 清理effect前的操作
 */
function preCleanupEffect(effect: ReactiveEffect) {
  effect._trackId++
  effect._depsLength = 0
}

/**
 * @description 清理effect
 * @param effect 
 */
function postCleanupEffect(effect: ReactiveEffect) {
  if (effect.deps.length > effect._depsLength) {
    for (let i = effect._depsLength; i < effect.deps.length; i++) {
      cleanupDepEffect(effect.deps[i], effect)
    }
    effect.deps.length = effect._depsLength
  }
}

function cleanupDepEffect(dep: Dep, effect: ReactiveEffect) {
  const trackId = dep.get(effect)
  if (trackId !== undefined && effect._trackId !== trackId) {
    dep.delete(effect)
    if (dep.size === 0) {
      dep.cleanup()
    }
  }
}

export function trackEffects(effect: ReactiveEffect,
  dep: Dep,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo) {
  if (dep.get(effect) !== effect._trackId) {
    // 如果effect的追踪id不等于dep的追踪id
    dep.set(effect, effect._trackId)
    const oldDep = effect.deps[effect._depsLength]
    if (oldDep !== dep) {
      if (oldDep) {
        // 如果有旧的dep,则清理
        cleanupDepEffect(oldDep, effect)
      }
      effect.deps[effect._depsLength] = dep
    }
    if (__DEV__) {
      debuggerEventExtraInfo && effect.onTrack?.(extend({ effect }, debuggerEventExtraInfo!))
    }
  }
}

export function triggerEffects(
  dep: Dep,
  dirtyLevel: DirtyLevels,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo,
) {
  pauseScheduling()
  for (const eff of dep.keys()) {
    let tracking;
    if (eff._dirtyLevel < dirtyLevel &&
      (tracking ??= dep.get(eff) === eff._trackId)) {
      // 如果effect的脏等级小于脏等级,并且追踪id等于effect的追踪id
      eff._shouldSchedule ||= eff._dirtyLevel === DirtyLevels.NotDirty
      eff._dirtyLevel = dirtyLevel
    }

    if (eff._shouldSchedule &&
      (tracking ??= dep.get(eff) === eff._trackId)
    ) {
      // 如果effect需要调度,并且追踪id等于effect的追踪id
      if (__DEV__) {
        debuggerEventExtraInfo && eff.onTrigger?.(extend({ effect: eff }, debuggerEventExtraInfo!))
      }

      eff.trigger()
      if (
        (!eff._runnings || eff.allowRecurse) &&
        eff._dirtyLevel === DirtyLevels.MaybeDirty_ComputedSideEffect
      ) {
        // 如果effect没有运行,或者允许递归,并且effect的脏等级是可能脏的计算副作用
        eff._shouldSchedule = false
        if (eff.scheduler) {
          // 如果有调度函数,则添加到调度队列
          queueEffectSchedulers.push(eff.scheduler)
        }
      }
    }
  }
  resetScheduling()
}

export class ReactiveEffect<T = any> {
  active = true; // 是否激活
  deps: Dep[] = []; // 依赖
  computed?: ComputedRefImpl<T>  // 计算属性
  allowRecurse?: boolean // 是否允许递归
  onStop?: () => void // 停止函数
  onTrack?: (event: DebuggerEvent) => void // 追踪函数
  onTrigger?: (event: DebuggerEvent) => void // 触发函数
  _dirtyLevel = DirtyLevels.Dirty // 脏等级
  _trackId = 0 // 追踪id
  _runnings = 0 // 运行次数
  _shouldSchedule = false // 是否应该调度
  _depsLength = 0 // 依赖长度


  constructor(
    public fn: () => T,
    public trigger: () => void,
    public scheduler?: EffectScheduler,
    scope?: EffectScope,
  ) {
    recordEffectScope(this, scope) // 记录作用域
  }
  set dirty(value: boolean) {
    this._dirtyLevel = value ? DirtyLevels.Dirty : DirtyLevels.NotDirty
  }

  get dirty() {
    if (this._dirtyLevel === DirtyLevels.MaybeDirty || this._dirtyLevel === DirtyLevels.MaybeDirty_ComputedSideEffect) {
      // 如果是脏的
      this._dirtyLevel = DirtyLevels.QueryingDirty
      pauseTracking()
      for (let i = 0; i < this.deps.length; i++) {
        const dep = this.deps[i]
        if (dep.computed) {
          triggerComputed(dep.computed)
          if (this._dirtyLevel >= DirtyLevels.Dirty) {
            break
          }
        }

      }
      if (this._dirtyLevel === DirtyLevels.QueryingDirty) {
        this._dirtyLevel = DirtyLevels.NotDirty
      }
      resetTracking()
    }

    return this._dirtyLevel >= DirtyLevels.Dirty
  }

  run() {
    this._dirtyLevel = DirtyLevels.NotDirty // 设置为非脏
    if (!this.active) return this.fn() // 如果不激活,则直接返回
    let lastShouldTrack = shouldTrack // 记录上一次是否追踪
    let lastEffect = activeEffect // 记录上一次的effect
    try {
      shouldTrack = true // 设置为追踪
      activeEffect = this // 设置当前effect
      this._runnings++ // 运行次数+1
      preCleanupEffect(this) // 清理effect
      return this.fn() // 执行函数
    } finally {
      postCleanupEffect(this) // 清理effect
      this._runnings-- // 运行次数-1
      activeEffect = lastEffect // 设置上一次的effect
      shouldTrack = lastShouldTrack // 设置上一次是否追踪
    }
  }

  stop() {
    if (this.active) {
      preCleanupEffect(this) // 清理effect
      postCleanupEffect(this) // 清理effect
      this.onStop?.() // 执行停止函数
      this.active = false
    }
  }
}