import { TrackOpTypes, TriggerOpTypes } from "./constants";

export let activeEffect: ReactiveEffect | null = null;

function cleanupEffect(effect: ReactiveEffect) {
  /**
   * 清除之前收集的依赖，避免重复收集
   * 
   * const a = reactive({ a: 1 })
   * effect(() => {
   *  console.log(a.a)
   * })
   * 
   * setTimeout(() => {
   *    a.a = 2
   *      setTimeout(() => {
   *        a.a = 3
   *      }, 1000)
   * }, 1000)
   * 
   */

  effect.deps.forEach((dep: any) => {
    dep.delete(effect);
  });
  effect.deps.length = 0;
}
class ReactiveEffect {
  public active = true // 是否为激活状态
  public parent: ReactiveEffect | null = null // 父级effect(嵌套effect时使用)
  public deps: any[] = [] // 依赖收集
  constructor(public fn: () => void) { }
  run() {
    if (!this.active) {
      // 如果不是激活状态，直接返回,不进行依赖收集
      return this.fn();
    }
    try {
      this.parent = activeEffect; // 将当前的effect赋值给parent
      activeEffect = this; // 将当前的effect赋值给activeEffect
      cleanupEffect(this);
      return this.fn();
    } finally {
      // 依赖收集完毕后，将activeEffect恢复到上一个effect
      activeEffect = this.parent;
      this.parent = null;
    }

  }

  stop() {
    // 停止effect
    if (this.active) {
      cleanupEffect(this);
      this.active = false;
    }
  }
}

export interface ReactiveEffectRunner<T = any> {
  (): T
  effect: ReactiveEffect
}

export function effect(fn: () => void): ReactiveEffectRunner {
  // 当收集的依赖变化时，执行fn
  const _effect = new ReactiveEffect(fn);
  _effect.run(); // 执行依赖收集

  const runner = _effect.run.bind(_effect) as ReactiveEffectRunner;// 将run方法绑定到effect上
  runner.effect = _effect; // 将effect赋值给runner,用户可以手动停止effect
  /**
   * const a = reactive({ a: 1 })
   * const runner = effect(() => {
   *    console.log(a.a)
   * })
   * runner.effect.stop() // 停止effect
   * setTimeout(() => {
   *    a.a = 2 // 不会触发effect
   *    runner() // 手动触发effect
   *    a.a = 3 // 会触发effect
   * }, 1000)
   */
  return runner;
}

const targetMap = new WeakMap<object, Map<string | symbol, Set<ReactiveEffect>>>();

export function track(target: object, operation: TrackOpTypes, key: string | symbol) {
  if (activeEffect === null) {
    /**
     * 如果没有激活的effect，说明不是在effect中执行的
     * const a = reactive({ a: 1 })
     * effect(() => {})
     * a.a //=> 不会触发track
     */
    return;
  }
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    // 如果没有依赖收集的map，创建一个新的map
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }
  let dep = depsMap.get(key);
  if (!dep) {
    // 如果没有依赖收集的set，创建一个新的set
    dep = new Set();
    depsMap.set(key, dep);
  }
  let shouldTrack = !dep.has(activeEffect); // 是否已经收集过
  if (shouldTrack) {
    dep.add(activeEffect); // 收集依赖
    activeEffect.deps.push(dep); // 将依赖添加到effect中,用于清除依赖，双向收集
    // 因为effect中可能会有多个依赖，所以需要将依赖收集到effect中
    // 一个数据可以被多个effect收集

  }
  console.log('track', key)
}

export function trigger(target: object, operation: TriggerOpTypes, key: string | symbol, value: any, oldValue: any) {
  const depsMap = targetMap.get(target)
  if (!depsMap) {
    // 如果依赖未被收集，不进行触发
    return
  }
  let effects = depsMap.get(key) // 获取依赖
  if (effects) {
    effects = new Set(effects) // 防止在执行effect时，depsMap被修改
    // 执行依赖副作用
    effects.forEach((effect: ReactiveEffect) => {
      if (effect === activeEffect) {
        // 如果是当前的effect，不进行触发,防止死循环
        return
      }
      effect.run()
    })
  }
}