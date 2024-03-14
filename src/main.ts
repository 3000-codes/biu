import { createApp, defineComponent, createElementVNode as cev } from 'vue'
// import { effect, reactive } from 'vue'
import { effect, reactive } from '@biu/reactive'

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

  // effect(() => {
  //   console.log(a.a)
  // })

  setInterval(() => {
    a.a++
  }, 1000)
  a.a = 2
})()