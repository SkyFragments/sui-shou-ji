/**
 * 初始化默认数据
 * 随手记 - 个人记账小程序
 */

import { EXPENSE_CATEGORY_CODES, INCOME_CATEGORY_CODES, ACCOUNT_CODES } from './schema'
import { getStorage, setStorage } from './storage'

/**
 * 初始化默认支出分类
 */
export function initExpenseCategories() {
  const expenseCategories = [
    { code: EXPENSE_CATEGORY_CODES.FOOD, name: '餐饮', icon: '🍜', color: '#FF6B6B', type: 1, sort: 1, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.TRANSPORT, name: '交通', icon: '🚗', color: '#4ECDC4', type: 1, sort: 2, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.SHOPPING, name: '购物', icon: '🛒', color: '#45B7D1', type: 1, sort: 3, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.ENTERTAINMENT, name: '娱乐', icon: '🎮', color: '#96CEB4', type: 1, sort: 4, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.LIVING, name: '居住', icon: '🏠', color: '#DDA0DD', type: 1, sort: 5, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.MEDICAL, name: '医疗', icon: '💊', color: '#98D8C8', type: 1, sort: 6, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.EDUCATION, name: '教育', icon: '📚', color: '#F7DC6F', type: 1, sort: 7, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.COMMUNICATION, name: '通讯', icon: '📱', color: '#85C1E9', type: 1, sort: 8, is_default: 1 },
    { code: EXPENSE_CATEGORY_CODES.OTHER, name: '其他', icon: '📦', color: '#BB8FCE', type: 1, sort: 9, is_default: 1 }
  ]
  return expenseCategories.map((cat, index) => ({
    ...cat,
    id: 'expense_' + index
  }))
}

/**
 * 初始化默认收入分类
 */
export function initIncomeCategories() {
  const incomeCategories = [
    { code: INCOME_CATEGORY_CODES.SALARY, name: '工资', icon: '💰', color: '#27AE60', type: 2, sort: 1, is_default: 1 },
    { code: INCOME_CATEGORY_CODES.SIDE_JOB, name: '副业', icon: '💼', color: '#3498DB', type: 2, sort: 2, is_default: 1 },
    { code: INCOME_CATEGORY_CODES.INVESTMENT, name: '投资', icon: '📈', color: '#E74C3C', type: 2, sort: 3, is_default: 1 },
    { code: INCOME_CATEGORY_CODES.OTHER_INCOME, name: '其他', icon: '💵', color: '#95A5A6', type: 2, sort: 4, is_default: 1 }
  ]
  return incomeCategories.map((cat, index) => ({
    ...cat,
    id: 'income_' + index
  }))
}

/**
 * 初始化默认账户
 */
export function initAccounts() {
  const accounts = [
    { code: ACCOUNT_CODES.CASH, name: '现金', type: 'cash', balance: 0, sort: 1, is_default: 1 },
    { code: ACCOUNT_CODES.ALIPAY, name: '支付宝', type: 'alipay', balance: 0, sort: 2, is_default: 0 },
    { code: ACCOUNT_CODES.WECHAT, name: '微信', type: 'wechat', balance: 0, sort: 3, is_default: 0 },
    { code: ACCOUNT_CODES.BANKCARD, name: '银行卡', type: 'bankcard', balance: 0, sort: 4, is_default: 0 }
  ]
  return accounts.map((acc, index) => ({
    ...acc,
    id: 'account_' + index,
    create_time: Date.now(),
    update_time: Date.now()
  }))
}

/**
 * 初始化所有默认数据
 */
export function initAllData() {
  const existingCategories = getStorage('ssj_category')
  if (!existingCategories || existingCategories.length === 0) {
    const allCategories = [...initExpenseCategories(), ...initIncomeCategories()]
    setStorage('ssj_category', allCategories)
  }

  const existingAccounts = getStorage('ssj_account')
  if (!existingAccounts || existingAccounts.length === 0) {
    setStorage('ssj_account', initAccounts())
  }
}

export default {
  initExpenseCategories,
  initIncomeCategories,
  initAccounts,
  initAllData
}