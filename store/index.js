/**
 * Pinia Store 入口文件
 * 随手记 - 个人记账小程序
 */

import { createPinia } from 'pinia'

const pinia = createPinia()

// 注册所有 store
export function registerStores(app) {
  app.use(pinia)
}

// 导出 store 实例
export { pinia }