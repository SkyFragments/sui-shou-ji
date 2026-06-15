/**
 * Budget Store - 预算管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { useBillStore } from './bill'
import { useSyncStore } from '@/store/sync'
import { generateId } from '@/utils/db'
import { postBudget, putBudget, deleteBudget, upsertByPutPost } from '@/utils/api'

// 存储键名
const STORAGE_KEY = 'ssj_budgets'

// 默认预算
const DEFAULT_BUDGET = 3000

// 预算字段校验
function validateBudgetFields(budget) {
  const requiredFields = ['id', 'year_month', 'total_budget', 'create_time', 'update_time']
  const missingFields = []
  
  for (const field of requiredFields) {
    if (budget[field] === undefined || budget[field] === null) {
      missingFields.push(field)
    }
  }
  
  if (missingFields.length > 0) {
    console.warn(`[sync] 预算字段缺失: year_month=${budget.year_month || 'unknown'}, 缺失字段: ${missingFields.join(', ')}`)
  }
  
  return missingFields.length === 0
}

export const useBudgetStore = defineStore('budget', {
  state: () => ({
    budgets: {}
  }),

  getters: {
    // 获取当前月份预算
    currentBudget(state) {
      const yearMonth = getCurrentYearMonth()
      const budget = state.budgets[yearMonth]
      // ?? 保留 0 合法值；|| 会把 0 误判为「未设置」并回退到 3000
      return budget?.total_budget ?? DEFAULT_BUDGET
    },

    // 获取指定月份预算
    getBudgetByMonth: (state) => (yearMonth) => {
      const budget = state.budgets[yearMonth]
      return budget?.total_budget ?? DEFAULT_BUDGET
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
      const now = Date.now()
      const existing = this.budgets[yearMonth]
      this.budgets[yearMonth] = {
        // id + create_time 是服务端复合主键必填，缺一即 INSERT 失败
        id: existing?.id || generateId(),
        year_month: yearMonth,
        total_budget: amount,
        create_time: existing?.create_time || now,
        update_time: now
      }
      this.saveBudgets()

      // Sync to cloud; failure queues for retry via syncPendingData
      this.syncBudget(this.budgets[yearMonth]).catch(err => {
        // 401：api.js 已清队列 + token + user；不再入队
        if (err && err.statusCode === 401) return
        useSyncStore().addPendingSync('budget_upsert', this.budgets[yearMonth])
      })

      return this.budgets[yearMonth]
    },

    // 获取月度预算
    getBudget(yearMonth) {
      const budget = this.budgets[yearMonth]
      return budget?.total_budget ?? DEFAULT_BUDGET
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
    },

    // 同步单个预算到云端：调真实 REST，失败抛错让外层 .catch 排队
    async syncBudget(budget) {
      // 字段校验
      validateBudgetFields(budget)
      
      try {
        await upsertByPutPost(putBudget, postBudget, budget)
        return { success: true }
      } catch (e) {
        console.error(`[sync] 同步预算失败: year_month=${budget.year_month}, error=${e.message}`)
        throw e
      }
    },

    // 同步所有预算到云端：失败抛错让外层 .catch 处理
    async syncToCloud() {
      const budgetsArray = Object.values(this.budgets)
      let allOk = true
      const sync = useSyncStore()
      
      console.log(`[sync] 开始同步预算，共 ${budgetsArray.length} 条`)
      
      for (const budget of budgetsArray) {
        try {
          // 字段校验
          if (!validateBudgetFields(budget)) {
            console.warn(`[sync] 跳过字段不完整的预算: year_month=${budget.year_month}`)
            allOk = false
            continue
          }
          
          await this.syncBudget(budget)
          console.debug(`[sync] 预算同步成功: year_month=${budget.year_month}`)
        } catch (e) {
          // 401：api.js 已清队列 + token + user；不再入队
          if (e && e.statusCode === 401) continue
          allOk = false
          console.error(`[sync] 预算同步失败入队: year_month=${budget.year_month}`)
          sync.addPendingSync('budget_upsert', budget)
        }
      }
      
      console.log(`[sync] 预算同步完成，成功 ${allOk ? '全部' : '部分'}`)
      return { success: allOk }
    }
  }
})

// 获取当前年月 YYYY-MM
function getCurrentYearMonth() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
}