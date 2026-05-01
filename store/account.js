/**
 * Account Store - 账户管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { ACCOUNT_CODES } from '@/utils/schema'

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

export const useAccountStore = defineStore('account', {
  state: () => ({
    accounts: []
  }),

  getters: {
    // 获取所有账户
    allAccounts: (state) => state.accounts.sort((a, b) => a.sort - b.sort),

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
        id: now.toString(),
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
        this.accounts.splice(index, 1)
        this.saveAccounts()
        return true
      }
      return false
    },

    // 设置默认账户
    setDefaultAccount(code) {
      this.accounts.forEach(a => {
        a.is_default = a.code === code ? 1 : 0
      })
      this.saveAccounts()
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
    }
  }
})