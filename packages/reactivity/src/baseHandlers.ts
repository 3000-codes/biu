// const baseHandlers: ProxyHandler<any> = {};

class BaseHandlers implements ProxyHandler<any> {
  get(target: any, p: string | symbol, receiver: any) {
    console.log('get', p)
    return Reflect.get(target, p, receiver)
  }
}