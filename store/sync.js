/**
 * Sync Store - 云端同步管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import {
  getSyncData,
  postRecord,
  putRecord,
  deleteRecord,
  deleteAccount,
  deleteCategory,
  postBudget,
  putBudget
} from '@/utils/api'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAccountStore } from '@/store/account'
import { useBudgetStore } from '@/store/budget'

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
    
    // 初始化网络状态监听
    initNetworkListener() {
      uni.onNetworkStatusChange((res) => {
        this.updateOnlineStatus(res.isConnected)
      })
      // 初始检查
      uni.getNetworkType({
        success: (res) => {
          this.isOnline = res.networkType !== 'none'
        }
      })
    },

    // 设置同步状态
    setSyncStatus(status) {
      this.syncStatus = status
      this.saveSyncStatus()
    },

    // 同步到云端（使用各store的syncToCloud方法）
    async syncToCloud() {
      try {
        this.setSyncStatus(SYNC_STATUS.SYNCING)

        const categoryStore = useCategoryStore()
        const accountStore = useAccountStore()
        const budgetStore = useBudgetStore()

        // 仅同步配置类数据（category/account/budget），记录由 addRecord 单独走 REST
        const [catResult, accResult, budgetResult] = await Promise.all([
          categoryStore.syncToCloud().catch(() => ({ offline: true })),
          accountStore.syncToCloud().catch(() => ({ offline: true })),
          budgetStore.syncToCloud().catch(() => ({ offline: true }))
        ])

        const allOffline = catResult.offline && accResult.offline && budgetResult.offline
        if (allOffline) {
          // 所有云端都不可用，标记待同步
          this.addPendingSync('full_sync', { timestamp: Date.now() })
          this.lastSyncTime = Date.now()  // update timestamp even when offline to avoid stale pull on reconnect
          this.setSyncStatus(SYNC_STATUS.SUCCESS)
          return { success: true, offline: true }
        }

        this.lastSyncTime = Date.now()
        this.setSyncStatus(SYNC_STATUS.SUCCESS)
        return { success: true }
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
          const { getStoredUser } = await import('@/utils/auth')
          const user = getStoredUser()

          if (!user?.openid) { return { success: true, data: null, offline: true } }

          // 调用云函数获取增量数据
          const res = await getSyncData(this.lastSyncTime || 0)

          if (res.success && res.data && res.data.records) {
            const cloudData = res.data
            this.mergeFromCloud(cloudData)
            this.lastSyncTime = cloudData.server_time || Date.now()
            this.setSyncStatus(SYNC_STATUS.SUCCESS)
            return { success: true, data: cloudData }
          } else if (res.offline) {
            return { success: true, offline: true }
          }

          // Server returned success but no records field — treat as legitimate empty sync
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

    // 从云端合并数据（带时间戳冲突解决）
    mergeFromCloud(cloudData) {
      // Helper to merge arrays with timestamp-based conflict resolution
      const mergeWithTimestamp = (localData, cloudData) => {
        const localMap = new Map(localData.map(r => [r.id, r]))
        const cloudMap = new Map(cloudData.map(r => [r.id, r]))
        const merged = [...localData]

        for (const cloudRecord of cloudData) {
          const localRecord = localMap.get(cloudRecord.id)
          if (!localRecord) {
            merged.push(cloudRecord)
          } else if (cloudRecord.update_time > localRecord.update_time) {
            const idx = merged.findIndex(r => r.id === cloudRecord.id)
            if (idx !== -1) merged[idx] = cloudRecord
          }
        }
        return merged
      }

      if (cloudData.records) {
        const localRecords = getStorage('ssj_records') || []
        const merged = mergeWithTimestamp(localRecords, cloudData.records)
        setStorage('ssj_records', merged)
        // Reload store after merge
        useBillStore().loadRecords()
      }
      if (cloudData.categories) {
        const localCats = getStorage('ssj_categories') || []
        const merged = mergeWithTimestamp(localCats, cloudData.categories)
        setStorage('ssj_categories', merged)
        useCategoryStore().loadCategories()
      }
      if (cloudData.accounts) {
        const localAccounts = getStorage('ssj_accounts') || []
        const merged = mergeWithTimestamp(localAccounts, cloudData.accounts)
        setStorage('ssj_accounts', merged)
        useAccountStore().loadAccounts()
      }
      if (cloudData.budgets) {
        const localBudgets = getStorage('ssj_budgets') || []
        const merged = mergeWithTimestamp(localBudgets, cloudData.budgets)
        setStorage('ssj_budgets', merged)
        useBudgetStore().loadBudgets()
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

      const failedItems = []

      try {
        const { getStoredUser } = await import('@/utils/auth')
        const user = getStoredUser()

        if (!user?.openid) {
          return { success: false, error: 'No user openid' }
        }

        for (const item of this.pendingSync) {
          try {
            if (item.type === 'record_add') {
              await postRecord(item.data)
            } else if (item.type === 'record_update') {
              const { id, ...rest } = item.data
              await putRecord(id, rest)
            } else if (item.type === 'record_delete') {
              await deleteRecord(item.data.id)
            } else if (item.type === 'account_delete') {
              await deleteAccount(item.data.id)
            } else if (item.type === 'category_delete') {
              await deleteCategory(item.data.id)
            } else if (item.type === 'budget_upsert') {
              // 用 update_time 判定新建还是更新，避免重复 POST 触发 PK 冲突
              const { id, ...rest } = item.data
              const res = await putBudget(id, rest).catch(err => {
                if (err && (err.statusCode === 404 || err.statusCode === 400)) {
                  return postBudget(item.data)
                }
                throw err
              })
            } else if (item.type === 'full_sync') {
              const r = await this.syncToCloud()
              // 仅在非离线状态下视为成功；离线保留以便重试
              if (r && r.offline) {
                failedItems.push(item)
              }
            } else {
              // 未知类型，保留以便诊断
              failedItems.push(item)
            }
          } catch (itemErr) {
            // api.js 现在 4xx/5xx 抛错，network fail 也抛错，全部进重试
            console.error('Failed to sync item:', item.type, itemErr)
            failedItems.push(item)
          }
        }

        // 保留失败项目用于重试
        this.pendingSync = failedItems
        this.saveSyncStatus()

        if (failedItems.length > 0) {
          return { success: false, error: '部分同步失败', failedCount: failedItems.length, failedItems }
        }

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
        this.syncPendingData().then(result => {
          if (!result.success) {
            console.warn('Partial sync failure on reconnect:', result.failedCount, 'items failed')
          }
        })  // syncPendingData never throws — always returns, so .catch() is unreachable
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

        if (pullResult.offline) {
          // 离线模式，直接成功
          uni.hideLoading()
          uni.showToast({ title: '离线模式', icon: 'none' })
          return { success: true, offline: true }
        }

        if (pullResult.success) {
          if (!pullResult.data) {
            await this.syncToCloud()
          }
          uni.hideLoading()
          uni.showToast({ title: '同步完成', icon: 'success' })
          return { success: true }
        } else {
          // pull失败但不是离线错误
          uni.hideLoading()
          uni.showToast({ title: '同步失败', icon: 'none' })
          return { success: false, error: 'pull failed' }
        }
      } catch (e) {
        uni.hideLoading()
        console.error('First sync failed:', e)
        return { success: false, error: e }
      }
    }
  }
})