/**
 * 初始化默认数据
 * 随手记 - 个人记账小程序
 */

import { EXPENSE_CATEGORY_CODES, INCOME_CATEGORY_CODES, ACCOUNT_CODES, TABLE_NAMES } from './schema'
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
 * 初始化默认快捷记账模板（首页快捷记账区域）
 * 全为支出（type=1）；用户可在「快捷记账设置」页增加收入模板
 *
 * 关键：create_time/update_time = 0
 *   - 让 mergeWithTimestamp(cloud, local) 在云端版本存在时永远胜出
 *   - 避免「缓存清空 → 重新初始化默认 → Date.now() > 云端 update_time → 默认覆盖云端修改」的丢失
 */
export function initTemplates() {
  const templates = [
    { name: '早餐', amount: 10, type: 1, category_code: EXPENSE_CATEGORY_CODES.FOOD, icon: 'meal', color: '#FF6B6B', sort: 1 },
    { name: '午餐', amount: 30, type: 1, category_code: EXPENSE_CATEGORY_CODES.FOOD, icon: 'food', color: '#FF6B6B', sort: 2 },
    { name: '晚餐', amount: 40, type: 1, category_code: EXPENSE_CATEGORY_CODES.FOOD, icon: 'food', color: '#FF6B6B', sort: 3 },
    { name: '咖啡', amount: 20, type: 1, category_code: EXPENSE_CATEGORY_CODES.FOOD, icon: 'drink', color: '#FF6B6B', sort: 4 },
    { name: '打车', amount: 25, type: 1, category_code: EXPENSE_CATEGORY_CODES.TRANSPORT, icon: 'car', color: '#4ECDC4', sort: 5 },
    { name: '地铁', amount: 5, type: 1, category_code: EXPENSE_CATEGORY_CODES.TRANSPORT, icon: 'bus', color: '#4ECDC4', sort: 6 },
    { name: '电影', amount: 50, type: 1, category_code: EXPENSE_CATEGORY_CODES.ENTERTAINMENT, icon: 'movie', color: '#96CEB4', sort: 7 },
    { name: '超市', amount: 80, type: 1, category_code: EXPENSE_CATEGORY_CODES.SHOPPING, icon: 'shopping', color: '#45B7D1', sort: 8 }
  ]
  return templates.map((tpl, index) => ({
    ...tpl,
    id: 'template_' + index,
    is_default: 1,
    create_time: 0,
    update_time: 0
  }))
}

/**
 * 初始化所有默认数据
 */
export function initAllData() {
  const existingCategories = getStorage('ssj_categories')
  if (!existingCategories || existingCategories.length === 0) {
    const allCategories = [...initExpenseCategories(), ...initIncomeCategories()]
    setStorage('ssj_categories', allCategories)
  }

  const existingAccounts = getStorage('ssj_accounts')
  if (!existingAccounts || existingAccounts.length === 0) {
    setStorage('ssj_accounts', initAccounts())
  }

  const existingTemplates = getStorage(TABLE_NAMES.TEMPLATE)
  if (!existingTemplates || existingTemplates.length === 0) {
    setStorage(TABLE_NAMES.TEMPLATE, initTemplates())
  }
}

export default {
  initExpenseCategories,
  initIncomeCategories,
  initAccounts,
  initTemplates,
  initAllData
}