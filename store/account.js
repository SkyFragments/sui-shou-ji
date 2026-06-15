/**
 * Account Store - 账户管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { ACCOUNT_CODES } from '@/utils/schema'
import { postAccount, putAccount, deleteAccount, upsertByPutPost } from '@/utils/api'
import { useSyncStore } from '@/store/sync'
import { generateId } from '@/utils/db'

// 存储键名
const STORAGE_KEY = 'ssj_accounts'

// 默认账户
const DEFAULT_ACCOUNTS = [
  { code: ACCOUNT_CODES.CASH, name: '现金', type: 'cash', balance: 0, sort: 1, is_default: 1 },
  { code: ACCOUNT_CODES.ALIPAY, name: '支付宝', type: 'alipay', balance: 0, sort: 2, is_default: 0 },
  { code: ACCOUNT_CODES.WECHAT, name: '微信', type: 'wechat', balance: 0, sort: 3, is_default: 0 },
  { code: ACCOUNT_CODES.BANKCARD, name: '银行卡', type: 'bankcard', balance: 0, sort: 4, is_default: 0 }
]

// 初始化账户数据
function initAccounts() {
  return DEFAULT_ACCOUNTS.map((account, index) => ({
    ...account,
    id: (Date.now() + index).toString(),
    create_time: Date.now(),
    update_time: Date.now()
  }))
}

// 账户字段校验
function validateAccountFields(account) {
  const requiredFields = ['id', 'code', 'name', 'type', 'balance', 'sort', 'is_default', 'create_time', 'update_time']
  const missingFields = []
  
  for (const field of requiredFields) {
    if (account[field] === undefined || account[field] === null) {
      missingFields.push(field)
    }
  }
  
  if (missingFields.length > 0) {
    console.warn(`[sync] 账户字段缺失: id=${account.id || 'unknown'}, 缺失字段: ${missingFields.join(', ')}`)
  }
  
  return missingFields.length === 0
}

export const useAccountStore = defineStore('account', {
  state: () => ({
    accounts: []
  }),

  getters: {
    // 获取所有账户（不可变排序：Array.sort 会原地变更 state.accounts 并绕过 Vue 响应式）
    allAccounts: (state) => [...state.accounts].sort((a, b) => a.sort - b.sort),

    // 获取默认账户
    defaultAccount(state) {
      return state.accounts.find(a => a.is_default === 1) || state.accounts[0] || null
    },

    // 按编码获取账户
    getAccountByCode: (state) => (code) => {
      return state.accounts.find(a => a.code === code)
    }
  },

  actions: {
    // 加载账户
    loadAccounts() {
      const data = getStorage(STORAGE_KEY)
      if (!data || data.length === 0) {
        // 初始化默认账户
        this.accounts = initAccounts()
        this.saveAccounts()
      } else {
        this.accounts = data
      }
      return this.accounts
    },

    // 添加账户
    addAccount(account) {
      const now = Date.now()
      const newAccount = {
        id: generateId(),
        code: account.code || '',
        name: account.name || '',
        type: account.type || 'cash',
        balance: account.balance || 0,
        sort: account.sort || 0,
        is_default: 0,
        create_time: now,
        update_time: now
      }
      this.accounts.push(newAccount)
      this.saveAccounts()

      // Sync to cloud; failure queues for retry
      this.syncAccount(newAccount).catch((err) => {
        // 401：api.js 已清队列 + token + user；不再入队
        if (err && err.statusCode === 401) return
        useSyncStore().addPendingSync('account_upsert', newAccount)
      })

      return newAccount
    },

    // 更新账户
    updateAccount(code, updates) {
      const index = this.accounts.findIndex(a => a.code === code)
      if (index !== -1) {
        this.accounts[index] = {
          ...this.accounts[index],
          ...updates,
          update_time: Date.now()
        }
        this.saveAccounts()

        // Sync to cloud; failure queues for retry
        this.syncAccount(this.accounts[index]).catch((err) => {
          // 401：api.js 已清队列 + token + user；不再入队
          if (err && err.statusCode === 401) return
          useSyncStore().addPendingSync('account_upsert', this.accounts[index])
        })

        return this.accounts[index]
      }
      return null
    },

    // 删除账户
    deleteAccount(code) {
      const index = this.accounts.findIndex(a => a.code === code)
      if (index !== -1) {
        // 检查是否为默认账户
        if (this.accounts[index].is_default === 1) {
          console.warn('Cannot delete default account')
          return false
        }
        const deletedAccount = this.accounts[index]
        this.accounts.splice(index, 1)
        this.saveAccounts()

        // Sync delete to cloud (queue on failure for retry)
        this.syncDeleteFromCloud(deletedAccount.id).catch((err) => {
          // 401：api.js 已清队列 + token + user；不再入队
          if (err && err.statusCode === 401) return
          useSyncStore().addPendingSync('account_delete', { id: deletedAccount.id, ...deletedAccount })
        })

        return true
      }
      return false
    },

    // 从云端删除账户
    async syncDeleteFromCloud(id) {
      try {
        await deleteAccount(id)
        return { success: true }
      } catch (e) {
        console.error('Sync delete account failed:', e)
        return { success: false, error: e }
      }
    },

    // 设置默认账户
    setDefaultAccount(code) {
      // 记录旧默认（如果有）以便把它 is_default=0 的变化也同步到云端
      // 否则旧默认在云端仍 is_default=1，下次 pull 会覆盖本地的切换
      const previous = this.accounts.find(a => a.is_default === 1 && a.code !== code)
      this.accounts.forEach(a => {
        a.is_default = a.code === code ? 1 : 0
      })
      this.saveAccounts()

      // 默认账户切换必须上行：is_default 改了但云端没改的话，下次 pullFromCloud 会被云端旧值覆盖
      const updated = this.accounts.find(a => a.code === code)
      if (updated) {
        this.syncAccount(updated).catch((err) => {
          // 401：api.js 已清队列 + token + user；不再入队
          if (err && err.statusCode === 401) return
          useSyncStore().addPendingSync('account_upsert', updated)
        })
      }
      // 旧默认的 is_default 现在是 0，必须同步清掉
      if (previous) {
        const previousNow = this.accounts.find(a => a.code === previous.code)
        if (previousNow) {
          this.syncAccount(previousNow).catch((err) => {
            // 401：api.js 已清队列 + token + user；不再入队
            if (err && err.statusCode === 401) return
            useSyncStore().addPendingSync('account_upsert', previousNow)
          })
        }
      }
    },

    // 更新账户余额
    updateBalance(code, amount, isIncome) {
      const index = this.accounts.findIndex(a => a.code === code)
      if (index !== -1) {
        if (isIncome) {
          this.accounts[index].balance += amount
        } else {
          this.accounts[index].balance -= amount
        }
        this.accounts[index].update_time = Date.now()
        this.saveAccounts()
        return this.accounts[index]
      }
      return null
    },

    // 保存到本地存储
    saveAccounts() {
      setStorage(STORAGE_KEY, this.accounts)
    },

    // 重置账户为默认
    resetAccounts() {
      this.accounts = initAccounts()
      this.saveAccounts()
    },

    // 同步单个账户到云端
    async syncAccount(account) {
      // 字段校验
      validateAccountFields(account)
      
      try {
        await upsertByPutPost(putAccount, postAccount, account)
        return { success: true }
      } catch (e) {
        console.error(`[sync] 同步账户失败: id=${account.id}, name=${account.name}, error=${e.message}`)
        throw e  // 抛出异常让调用方处理
      }
    },

    // 同步所有账户到云端
    async syncToCloud() {
      let allOk = true
      const sync = useSyncStore()
      
      console.log(`[sync] 开始同步账户，共 ${this.accounts.length} 条`)
      
      for (const acc of this.accounts) {
        try {
          // 字段校验
          if (!validateAccountFields(acc)) {
            console.warn(`[sync] 跳过字段不完整的账户: id=${acc.id}`)
            allOk = false
            continue
          }
          
          await this.syncAccount(acc)
          console.debug(`[sync] 账户同步成功: id=${acc.id}, name=${acc.name}`)
        } catch (e) {
          // 401：api.js 已清队列 + token + user；不再入队
          if (e && e.statusCode === 401) continue
          allOk = false
          console.error(`[sync] 账户同步失败入队: id=${acc.id}, name=${acc.name}`)
          sync.addPendingSync('account_upsert', acc)
        }
      }
      
      console.log(`[sync] 账户同步完成，成功 ${allOk ? '全部' : '部分'}`)
      return { success: allOk }
    }
  }
})