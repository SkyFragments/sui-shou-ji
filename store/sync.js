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
const STORAGE_KEY_DEAD_LETTER = 'ssj_sync_dead_letter'

// 单类型最多保留多少待重试项目；超出转 dead-letter 不再静默丢
const MAX_PENDING_PER_TYPE = 50

// dead-letter 本身也限流：防止死信本身撑爆 LocalStorage
const MAX_DEAD_LETTER = 500

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
    pendingSync: [],
    // 死信队列：pendingSync 超限时转存到这里，用户可见、可手动重试或丢弃
    // 数据形状与 pendingSync 一致
    deadLetter: []
  }),

  getters: {
    // 是否正在同步
    isSyncing: (state) => state.syncStatus === SYNC_STATUS.SYNCING,

    // 是否同步成功
    isSynced: (state) => state.syncStatus === SYNC_STATUS.SUCCESS,

    // 是否有待同步数据
    hasPendingSync: (state) => state.pendingSync.length > 0,

    // 是否有死信待处理（给 UI 弹提示用）
    hasDeadLetter: (state) => state.deadLetter.length > 0,

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
      // 死信单独一个 key，独立加载避免污染主状态
      const dead = getStorage(STORAGE_KEY_DEAD_LETTER)
      if (Array.isArray(dead)) {
        this.deadLetter = dead
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
        // 各 store 的 syncToCloud 内部 try/catch 返回 {success:false, error}，不会 throw
        // 这里再加一层 catch 兜底网络异常，标 offline 让上层分支正确走 IDLE 而非 SUCCESS
        const [catResult, accResult, budgetResult] = await Promise.all([
          categoryStore.syncToCloud().catch((e) => ({ success: false, offline: true, error: e })),
          accountStore.syncToCloud().catch((e) => ({ success: false, offline: true, error: e })),
          budgetStore.syncToCloud().catch((e) => ({ success: false, offline: true, error: e }))
        ])

        const allOffline = catResult.offline && accResult.offline && budgetResult.offline
        if (allOffline) {
          // 所有云端都不可用，标记待同步；状态置 IDLE 而非 SUCCESS，避免 UI 绿勾误导
          this.addPendingSync('full_sync', { timestamp: Date.now() })
          this.lastSyncTime = Date.now()  // update timestamp even when offline to avoid stale pull on reconnect
          this.setSyncStatus(SYNC_STATUS.IDLE)
          return { success: true, offline: true }
        }

        const anyFailed = !catResult.success || !accResult.success || !budgetResult.success
        if (anyFailed) {
          // 部分失败：状态置 IDLE 让 UI 不显示成功勾；具体失败项已被各 store 内部抛回或记 pendingSync
          console.warn('[sync] 部分配置同步失败：', { catResult, accResult, budgetResult })
          this.setSyncStatus(SYNC_STATUS.IDLE)
          return { success: false, partial: true }
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
          // 使用服务端返回的 next_cursor（复合游标 update_time + id）以正确处理同毫秒写多条的边界
          const allCloudData = { records: [], categories: [], accounts: [], budgets: [] }
          let cursor = { last_sync_time: this.lastSyncTime || 0, last_id: '' }
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
            // 用服务端 next_cursor 续拉，复合游标能精准定位到同 update_time 内的下一条
            cursor = pageData.next_cursor || { last_sync_time: serverTime, last_id: '' }
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
          // 超出容量：把最旧的转 dead-letter 而不是直接丢
          // dead-letter 在 UI 可见，用户可手动重试或丢弃
          const dropCount = sameType.length - MAX_PENDING_PER_TYPE + 1
          const toDeadLetter = []
          let dropped = 0
          this.pendingSync = this.pendingSync.filter(it => {
            if (it.type === type && dropped < dropCount) {
              dropped++
              toDeadLetter.push(it)
              return false
            }
            return true
          })
          this.appendDeadLetter(toDeadLetter)
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
              // 未知类型：用 retryCount 累计，超过上限入 dead-letter
              const retries = (item.data && item.data.__retries) || 0
              if (retries >= UNKNOWN_TYPE_MAX_RETRIES) {
                console.error('[sync] Unknown type 达到重试上限，入 dead-letter:', item.type)
                this.appendDeadLetter([item])
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
      // 死信有内容时提示用户；UI 层可订阅 hasDeadLetter 显示 banner
      if (isOnline && this.deadLetter.length > 0) {
        console.warn(`[sync] 死信队列有 ${this.deadLetter.length} 条待处理；调 requeueDeadLetter() 重试或 clearDeadLetter() 丢弃`)
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

    // 保存死信队列
    saveDeadLetter() {
      setStorage(STORAGE_KEY_DEAD_LETTER, this.deadLetter)
    },

    // 追加死信；超 MAX_DEAD_LETTER 时丢最早的并 console.error
    appendDeadLetter(items) {
      if (!items || items.length === 0) return
      this.deadLetter.push(...items)
      if (this.deadLetter.length > MAX_DEAD_LETTER) {
        const overflow = this.deadLetter.length - MAX_DEAD_LETTER
        this.deadLetter.splice(0, overflow)
        console.error(`[sync] deadLetter 超出 ${MAX_DEAD_LETTER}，已丢弃最旧 ${overflow} 条`)
      }
      this.saveDeadLetter()
    },

    // 清空死信（用户主动放弃）
    clearDeadLetter() {
      this.deadLetter = []
      this.saveDeadLetter()
    },

    // 把死信全部重新塞回 pendingSync（用户主动重试）
    requeueDeadLetter() {
      if (this.deadLetter.length === 0) return 0
      const count = this.deadLetter.length
      this.pendingSync.push(...this.deadLetter)
      this.deadLetter = []
      this.saveDeadLetter()
      this.saveSyncStatus()
      return count
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