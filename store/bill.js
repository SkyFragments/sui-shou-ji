/**
 * Bill Store - 账单记录管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { useSyncStore } from '@/store/sync'
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
      const today = new Date().toISOString().split('T')[0]
      return state.records.filter(r => r.record_date === today)
    },

    // 获取今日支出
    todayExpense(state) {
      const today = new Date().toISOString().split('T')[0]
      return state.records
        .filter(r => r.record_date === today && r.type === 1)
        .reduce((sum, r) => sum + r.amount, 0)
    },

    // 获取今日收入
    todayIncome(state) {
      const today = new Date().toISOString().split('T')[0]
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
        id: now.toString(),
        type: record.type || 1,
        amount: record.amount || 0,
        category_code: record.category_code || '',
        category_name: record.category_name || '',
        account_code: record.account_code || 'cash',
        remark: record.remark || '',
        record_date: record.record_date || new Date().toISOString().split('T')[0],
        create_time: now,
        update_time: now,
        sync_status: 0
      }
      this.records.unshift(newRecord)
      this.saveRecords()
      
      // Sync to cloud (fire-and-forget, queue on failure)
      this.syncToCloudAfterAdd().catch(err => {
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
        
        // Sync update to cloud (fire-and-forget, queue on failure)
        this.syncUpdateInCloud(this.records[index]).catch(err => {
          const syncStore = useSyncStore()
          syncStore.addPendingSync('record_update', this.records[index])
        })
        
        return this.records[index]
      }
      return null
    },
    
    // 更新云端记录
    async syncUpdateInCloud(record) {
      try {
        const { syncUpdateToCloud } = await import('@/utils/db')
        const { getStoredUser } = await import('@/utils/auth')
        const user = getStoredUser()
        if (!user?.openid) return { success: false, offline: true }
        return await syncUpdateToCloud(record, user.openid)
      } catch (e) {
        console.error('Sync update failed:', e)
        return { success: false, error: e }
      }
    },

    // 删除账单
    deleteRecord(id) {
      const index = this.records.findIndex(r => r.id === id)
      if (index !== -1) {
        const deletedRecord = this.records[index]
        this.records.splice(index, 1)
        this.saveRecords()
        
        // Sync delete to cloud (fire-and-forget, queue on failure)
        this.syncDeleteFromCloud(id).catch(err => {
          const syncStore = useSyncStore()
          syncStore.addPendingSync('record_delete', { id, ...deletedRecord })
        })
        
        return true
      }
      return false
    },
    
    // 从云端删除记录
    async syncDeleteFromCloud(id) {
      try {
        const { syncDeleteFromCloud } = await import('@/utils/db')
        const { getStoredUser } = await import('@/utils/auth')
        const user = getStoredUser()
        if (!user?.openid) return { success: false, offline: true }
        return await syncDeleteFromCloud(id, user.openid)
      } catch (e) {
        console.error('Sync delete failed:', e)
        return { success: false, error: e }
      }
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

    // 同步到云端（添加记录后调用）
    async syncToCloudAfterAdd() {
      const lastRecord = this.records[0]
      if (!lastRecord) return { success: false }

      try {
        const { syncRecordToCloud } = await import('@/utils/db')
        const { getStoredUser } = await import('@/utils/auth')
        const user = getStoredUser()
        if (!user?.openid) return { success: false, offline: true }
        return await syncRecordToCloud(lastRecord, user.openid)
      } catch (e) {
        console.error('Sync after add failed:', e)
        return { success: false, error: e }
      }
    },

    // 从云端同步数据
    // syncFromCloud is now handled by sync store
  }
})
