/**
 * 数据库工具函数
 * 使用 SQLite 存储记账数据
 */

// 数据库实例
let db = null

// 获取数据库实例
export function getDb() {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()')
  }
  return db
}

// 初始化数据库
export async function initDatabase() {
  return new Promise((resolve, reject) => {
    try {
      db = uni.cloud.database()
      createTables()
      resolve()
    } catch (error) {
      reject(error)
    }
  })
}

// 创建数据表
function createTables() {
  const tables = ['record', 'category', 'account', 'budget', 'user']
  tables.forEach(table => {
    const key = 'ssj_' + table
    if (!uni.getStorageSync(key)) {
      uni.setStorageSync(key, JSON.stringify([]))
    }
  })
}

// ========== Record 表操作 ==========

export function insertRecord(record) {
  const records = JSON.parse(uni.getStorageSync('ssj_record') || '[]')
  const newRecord = {
    id: generateId(),
    type: record.type,
    amount: record.amount,
    category_code: record.category_code,
    category_name: record.category_name,
    account_code: record.account_code,
    remark: record.remark || '',
    record_date: record.record_date,
    create_time: Date.now(),
    update_time: Date.now(),
    sync_status: 0
  }
  records.push(newRecord)
  uni.setStorageSync('ssj_record', JSON.stringify(records))
  return newRecord
}

export function getRecords() {
  return JSON.parse(uni.getStorageSync('ssj_record') || '[]')
}

export function updateRecord(id, data) {
  const records = JSON.parse(uni.getStorageSync('ssj_record') || '[]')
  const index = records.findIndex(r => r.id === id)
  if (index === -1) return null
  records[index] = {
    ...records[index],
    ...data,
    update_time: Date.now(),
    sync_status: 0
  }
  uni.setStorageSync('ssj_record', JSON.stringify(records))
  return records[index]
}

export function deleteRecord(id) {
  const records = JSON.parse(uni.getStorageSync('ssj_record') || '[]')
  const filtered = records.filter(r => r.id !== id)
  if (filtered.length === records.length) return false
  uni.setStorageSync('ssj_record', JSON.stringify(filtered))
  return true
}

export function getRecordsByMonth(yearMonth) {
  const records = JSON.parse(uni.getStorageSync('ssj_record') || '[]')
  return records.filter(r => r.record_date.startsWith(yearMonth))
}

export function getRecordsByDateRange(startDate, endDate) {
  const records = JSON.parse(uni.getStorageSync('ssj_record') || '[]')
  return records.filter(r => r.record_date >= startDate && r.record_date <= endDate)
}

export function getRecordsByDate(date) {
  const records = JSON.parse(uni.getStorageSync('ssj_record') || '[]')
  return records.filter(r => r.record_date === date)
}

// ========== Category 表操作 ==========

export function insertCategory(category) {
  const categories = JSON.parse(uni.getStorageSync('ssj_category') || '[]')
  const newCategory = {
    id: generateId(),
    code: category.code,
    name: category.name,
    icon: category.icon,
    color: category.color,
    type: category.type,
    sort: category.sort || 0,
    is_default: category.is_default || 0
  }
  categories.push(newCategory)
  uni.setStorageSync('ssj_category', JSON.stringify(categories))
  return newCategory
}

export function getCategories() {
  return JSON.parse(uni.getStorageSync('ssj_category') || '[]')
}

export function insertCategories(categories) {
  categories.forEach(c => insertCategory(c))
}

// ========== Account 表操作 ==========

export function insertAccount(account) {
  const accounts = JSON.parse(uni.getStorageSync('ssj_account') || '[]')
  const newAccount = {
    id: generateId(),
    code: account.code,
    name: account.name,
    type: account.type,
    balance: account.balance || 0,
    sort: account.sort || 0,
    is_default: account.is_default || 0,
    create_time: Date.now(),
    update_time: Date.now()
  }
  accounts.push(newAccount)
  uni.setStorageSync('ssj_account', JSON.stringify(accounts))
  return newAccount
}

export function getAccounts() {
  return JSON.parse(uni.getStorageSync('ssj_account') || '[]')
}

export function insertAccounts(accounts) {
  accounts.forEach(a => insertAccount(a))
}

// ========== Budget 表操作 ==========

export function upsertBudget(budget) {
  const budgets = JSON.parse(uni.getStorageSync('ssj_budget') || '[]')
  const index = budgets.findIndex(b => b.year_month === budget.year_month)
  const now = Date.now()
  if (index !== -1) {
    budgets[index] = { ...budgets[index], ...budget, update_time: now }
  } else {
    budgets.push({
      id: generateId(),
      year_month: budget.year_month,
      total_budget: budget.total_budget,
      create_time: now,
      update_time: now
    })
  }
  uni.setStorageSync('ssj_budget', JSON.stringify(budgets))
  return budgets[index !== -1 ? index : budgets.length - 1]
}

export function getBudgetByMonth(yearMonth) {
  const budgets = JSON.parse(uni.getStorageSync('ssj_budget') || '[]')
  return budgets.find(b => b.year_month === yearMonth) || null
}

export function getBudgets() {
  return JSON.parse(uni.getStorageSync('ssj_budget') || '[]')
}

// ========== User 表操作 ==========

export function getUser() {
  const users = JSON.parse(uni.getStorageSync('ssj_user') || '[]')
  return users[0] || null
}

export function saveUser(user) {
  const users = JSON.parse(uni.getStorageSync('ssj_user') || '[]')
  if (users.length > 0) {
    users[0] = { ...users[0], ...user, update_time: Date.now() }
  } else {
    users.push({
      id: generateId(),
      openid: user.openid || '',
      default_budget: user.default_budget || 3000,
      last_sync_time: user.last_sync_time || null,
      create_time: Date.now()
    })
  }
  uni.setStorageSync('ssj_user', JSON.stringify(users))
  return users[0]
}

// ========== 统计功能 ==========

export function getCategoryStats(yearMonth, type) {
  const records = getRecordsByMonth(yearMonth).filter(r => r.type === type)
  const stats = {}
  records.forEach(r => {
    if (!stats[r.category_code]) {
      stats[r.category_code] = { category_code: r.category_code, category_name: r.category_name, total: 0 }
    }
    stats[r.category_code].total += r.amount
  })
  return Object.values(stats)
}

export function getMonthStats(yearMonth) {
  const records = getRecordsByMonth(yearMonth)
  let income = 0
  let expense = 0
  records.forEach(r => {
    if (r.type === 2) income += r.amount
    else expense += r.amount
  })
  return { income, expense, balance: income - expense }
}

// ========== 工具函数 ==========

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function getCurrentYearMonth() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
}

export function getTodayDate() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
}
