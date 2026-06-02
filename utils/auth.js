/**
 * 鉴权工具
 * 随手记 - 微信小程序登录认证
 */

const STORAGE_KEY_USER = 'ssj_users'
const STORAGE_KEY_TOKEN = 'ssj_auth_token'

import { login as apiLogin } from './api'

/**
 * 微信一键登录（兼容小程序和 H5，用 uni 跨端 API）
 * @returns {Promise<{openid, session_key, unionid}>}
 */
export async function login() {
	return new Promise((resolve, reject) => {
		uni.login({
			success: async (res) => {
				if (!res.code) {
					reject(new Error('uni.login 失败，无 code'))
					return
				}

				// 直传错误，不静默回退到 mock — 静默回退会让真用户数据被孤立在另一个 mock openid 下
				try {
					const result = await cloudLogin(res.code)
					resolve(result)
				} catch (cloudError) {
					reject(cloudError)
				}
			},
			fail: (err) => {
				reject(new Error('uni.login 调用失败: ' + (err && (err.errMsg || err.message))))
			}
		})
	})
}

/**
 * 模拟登录（本地演示用）
 * 注：已禁用。直接调会污染真实用户数据 — 仅供开发态手动测试。
 * 生产代码不应触发此函数。
 */
async function mockLogin(code) {
	console.warn('[auth] mockLogin called — this should not happen in production')
	return new Promise((resolve) => {
		setTimeout(() => {
			const openid = 'mock_openid_' + code.substring(0, 16)
			const userData = {
				openid,
				session_key: 'mock_session_key_' + Date.now(),
				unionid: null,
				create_time: Date.now()
			}

			uni.setStorageSync(STORAGE_KEY_USER, userData)
			resolve(userData)
		}, 500)
	})
}

/**
 * 云函数登录（自建服务器版本）
 */
export async function cloudLogin(code) {
	try {
		const res = await apiLogin(code)

		if (res.openid) {
			if (res.token) {
				uni.setStorageSync(STORAGE_KEY_TOKEN, res.token)
			}
			const userData = {
				openid: res.openid,
				session_key: res.session_key || null,
				unionid: res.unionid || null,
				create_time: Date.now()
			}
			uni.setStorageSync(STORAGE_KEY_USER, userData)
			return userData
		} else {
			throw new Error('服务器返回无 openid')
		}
	} catch (e) {
		console.error('cloudLogin failed:', e)
		throw e
	}
}

/**
 * 检查登录态（仅小程序有效，H5 直接返回本地是否有 user）
 */
export function checkSession() {
	return new Promise((resolve) => {
		// #ifdef MP-WEIXIN
		wx.checkSession({
			success: () => {
				const user = getStoredUser()
				resolve(!!user && !!user.openid)
			},
			fail: () => {
				resolve(false)
			}
		})
		// #endif
		// #ifndef MP-WEIXIN
		const user = getStoredUser()
		resolve(!!user && !!user.openid)
		// #endif
	})
}

/**
 * 获取存储的用户信息
 */
export function getStoredUser() {
	try {
		const userStr = uni.getStorageSync(STORAGE_KEY_USER)
		return userStr ? JSON.parse(userStr) : null
	} catch (e) {
		return null
	}
}

/**
 * 获取用户信息（需授权，仅小程序）
 */
export function getUserInfo() {
	return new Promise((resolve, reject) => {
		// #ifdef MP-WEIXIN
		wx.getUserProfile({
			desc: '用于展示用户信息',
			success: (res) => {
				resolve({
					nickName: res.userInfo.nickName,
					avatarUrl: res.userInfo.avatarUrl
				})
			},
			fail: (err) => {
				reject(new Error('用户拒绝授权: ' + err.errMsg))
			}
		})
		// #endif
		// #ifndef MP-WEIXIN
		reject(new Error('getUserInfo 仅支持微信小程序'))
		// #endif
	})
}

/**
 * 检查是否已登录
 */
export function isLoggedIn() {
	const user = getStoredUser()
	return !!(user && user.openid)
}

/**
 * 退出登录
 * 清 token + user + 同步队列，避免旧账号的脏数据在重新登录后推到新账号云端
 */
export function logout() {
	uni.removeStorageSync(STORAGE_KEY_USER)
	uni.removeStorageSync(STORAGE_KEY_TOKEN)
	// 清同步状态：pending / dead-letter / lastSyncTime
	// 直接清 storage key，不走 Pinia store（utils 文件可能从非组件上下文调）
	uni.removeStorageSync('ssj_sync_status')
	uni.removeStorageSync('ssj_sync_dead_letter')
}