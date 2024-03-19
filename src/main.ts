import { createApp, defineComponent, createElementVNode as cev, watch, markRaw } from 'vue'
import { effect, reactive } from 'vue'
// import { effect, reactive, computed } from '@biu/reactive'

const App = defineComponent({
  render() {
    return cev('h1', null, 'Hello, Vite!')
  }
})

createApp(App).mount('#app');


(() => {
  let original = { a: 1 }
  const a = reactive(original)
  const b = reactive(a)
  let c = reactive(original)
  console.log(a === b) // true
  console.log(a === c) // false

  const rawedObj = Object.freeze({ a: 1 })
  const obj = markRaw(rawedObj)
  console.log(obj, reactive(obj))

  // const runner = effect(() => {
  //   console.log('effect is running')
  //   console.log(a.a + 'has changed')
  // }, {
  //   scheduler: () => {
  //     console.log('scheduler')
  //     runner()
  //   }

  // })

  // const c = computed(() => {
  //   const res = a.a + 1
  //   console.log('computed is running', res)
  //   return res
  // })
  // effect(() => {
  //   console.log('effect is running');

  //   console.log('c value', a.a)
  // })

  // setInterval(() => {
  //   a.a += 2

  // }, 1000)


})()