export let activeEffect: ReactiveEffect | null = null;
class ReactiveEffect {
  public active = true // 是否为激活状态
  public parent: ReactiveEffect | null = null // 父级effect(嵌套effect时使用)
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
