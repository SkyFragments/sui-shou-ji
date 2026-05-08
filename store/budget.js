/**
 * Budget Store - 预算管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { useBillStore } from './bill'

// 存储键名
const STORAGE_KEY = 'ssj_budgets'

// 默认预算
const DEFAULT_BUDGET = 3000

export const useBudgetStore = defineStore('budget', {
  state: () => ({
    budgets: {}
  }),

  getters: {
    // 获取当前月份预算
    currentBudget(state) {
      const yearMonth = getCurrentYearMonth()
      return state.budgets[yearMonth] || DEFAULT_BUDGET
    },

    // 获取指定月份预算
    getBudgetByMonth: (state) => (yearMonth) => {
      return state.budgets[yearMonth] || DEFAULT_BUDGET
    },

    // 获取当前月份已使用金额
    currentUsed(state) {
      const billStore = useBillStore()
      const yearMonth = getCurrentYearMonth()
      const stats = billStore.getMonthStats(yearMonth)
      return stats.expense
    },

    // 获取当前月份预算使用比例
    usageRatio(state) {
      const used = this.currentUsed
      const budget = this.currentBudget
      if (budget === 0) return 0
      return used / budget
    },

    // 获取当前月份剩余预算
    remaining(state) {
      return this.currentBudget - this.currentUsed
    },

    // 获取使用状态 (normal/warning/danger)
    usageStatus(state) {
      const ratio = this.usageRatio
      if (ratio >= 1.2) return 'danger'
      if (ratio >= 1) return 'warning'
      if (ratio >= 0.8) return 'caution'
      return 'normal'
    }
  },

  actions: {
    // 加载所有预算
    loadBudgets() {
      const data = getStorage(STORAGE_KEY)
      this.budgets = data || {}
      return this.budgets
    },

    // 设置月度预算
    setBudget(yearMonth, amount) {
      // 存储为对象以匹配 schema: { year_month, total_budget }
      this.budgets[yearMonth] = {
        year_month: yearMonth,
        total_budget: amount,
        update_time: Date.now()
      }
      this.saveBudgets()
      return this.budgets[yearMonth]
    },

    // 获取月度预算
    getBudget(yearMonth) {
      const budget = this.budgets[yearMonth]
      return budget?.total_budget || DEFAULT_BUDGET
    },

    // 计算预算使用情况
    calculateUsage(yearMonth) {
      const billStore = useBillStore()
      const budget = this.getBudget(yearMonth)
      const stats = billStore.getMonthStats(yearMonth)
      const used = stats.expense
      const remaining = budget - used
      const ratio = budget > 0 ? used / budget : 0

      return {
        budget,
        used,
        remaining,
        ratio,
        isOverBudget: used > budget,
        isWarning: ratio >= 0.8,
        isDanger: ratio >= 1
      }
    },

    // 保存到本地存储
    saveBudgets() {
      setStorage(STORAGE_KEY, this.budgets)
    },

    // 重置预算
    resetBudgets() {
      this.budgets = {}
      this.saveBudgets()
    }
  }
})

// 获取当前年月 YYYY-MM
function getCurrentYearMonth() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
}