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
  // const b = reactive(a)

  effect(() => {
    console.log('effect is running')
    console.log(a.a + 'has changed')
  })

  setTimeout(() => {
    a.a = 2
    a.a = 3
    setTimeout(() => {
      a.a = 4
      a.a = 5
    }, 1000)
  }, 1000)


})()