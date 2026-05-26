/**
 * Pinia Store 入口文件
 * 随手记 - 个人记账小程序
 */

import { createPinia } from 'pinia'

// 导入所有 store
import { useBillStore } from './bill'
import { useCategoryStore } from './category'
import { useAccountStore } from './account'
import { useBudgetStore } from './budget'
import { useSyncStore } from './sync'

const pinia = createPinia()

// 注册所有 store
export function registerStores(app) {
  app.use(pinia)
}

// 导出 store 实例
export { pinia }

// 导出所有 store
export {
  useBillStore,
  useCategoryStore,
  useAccountStore,
  useBudgetStore,
  useSyncStore
}