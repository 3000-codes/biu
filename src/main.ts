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

  const runner = effect(() => {
    console.log('effect is running')
    console.log(a.a + 'has changed')
  }, {
    scheduler: () => {
      console.log('scheduler')
      runner()
    }

  })

  setTimeout(() => {
    a.a = 2

  }, 1000)


})()