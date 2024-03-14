import { TrackOpTypes } from "./constants";

export let activeEffect: ReactiveEffect | null = null;
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
      // TODO: 依赖收集
      return this.fn();
    } finally {
      // 依赖收集完毕后，将activeEffect恢复到上一个effect
      activeEffect = this.parent;
      this.parent = null;
    }

  }
}

export function effect(fn: () => void) {
  // 当收集的依赖变化时，执行fn
  const _effect = new ReactiveEffect(fn);
  _effect.run(); // 执行依赖收集
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