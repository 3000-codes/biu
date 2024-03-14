import type { ReactiveEffect } from './effect'
import type { ComputedRefImpl } from './computed'

export type Dep = Map<ReactiveEffect, number> & {
  cleanup: () => void // 清理函数
  computed?: ComputedRefImpl<any> // 计算属性
}

export const createDep = (
  cleanup: () => void,
  computed?: ComputedRefImpl<any>,
): Dep => {
  const dep = new Map() as Dep
  dep.cleanup = cleanup
  dep.computed = computed
  return dep
}