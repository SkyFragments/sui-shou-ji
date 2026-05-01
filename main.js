import App from './App'
import { registerStores } from './store'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
import { createPinia } from 'pinia'

Vue.config.productionTip = false
App.mpType = 'app'

// 注册 Pinia stores
const pinia = createPinia()
Vue.use(pinia)

const app = new Vue({
  ...App,
  pinia
})
app.$mount()
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'
import { createPinia } from 'pinia'

export function createApp() {
  const app = createSSRApp(App)
  const pinia = createPinia()
  app.use(pinia)
  return {
    app
  }
}
// #endif