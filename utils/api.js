/**
 * API 请求工具
 * 替换 uniCloud 调用
 */

// API 基础地址优先级（懒求值：避免模块加载时 uni/process 未就绪导致 ReferenceError）：
//  1) import.meta.env.VITE_API_BASE  (H5 Vite 构建注入，Vite 标准)
//  2) process.env.VUE_APP_API_BASE  (老 Vue CLI / Webpack 兼容)
//  3) uni.getStorageSync('ssj_api_base')  (运行时手动覆盖，便于小程序多环境)
//  4) __DEV__ ? HTTP 测试地址 : HTTPS 线上地址
//
// 安全策略：
// - 生产态（__DEV__ 为 false）默认走 HTTPS，避免 JWT 在公网明文传输
// - 开发态（__DEV__ 为 true，默认在 uni-app 编译时确定）允许 HTTP 走测试服务器
// - 用户通过 ssj_api_base storage 手动指定 http:// 时，console.error 告警一次防漏到生产
// - 生产环境若真要走 http://，必须显式通过 build-time env 注入（VITE_API_BASE=...），
//   而非依赖 fallback；这样 release 构建审计 build artifact 即可拦截
const DEFAULT_API_BASE_DEV = 'http://1.12.234.7/api'
const DEFAULT_API_BASE_PROD = 'https://1.12.234.7/api'
function getApiBase() {
  try {
    // Vite 在 ESM 下注入 import.meta.env；process.env 在 Vite 客户端构建中是空的
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE) {
      return import.meta.env.VITE_API_BASE
    }
  } catch (e) { /* ignore */ }
  if (typeof process !== 'undefined' && process.env && process.env.VUE_APP_API_BASE) {
    return process.env.VUE_APP_API_BASE
  }
  if (typeof uni !== 'undefined' && uni.getStorageSync) {
    try {
      const stored = uni.getStorageSync('ssj_api_base')
      if (stored) {
        // 显式覆盖时若仍是 http://，高优告警一次（防止 prod 漏审）
        if (typeof stored === 'string' && stored.startsWith('http://')) {
          console.error('[api] ssj_api_base 走明文 HTTP，JWT 等鉴权信息将被截获；' +
            '生产前请改用 https:// 或经 TLS 终结的反代')
        }
        return stored
      }
    } catch (e) { /* 忽略 */ }
  }
  // __DEV__ 是 uni-app 提供的全局变量，编译期确定 dev/prod
  const fallback = typeof __DEV__ !== 'undefined' && __DEV__ ? DEFAULT_API_BASE_DEV : DEFAULT_API_BASE_PROD
  if (fallback.startsWith('http://')) {
    // prod fallback 不应走 http；若走到了说明配置错误，强告警
    console.error('[api] 生产态默认 base 走明文 HTTP，请检查构建配置')
  }
  return fallback
}

// 请求超时（毫秒）；H5 路径无内置超时，必须显式传 timeout 才生效
const REQUEST_TIMEOUT_MS = 15000

const STORAGE_KEY_TOKEN = 'ssj_auth_token'

/**
 * 获取存储的 token
 */
function getToken() {
  return uni.getStorageSync(STORAGE_KEY_TOKEN)
}

/**
 * 请求封装：4xx/5xx 统一 reject，避免 200 之外的错误被当作成功
 */
async function request(url, method = 'GET', data = null) {
  const token = getToken()
  const header = {
    'Content-Type': 'application/json'
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  // 自己写一层超时 race：uni.request 的 timeout 在某些平台不触发 fail
  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(Object.assign(new Error('Request timeout'), { timeout: true }))
    }, REQUEST_TIMEOUT_MS)
  })

  try {
    const res = await Promise.race([
      new Promise((resolve, reject) => {
        uni.request({
          url: getApiBase() + url,
          method,
          data,
          header,
          timeout: REQUEST_TIMEOUT_MS,
          success: (res) => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve(res.data)
            } else if (res.statusCode === 401) {
              // 401 不光清 token，也要清 user 对象，否则 sync 仍会用 user?.openid 判定为已登录
              // 形成「无 token → 401 → 清 token → 仍认为已登录」的死循环
              uni.removeStorageSync(STORAGE_KEY_TOKEN)
              try { uni.removeStorageSync('ssj_users') } catch (e) { /* ignore */ }
              // 同时清同步队列：旧 token 期间累积的 pending/dead-letter 是用旧身份
              // 排队的，重登后 push 会污染新账号
              try {
                uni.removeStorageSync('ssj_sync_status')
                uni.removeStorageSync('ssj_sync_dead_letter')
              } catch (e) { /* ignore */ }
              reject(Object.assign(new Error('Unauthorized'), { statusCode: 401 }))
            } else {
              const msg = (res.data && (res.data.error || res.data.message)) || `HTTP ${res.statusCode}`
              reject(Object.assign(new Error(msg), { statusCode: res.statusCode, data: res.data }))
            }
          },
          fail: (err) => reject(Object.assign(new Error(err.errMsg || 'Network error'), { networkError: true }))
        })
      }),
      timeoutPromise
    ])
    return res
  } finally {
    clearTimeout(timeoutId)
  }
}

// Auth
export async function login(code) {
  return request('/auth/login', 'POST', { code })
}

// Sync — 接受 number（旧版兼容）或 {last_sync_time, last_id}（新版复合游标）
export async function getSyncData(cursor = 0) {
  if (typeof cursor === 'object' && cursor !== null) {
    const params = `last_sync_time=${encodeURIComponent(cursor.last_sync_time || 0)}&last_id=${encodeURIComponent(cursor.last_id || '')}`
    return request(`/sync?${params}`)
  }
  return request(`/sync?last_sync_time=${cursor}`)
}

/**
 * 通用 PUT→POST 兜底 upsert
 * 先尝试 PUT(id, rest)，404/400 时回退 POST(data)
 * 服务端 r5/r6 起：PUT 在 0 affected rows 时返回 404（既含「不存在」也含「无变化」）
 * 任何非 404/400 错误透传
 */
export async function upsertByPutPost(putFn, postFn, data) {
  const { id, ...rest } = data
  try {
    return await putFn(id, rest)
  } catch (e) {
    if (e && (e.statusCode === 404 || e.statusCode === 400)) {
      return await postFn(data)
    }
    throw e
  }
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

// Templates — 首页快捷记账模板
export async function getTemplates() {
  return request('/templates')
}

export async function postTemplate(template) {
  return request('/templates', 'POST', template)
}

export async function putTemplate(id, data) {
  return request(`/templates/${id}`, 'PUT', data)
}

export async function deleteTemplate(id) {
  return request(`/templates/${id}`, 'DELETE')
}
