/**
 * Storage 工具函数
 * 随手记 - 个人记账小程序
 */

/**
 * 获取本地存储数据
 * @param {string} key - 存储键名
 * @returns {any} 存储的数据
 */
export function getStorage(key) {
  try {
    const data = uni.getStorageSync(key)
    return data ? JSON.parse(data) : null
  } catch (e) {
    console.error('getStorage error:', e)
    return null
  }
}

/**
 * 设置本地存储数据
 * @param {string} key - 存储键名
 * @param {any} value - 要存储的数据
 */
export function setStorage(key, value) {
  try {
    uni.setStorageSync(key, JSON.stringify(value))
  } catch (e) {
    console.error('setStorage error:', e)
  }
}

/**
 * 移除本地存储数据
 * @param {string} key - 存储键名
 */
export function removeStorage(key) {
  try {
    uni.removeStorageSync(key)
  } catch (e) {
    console.error('removeStorage error:', e)
  }
}

/**
 * 清除所有本地存储数据
 */
export function clearStorage() {
  try {
    uni.clearStorageSync()
  } catch (e) {
    console.error('clearStorage error:', e)
  }
}