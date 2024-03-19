// mutableHandlers
// mutableCollectionHandlers

import { Target } from "./reactivity";

class BaseReactiveHandler implements ProxyHandler<Target> {
  constructor(
    protected readonly _isReadonly = false, // 是否为只读
    protected readonly _isShallow = false, // 是否为浅层代理
  ) { }
  get(target: Target, key: string | symbol, receiver: object) {
    return Reflect.get(target, key, receiver);
  }
  set(target: Target, p: string | symbol, newValue: any, receiver: any): boolean {
    return Reflect.set(target, p, newValue, receiver);
  }
}

class MutableReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(false, isShallow)
  }
}

class ReadonlyReactiveHandler extends BaseReactiveHandler {
  constructor(isShallow = false) {
    super(true, isShallow)
  }
}


export const mutableHandlers: ProxyHandler<object> =
  new MutableReactiveHandler() // 可变代理处理

export const readonlyHandlers: ProxyHandler<object> =
  new ReadonlyReactiveHandler() // 只读代理处理

export const shallowReactiveHandlers =
  new MutableReactiveHandler(true) // 浅层代理处理

/**
 * Props处理程序在某种意义上是特殊的，它不应该解开顶层的ref（以允许ref被显式传递下去），但是应该保留普通只读对象的响应性。
 */
export const shallowReadonlyHandlers =
  new ReadonlyReactiveHandler(true) // 浅层只读代理处理