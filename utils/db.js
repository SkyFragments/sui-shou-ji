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
      db = uniCloud.database()
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
  const records = JSON.parse(uni.getStorageSync('ssj_records') || '[]')
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
  uni.setStorageSync('ssj_records', JSON.stringify(records))
  return newRecord
}

export function getRecords() {
  return JSON.parse(uni.getStorageSync('ssj_records') || '[]')
}

export function updateRecord(id, data) {
  const records = JSON.parse(uni.getStorageSync('ssj_records') || '[]')
  const index = records.findIndex(r => r.id === id)
  if (index === -1) return null
  records[index] = {
    ...records[index],
    ...data,
    update_time: Date.now(),
    sync_status: 0
  }
  uni.setStorageSync('ssj_records', JSON.stringify(records))
  return records[index]
}

export function deleteRecord(id) {
  const records = JSON.parse(uni.getStorageSync('ssj_records') || '[]')
  const filtered = records.filter(r => r.id !== id)
  if (filtered.length === records.length) return false
  uni.setStorageSync('ssj_records', JSON.stringify(filtered))
  return true
}

export function getRecordsByMonth(yearMonth) {
  const records = JSON.parse(uni.getStorageSync('ssj_records') || '[]')
  return records.filter(r => r.record_date.startsWith(yearMonth))
}

export function getRecordsByDateRange(startDate, endDate) {
  const records = JSON.parse(uni.getStorageSync('ssj_records') || '[]')
  return records.filter(r => r.record_date >= startDate && r.record_date <= endDate)
}

export function getRecordsByDate(date) {
  const records = JSON.parse(uni.getStorageSync('ssj_records') || '[]')
  return records.filter(r => r.record_date === date)
}

// ========== Category 表操作 ==========

export function insertCategory(category) {
  const categories = JSON.parse(uni.getStorageSync('ssj_categories') || '[]')
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
  uni.setStorageSync('ssj_categories', JSON.stringify(categories))
  return newCategory
}

export function getCategories() {
  return JSON.parse(uni.getStorageSync('ssj_categories') || '[]')
}

export function insertCategories(categories) {
  categories.forEach(c => insertCategory(c))
}

// ========== Account 表操作 ==========

export function insertAccount(account) {
  const accounts = JSON.parse(uni.getStorageSync('ssj_accounts') || '[]')
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
  uni.setStorageSync('ssj_accounts', JSON.stringify(accounts))
  return newAccount
}

export function getAccounts() {
  return JSON.parse(uni.getStorageSync('ssj_accounts') || '[]')
}

export function insertAccounts(accounts) {
  accounts.forEach(a => insertAccount(a))
}

// ========== Budget 表操作 ==========

export function upsertBudget(budget) {
  const budgets = JSON.parse(uni.getStorageSync('ssj_budgets') || '[]')
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
  uni.setStorageSync('ssj_budgets', JSON.stringify(budgets))
  return budgets[index !== -1 ? index : budgets.length - 1]
}

export function getBudgetByMonth(yearMonth) {
  const budgets = JSON.parse(uni.getStorageSync('ssj_budgets') || '[]')
  return budgets.find(b => b.year_month === yearMonth) || null
}

export function getBudgets() {
  return JSON.parse(uni.getStorageSync('ssj_budgets') || '[]')
}

// ========== User 表操作 ==========

export function getUser() {
  const users = JSON.parse(uni.getStorageSync('ssj_users') || '[]')
  return users[0] || null
}

export function saveUser(user) {
  const users = JSON.parse(uni.getStorageSync('ssj_users') || '[]')
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
  uni.setStorageSync('ssj_users', JSON.stringify(users))
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

export function generateId() {
  // Use full random string (not substr which truncates on short base-36 values)
  return Date.now().toString(36) + '_' + Math.random().toString(36).replace('0.', '')
}

export function getCurrentYearMonth() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0')
}

export function getTodayDate() {
  const now = new Date()
  return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0')
}

// ========== 云端同步支持 ==========

/**
 * 云端数据库引用
 */
let cloudDb = null

/**
 * 获取云端数据库实例
 */
export function getCloudDb() {
  if (!cloudDb) {
    try {
      cloudDb = uniCloud.database()
    } catch (e) {
      console.warn('Cloud database not available:', e)
      return null
    }
  }
  return cloudDb
}

/**
 * 同步记录到云端
 * @param {Object} record 记录
 * @param {string} openid 用户openid
 */
export async function syncRecordToCloud(record, openid) {
  const db = getCloudDb()
  if (!db) return { offline: true }

  try {
    const res = await db.collection('ssj_records').add({
      data: {
        ...record,
        openid,
        sync_status: 1
      }
    })
    return { success: true, id: res.id }
  } catch (e) {
    console.error('Sync record failed:', e)
    return { success: false, error: e }
  }
}

/**
 * 更新云端记录
 * @param {Object} record 记录
 * @param {string} openid 用户openid
 */
export async function syncUpdateToCloud(record, openid) {
  const db = getCloudDb()
  if (!db) return { offline: true }

  try {
    const res = await db.collection('ssj_records')
      .where({ openid, id: record.id })
      .update({
        data: {
          ...record,
          sync_status: 1
        }
      })
    return { success: true }
  } catch (e) {
    console.error('Update cloud record failed:', e)
    return { success: false, error: e }
  }
}

/**
 * 从云端删除记录
 * @param {string} recordId 记录ID
 * @param {string} openid 用户openid
 */
export async function syncDeleteFromCloud(recordId, openid) {
  const db = getCloudDb()
  if (!db) return { offline: true }

  try {
    await db.collection('ssj_records')
      .where({ openid, id: recordId })
      .remove()
    return { success: true }
  } catch (e) {
    console.error('Delete cloud record failed:', e)
    return { success: false, error: e }
  }
}

/**
 * 从云端拉取用户数据
 * @param {string} openid 用户openid
 * @param {number} lastSyncTime 上次同步时间
 */
export async function pullFromCloud(openid, lastSyncTime = 0) {
  const db = getCloudDb()
  if (!db) return { offline: true }

  try {
    const res = await db.collection('ssj_records')
      .where({
        openid,
        update_time: db.command.gt(lastSyncTime)
      })
      .orderBy('update_time', 'desc')
      .get()

    return { success: true, data: res.data || [] }
  } catch (e) {
    console.error('Pull from cloud failed:', e)
    return { success: false, error: e }
  }
}

/**
 * 云端同步状态检查
 */
export function isCloudAvailable() {
  try {
    const db = getCloudDb()
    return !!db
  } catch (e) {
    return false
  }
}
