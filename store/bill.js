/**
 * Bill Store - 账单记录管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { useSyncStore } from '@/store/sync'
import { generateId } from '@/utils/db'
import { postRecord, putRecord, deleteRecord } from '@/utils/api'

// 存储键名
const STORAGE_KEY = 'ssj_records'

// 初始化数据
function initRecords() {
  return []
}

export const useBillStore = defineStore('bill', {
  state: () => ({
    records: []
  }),

  getters: {
    // 按日期获取账单
    getRecordsByDate: (state) => (date) => {
      return state.records.filter(r => r.record_date === date)
    },

    // 按月份获取账单
    getRecordsByMonth: (state) => (yearMonth) => {
      return state.records.filter(r => r.record_date && r.record_date.startsWith(yearMonth))
    },

    // 获取今日账单
    todayRecords(state) {
      const today = formatLocalDate(new Date())
      return state.records.filter(r => r.record_date === today)
    },

    // 获取今日支出
    todayExpense(state) {
      const today = formatLocalDate(new Date())
      return state.records
        .filter(r => r.record_date === today && r.type === 1)
        .reduce((sum, r) => sum + r.amount, 0)
    },

    // 获取今日收入
    todayIncome(state) {
      const today = formatLocalDate(new Date())
      return state.records
        .filter(r => r.record_date === today && r.type === 2)
        .reduce((sum, r) => sum + r.amount, 0)
    }
  },

  actions: {
    // 加载所有账单
    loadRecords() {
      const data = getStorage(STORAGE_KEY)
      this.records = data || initRecords()
      return this.records
    },

    // 添加账单
    addRecord(record) {
      const now = Date.now()
      const newRecord = {
        id: generateId(),
        type: record.type || 1,
        amount: record.amount || 0,
        category_code: record.category_code || '',
        category_name: record.category_name || '',
        account_code: record.account_code || 'cash',
        remark: record.remark || '',
        // 用本地日期而非 UTC：toISOString() 会在东八区凌晨把当天划到前一天
        record_date: record.record_date || formatLocalDate(new Date()),
        // 视觉覆盖：快捷记账保留模板 icon/color；普通记账传 null，渲染层回退 category
        icon: record.icon || null,
        color: record.color || null,
        create_time: now,
        update_time: now,
        sync_status: 0
      }
      this.records.unshift(newRecord)
      this.saveRecords()

      // Sync to cloud (fire-and-forget, queue on failure)
      this.syncToCloudAfterAdd(newRecord).catch(err => {
        const syncStore = useSyncStore()
        syncStore.addPendingSync('record_add', newRecord)
      })

      return newRecord
    },

    // 更新账单
    updateRecord(id, updates) {
      const index = this.records.findIndex(r => r.id === id)
      if (index !== -1) {
        this.records[index] = {
          ...this.records[index],
          ...updates,
          update_time: Date.now(),
          sync_status: 0
        }
        this.saveRecords()

        // Sync update to cloud via REST API; queue on failure
        const updated = this.records[index]
        this.syncUpdateInCloud(updated).catch(err => {
          const syncStore = useSyncStore()
          syncStore.addPendingSync('record_update', updated)
        })

        return updated
      }
      return null
    },

    // 更新云端记录：调真实 REST，失败抛错让外层 .catch 排队
    async syncUpdateInCloud(record) {
      const { id, ...rest } = record
      await putRecord(id, rest)
      return { success: true }
    },

    // 删除账单
    deleteRecord(id) {
      const index = this.records.findIndex(r => r.id === id)
      if (index !== -1) {
        const deletedRecord = this.records[index]
        this.records.splice(index, 1)
        this.saveRecords()

        // Sync delete to cloud via REST API; queue on failure
        this.syncDeleteFromCloud(id).catch(err => {
          const syncStore = useSyncStore()
          syncStore.addPendingSync('record_delete', { id, ...deletedRecord })
        })

        return true
      }
      return false
    },

    // 从云端删除记录：调真实 REST，失败抛错让外层 .catch 排队
    async syncDeleteFromCloud(id) {
      await deleteRecord(id)
      return { success: true }
    },

    // 保存到本地存储
    saveRecords() {
      setStorage(STORAGE_KEY, this.records)
    },

    // 获取指定日期范围的账单
    getRecordsByDateRange(startDate, endDate) {
      return this.records.filter(r => {
        return r.record_date >= startDate && r.record_date <= endDate
      })
    },

    // 获取月份统计
    getMonthStats(yearMonth) {
      const monthRecords = this.getRecordsByMonth(yearMonth)
      const expense = monthRecords
        .filter(r => r.type === 1)
        .reduce((sum, r) => sum + r.amount, 0)
      const income = monthRecords
        .filter(r => r.type === 2)
        .reduce((sum, r) => sum + r.amount, 0)
      return {
        expense,
        income,
        balance: income - expense,
        count: monthRecords.length
      }
    },

    // 获取分类统计
    getCategoryStats(yearMonth, type = 1) {
      const monthRecords = this.getRecordsByMonth(yearMonth).filter(r => r.type === type)
      const stats = {}
      monthRecords.forEach(r => {
        if (!stats[r.category_code]) {
          stats[r.category_code] = {
            code: r.category_code,
            name: r.category_name,
            total: 0
          }
        }
        stats[r.category_code].total += r.amount
      })
      return Object.values(stats)
    },

    // 同步到云端（添加记录后调用）：真实调 REST，失败抛错让外层 .catch 排队
    async syncToCloudAfterAdd(record) {
      await postRecord(record)
      return { success: true }
    },

    // 从云端同步数据
    // syncFromCloud is now handled by sync store
  }
})

/**
 * 格式化本地日期为 YYYY-MM-DD（不转 UTC）
 * 替代 toISOString().split('T')[0]，避免东八区凌晨记到前一天
 */
function formatLocalDate(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}
