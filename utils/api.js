/**
 * API 请求工具
 * 替换 uniCloud 调用
 */

const API_BASE = 'https://txwh.online/api'

const STORAGE_KEY_TOKEN = 'ssj_auth_token'

/**
 * 获取存储的 token
 */
function getToken() {
  return uni.getStorageSync(STORAGE_KEY_TOKEN)
}

/**
 * 请求封装
 */
async function request(url, method = 'GET', data = null) {
  const token = getToken()
  const header = {
    'Content-Type': 'application/json'
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: API_BASE + url,
        method,
        data,
        header,
        success: (res) => {
          if (res.statusCode === 401) {
            uni.removeStorageSync(STORAGE_KEY_TOKEN)
            reject(new Error('Unauthorized'))
          } else {
            resolve(res.data)
          }
        },
        fail: (err) => reject(err)
      })
    })
    return res
  } catch (err) {
    console.error('API request failed:', err)
    throw err
  }
}

// Auth
export async function login(code) {
  return request('/auth/login', 'POST', { code })
}

// Sync
export async function getSyncData(lastSyncTime = 0) {
  return request(`/sync?last_sync_time=${lastSyncTime}`)
}

export async function postSyncData(data) {
  return request('/sync', 'POST', data)
}

// Records
export async function getRecords(startDate, endDate) {
  let url = '/records'
  const params = []
  if (startDate) params.push(`start_date=${startDate}`)
  if (endDate) params.push(`end_date=${endDate}`)
  if (params.length) url += '?' + params.join('&')
  return request(url)
}

export async function postRecord(record) {
  return request('/records', 'POST', record)
}

export async function putRecord(id, data) {
  return request(`/records/${id}`, 'PUT', data)
}

export async function deleteRecord(id) {
  return request(`/records/${id}`, 'DELETE')
}

// Categories
export async function getCategories() {
  return request('/categories')
}

export async function postCategory(category) {
  return request('/categories', 'POST', category)
}

export async function putCategory(id, data) {
  return request(`/categories/${id}`, 'PUT', data)
}

export async function deleteCategory(id) {
  return request(`/categories/${id}`, 'DELETE')
}

// Accounts
export async function getAccounts() {
  return request('/accounts')
}

export async function postAccount(account) {
  return request('/accounts', 'POST', account)
}

export async function putAccount(id, data) {
  return request(`/accounts/${id}`, 'PUT', data)
}

export async function deleteAccount(id) {
  return request(`/accounts/${id}`, 'DELETE')
}

// Budgets
export async function getBudgets() {
  return request('/budgets')
}

export async function postBudget(budget) {
  return request('/budgets', 'POST', budget)
}

export async function putBudget(id, data) {
  return request(`/budgets/${id}`, 'PUT', data)
}

export async function deleteBudget(id) {
  return request(`/budgets/${id}`, 'DELETE')
}