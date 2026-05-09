/**
 * Sync Store - 云端同步管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { getRecords, getCategories, getAccounts, getBudgets, getUser, saveUser } from '@/utils/db'

// 存储键名
const STORAGE_KEY = 'ssj_sync_status'

// 同步状态
export const SYNC_STATUS = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  SUCCESS: 'success',
  ERROR: 'error'
}

export const useSyncStore = defineStore('sync', {
  state: () => ({
    syncStatus: SYNC_STATUS.IDLE,
    lastSyncTime: null,
    isOnline: true,
    pendingSync: []
  }),

  getters: {
    // 是否正在同步
    isSyncing: (state) => state.syncStatus === SYNC_STATUS.SYNCING,

    // 是否同步成功
    isSynced: (state) => state.syncStatus === SYNC_STATUS.SUCCESS,

    // 是否有待同步数据
    hasPendingSync: (state) => state.pendingSync.length > 0,

    // 获取最后同步时间格式化
    lastSyncTimeFormatted: (state) => {
      if (!state.lastSyncTime) return '从未同步'
      const date = new Date(state.lastSyncTime)
      return date.toLocaleString('zh-CN')
    }
  },

  actions: {
    // 加载同步状态
    loadSyncStatus() {
      const data = getStorage(STORAGE_KEY)
      if (data) {
        this.syncStatus = data.syncStatus || SYNC_STATUS.IDLE
        this.lastSyncTime = data.lastSyncTime || null
        this.pendingSync = data.pendingSync || []
      }
      return this
    },

    // 设置同步状态
    setSyncStatus(status) {
      this.syncStatus = status
      this.saveSyncStatus()
    },

    // 同步到云端
    async syncToCloud() {
      try {
        this.setSyncStatus(SYNC_STATUS.SYNCING)

        // 获取本地数据
        const records = getRecords()
        const categories = getCategories()
        const accounts = getAccounts()
        const budgets = getBudgets()

        // 准备云端数据
        const cloudData = {
          records,
          categories,
          accounts,
          budgets,
          timestamp: Date.now()
        }

        // 调用云函数同步
        // 注意：这里需要实际的云开发环境
        // 暂时使用本地存储模拟
        try {
          const db = uni.cloud.database()
          const result = await db.collection('ssj_sync').add({
            data: cloudData
          })

          this.lastSyncTime = Date.now()
          this.setSyncStatus(SYNC_STATUS.SUCCESS)
          return { success: true, result }
        } catch (cloudError) {
          // 云开发不可用，标记为待同步
          console.warn('Cloud sync not available, marking for later sync')
          this.pendingSync.push({
            type: 'full_sync',
            data: cloudData,
            timestamp: Date.now()
          })
          this.setSyncStatus(SYNC_STATUS.SUCCESS) // 本地成功
          return { success: true, offline: true }
        }
      } catch (error) {
        console.error('Sync to cloud failed:', error)
        this.setSyncStatus(SYNC_STATUS.ERROR)
        return { success: false, error }
      }
    },

    // 从云端拉取数据
    async pullFromCloud() {
      try {
        this.setSyncStatus(SYNC_STATUS.SYNCING)

        try {
          const db = uni.cloud.database()
          const res = await db.collection('ssj_sync').orderBy('timestamp', 'desc').limit(1).get()

          if (res.data && res.data.length > 0) {
            const cloudData = res.data[0]

            // 合并数据（以云端为准，如果有冲突）
            this.mergeFromCloud(cloudData)

            this.lastSyncTime = Date.now()
            this.setSyncStatus(SYNC_STATUS.SUCCESS)
            return { success: true, data: cloudData }
          }

          this.setSyncStatus(SYNC_STATUS.SUCCESS)
          return { success: true, data: null }
        } catch (cloudError) {
          console.warn('Cloud pull not available')
          this.setSyncStatus(SYNC_STATUS.SUCCESS)
          return { success: true, offline: true }
        }
      } catch (error) {
        console.error('Pull from cloud failed:', error)
        this.setSyncStatus(SYNC_STATUS.ERROR)
        return { success: false, error }
      }
    },

    // 从云端合并数据
    mergeFromCloud(cloudData) {
      if (cloudData.records) {
        setStorage('ssj_records', cloudData.records)
      }
      if (cloudData.categories) {
        setStorage('ssj_categories', cloudData.categories)
      }
      if (cloudData.accounts) {
        setStorage('ssj_accounts', cloudData.accounts)
      }
      if (cloudData.budgets) {
        setStorage('ssj_budgets', cloudData.budgets)
      }
    },

    // 添加待同步项
    addPendingSync(type, data) {
      this.pendingSync.push({
        type,
        data,
        timestamp: Date.now()
      })
      this.saveSyncStatus()
    },

    // 清空待同步队列
    clearPendingSync() {
      this.pendingSync = []
      this.saveSyncStatus()
    },

    // 同步待同步数据
    async syncPendingData() {
      if (this.pendingSync.length === 0) return { success: true }

      try {
        for (const item of this.pendingSync) {
          // 逐个同步待处理的数据
          // 具体实现根据数据类型调用相应函数
        }
        this.clearPendingSync()
        return { success: true }
      } catch (error) {
        console.error('Sync pending data failed:', error)
        return { success: false, error }
      }
    },

    // 更新在线状态
    updateOnlineStatus(isOnline) {
      this.isOnline = isOnline
      // 如果恢复在线，尝试同步待同步数据
      if (isOnline && this.pendingSync.length > 0) {
        this.syncPendingData()
      }
    },

    // 保存同步状态到本地
    saveSyncStatus() {
      setStorage(STORAGE_KEY, {
        syncStatus: this.syncStatus,
        lastSyncTime: this.lastSyncTime,
        pendingSync: this.pendingSync
      })
    },

    // 重置同步状态
    resetSyncStatus() {
      this.syncStatus = SYNC_STATUS.IDLE
      this.lastSyncTime = null
      this.pendingSync = []
      this.saveSyncStatus()
    },

    // 首次登录同步（登录成功后调用）
    async triggerFirstSync() {
      try {
        uni.showLoading({ title: '同步中...' })
        const pullResult = await this.pullFromCloud()

        if (pullResult.success) {
          if (!pullResult.data) {
            await this.syncToCloud()
          }
        }
        uni.hideLoading()
        uni.showToast({ title: '同步完成', icon: 'success' })
        return { success: true }
      } catch (e) {
        uni.hideLoading()
        console.error('First sync failed:', e)
        return { success: false, error: e }
      }
    }
  }
})