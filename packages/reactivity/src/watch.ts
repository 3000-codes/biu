import { ReactiveEffect } from "./effect";

export function watch(source: any, cb: () => void) {



  const effect = new ReactiveEffect(cb)
}