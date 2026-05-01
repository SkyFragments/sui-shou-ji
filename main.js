import App from './App'
import { registerStores, useBillStore, useCategoryStore, useAccountStore, useBudgetStore } from './store'
import { initCategories, initAccounts } from './utils/init-data'

// #ifndef VUE3
import Vue from 'vue'
import './uni.promisify.adaptor'
import { createPinia } from 'pinia'

Vue.config.productionTip = false
App.mpType = 'app'

// 注册 Pinia stores
const pinia = createPinia()
Vue.use(pinia)

// 初始化 stores
Vue.prototype.$stores = {
  bill: useBillStore(),
  category: useCategoryStore(),
  account: useAccountStore(),
  budget: useBudgetStore()
}

// 初始化默认数据
Vue.prototype.$initData = () => {
  const categoryStore = useCategoryStore()
  const accountStore = useAccountStore()
  categoryStore.loadCategories()
  accountStore.loadAccounts()
}

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

  // 初始化 stores
  app.config.globalProperties.$stores = {
    bill: useBillStore(),
    category: useCategoryStore(),
    account: useAccountStore(),
    budget: useBudgetStore()
  }

  // 初始化默认数据
  app.config.globalProperties.$initData = () => {
    const categoryStore = useCategoryStore()
    const accountStore = useAccountStore()
    categoryStore.loadCategories()
    accountStore.loadAccounts()
  }

  return {
    app
  }
}
// #endif