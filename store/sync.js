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
  putBudget,
  putAccount,
  postAccount,
  putCategory,
  postCategory
} from '@/utils/api'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAccountStore } from '@/store/account'
import { useBudgetStore } from '@/store/budget'

// 存储键名
const STORAGE_KEY = 'ssj_sync_status'

// 单类型最多保留多少待重试项目；超出视为死信丢弃，避免存储无限增长
const MAX_PENDING_PER_TYPE = 50

// 未知类型重试次数上限：超过后 dead-letter 丢弃并 console.error 提示
const UNKNOWN_TYPE_MAX_RETRIES = 5

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
          // 所有云端都不可用，标记待同步；状态置 IDLE 而非 SUCCESS，避免 UI 绿勾误导
          this.addPendingSync('full_sync', { timestamp: Date.now() })
          this.lastSyncTime = Date.now()  // update timestamp even when offline to avoid stale pull on reconnect
          this.setSyncStatus(SYNC_STATUS.IDLE)
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

          if (!user?.openid) {
            // 没登录就是 IDLE，不是 SUCCESS，避免 UI 误导
            this.setSyncStatus(SYNC_STATUS.IDLE)
            return { success: true, data: null, offline: true }
          }

          // 调用云函数获取增量数据
          // 服务端可能分页（has_more），循环拉直到 has_more=false，避免大账号漏数据
          const allCloudData = { records: [], categories: [], accounts: [], budgets: [] }
          let cursor = this.lastSyncTime || 0
          let serverTime = Date.now()
          // 防呆：单次 pull 最多 100 页 = 10 万条，防止服务端死循环/客户端卡死
          const MAX_PAGES = 100
          for (let page = 0; page < MAX_PAGES; page++) {
            const res = await getSyncData(cursor)
            if (!res || !res.success || !res.data) break
            const pageData = res.data
            allCloudData.records.push(...(pageData.records || []))
            if (pageData.categories) allCloudData.categories = pageData.categories
            if (pageData.accounts) allCloudData.accounts = pageData.accounts
            if (pageData.budgets) allCloudData.budgets = pageData.budgets
            if (pageData.server_time) serverTime = pageData.server_time
            if (!pageData.has_more) break
            // 下一轮用本批最后一条记录的 update_time 作 cursor
            const last = allCloudData.records[allCloudData.records.length - 1]
            cursor = last?.update_time || serverTime
          }
          // 全部分页拉完后再合并，确保原子
          this.mergeFromCloud(allCloudData)
          this.lastSyncTime = serverTime
          this.setSyncStatus(SYNC_STATUS.SUCCESS)
          return { success: true, data: allCloudData }
        } catch (cloudError) {
          console.warn('Cloud pull not available:', cloudError.message)
          // 拉数据失败：保持 SYNCING 容易误导，改成 IDLE 等待下次触发
          this.setSyncStatus(SYNC_STATUS.IDLE)
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
      // 清洗：服务端记录带 openid 字段，本地无，混入会污染本地数据形状
      const stripOpenid = (records) => {
        if (!Array.isArray(records)) return records
        return records.map(r => {
          if (!('openid' in r)) return r
          const { openid, ...rest } = r
          return rest
        })
      }
      const cleanCloudData = {
        records: stripOpenid(cloudData.records),
        categories: stripOpenid(cloudData.categories),
        accounts: stripOpenid(cloudData.accounts),
        budgets: stripOpenid(cloudData.budgets)
      }

      // Helper to merge arrays with timestamp-based conflict resolution
      const mergeWithTimestamp = (localData, cloudData) => {
        const localMap = new Map(localData.map(r => [r.id, r]))
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

      if (cleanCloudData.records) {
        const localRecords = getStorage('ssj_records') || []
        const merged = mergeWithTimestamp(localRecords, cleanCloudData.records)
        setStorage('ssj_records', merged)
        // Reload store after merge
        useBillStore().loadRecords()
      }
      if (cleanCloudData.categories) {
        const localCats = getStorage('ssj_categories') || []
        const merged = mergeWithTimestamp(localCats, cleanCloudData.categories)
        setStorage('ssj_categories', merged)
        useCategoryStore().loadCategories()
      }
      if (cleanCloudData.accounts) {
        const localAccounts = getStorage('ssj_accounts') || []
        const merged = mergeWithTimestamp(localAccounts, cleanCloudData.accounts)
        setStorage('ssj_accounts', merged)
        useAccountStore().loadAccounts()
      }
      if (cleanCloudData.budgets) {
        const localBudgets = getStorage('ssj_budgets') || []
        const merged = mergeWithTimestamp(localBudgets, cleanCloudData.budgets)
        setStorage('ssj_budgets', merged)
        useBudgetStore().loadBudgets()
      }
    },

    // 添加待同步项
    addPendingSync(type, data) {
      // 同一 type 只保留最新一条（full_sync 之类幂等性高的去重）
      // 其它类型仍按事件顺序排队，但同 type 累积到 MAX_PENDING_PER_TYPE 上限后丢最早的
      if (type === 'full_sync') {
        this.pendingSync = this.pendingSync.filter(it => it.type !== 'full_sync')
      } else {
        const sameType = this.pendingSync.filter(it => it.type === type)
        if (sameType.length >= MAX_PENDING_PER_TYPE) {
          // 丢最早的，避免队列爆炸
          const dropCount = sameType.length - MAX_PENDING_PER_TYPE + 1
          let dropped = 0
          this.pendingSync = this.pendingSync.filter(it => {
            if (it.type === type && dropped < dropCount) {
              dropped++
              return false
            }
            return true
          })
        }
      }
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
            } else if (item.type === 'category_upsert') {
              const { id, ...rest } = item.data
              try {
                await putCategory(id, rest)
              } catch (e) {
                if (e && (e.statusCode === 404 || e.statusCode === 400)) {
                  await postCategory(item.data)
                } else {
                  throw e
                }
              }
            } else if (item.type === 'account_upsert') {
              const { id, ...rest } = item.data
              try {
                await putAccount(id, rest)
              } catch (e) {
                if (e && (e.statusCode === 404 || e.statusCode === 400)) {
                  await postAccount(item.data)
                } else {
                  throw e
                }
              }
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
              // 未知类型：用 retryCount 累计，超过上限 dead-letter 丢弃并打 error
              const retries = (item.data && item.data.__retries) || 0
              if (retries >= UNKNOWN_TYPE_MAX_RETRIES) {
                console.error('[sync] Dead-letter unknown type, dropping:', item.type)
                // 不 push 进 failedItems → 写回时该 item 消失
              } else {
                failedItems.push({ ...item, data: { ...(item.data || {}), __retries: retries + 1 } })
              }
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
          uni.hideLoading()
          uni.showToast({ title: '离线模式', icon: 'none' })
          return { success: true, offline: true }
        }

        if (pullResult.success) {
          if (!pullResult.data) {
            await this.syncToCloud()
          }
          // 手动同步入口也要 flush pending 队列（不依赖网络变化事件）
          const pendingResult = await this.syncPendingData()
          uni.hideLoading()
          if (pendingResult.failedCount) {
            uni.showToast({ title: `已同步，${pendingResult.failedCount} 项待重试`, icon: 'none' })
          } else {
            uni.showToast({ title: '同步完成', icon: 'success' })
          }
          return { success: true, pending: pendingResult }
        } else {
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