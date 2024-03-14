import type { ReactiveEffect } from './effect'

let activeEffectScope: EffectScope | undefined

export class EffectScope {
  private _active: boolean = true
  effects: ReactiveEffect[] = []
  cleanups: (() => void)[] = []
  parent: EffectScope | undefined
  scopes: EffectScope[] | undefined
  private index: number | undefined
  constructor(public detached = false) {
    this.parent = activeEffectScope // 父级作用域(如果是根作用域,则为undefined)
    if (!detached && activeEffectScope) {
      this.index = (activeEffectScope.scopes || (activeEffectScope.scopes = [])).push(this) - 1
    }
  }

  get active() {
    return this._active
  }

  run<T>(fn: () => T): T | undefined {
    if (this.active) {
      try {
        this._active = false
        activeEffectScope = this // 设置当前作用域为激活作用域
        return fn()
      } finally {
        this._active = true
        activeEffectScope = this.parent
      }
    } else {
      console.warn(`cannot run an inactive effect scope.`)
    }
  }

  on(): void {
    activeEffectScope = this
  }
  off() {
    activeEffectScope = this.parent
  }
  stop(fromParent?: boolean) {
    if (this.active) {
      let index, len;
      for (index = 0, len = this.effects.length; index < len; index++) {
        this.effects[index].stop()
      }
      for (index = 0, len = this.cleanups.length; index < len; index++) {
        this.cleanups[index]()
      }
      if (this.scopes) {
        for (index = 0, len = this.scopes.length; index < len; index++) {
          this.scopes[index].stop(true)
        }
      }
      if (!this.detached && this.parent && !fromParent) {
        const last = this.parent.scopes!.pop()!
        if (last && last !== this) {
          this.parent.scopes![this.index!] = last
          last.index = this.index
        }
      }
      this.parent = undefined
      this._active = false
    }
  }
}

export function effectScope(detached?: boolean) {
  return new EffectScope(detached) // 创建一个作用域
}

export function recordEffectScope(effect: ReactiveEffect, scope: EffectScope | undefined = activeEffectScope,) {
  if (scope && scope.active) {
    // 如果作用域存在,并且是激活的,则将effect添加到作用域中
    scope.effects.push(effect)
  }
}

export function getCurrentScope() {
  // 获取当前作用域
  return activeEffectScope
}

export function onScopeDispose(fn: () => void) {
  if (!activeEffectScope) {
    console.warn(`onDispose() is called when there is no active effect scope`)
  }
  activeEffectScope && activeEffectScope.cleanups.push(fn) // 添加清理函数
}
