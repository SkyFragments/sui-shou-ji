/**
 * 鉴权工具
 * 随手记 - 微信小程序登录认证
 */

const STORAGE_KEY_USER = 'ssj_users'
const STORAGE_KEY_TOKEN = 'ssj_auth_token'

/**
 * 微信一键登录
 * @returns {Promise<{openid, session_key, unionid}>}
 */
export function login() {
	return new Promise((resolve, reject) => {
		wx.login({
			success: async (res) => {
				if (!res.code) {
					reject(new Error('wx.login 失败，无 code'))
					return
				}

				// 后端 API 不可用，直接使用模拟登录
				console.warn('Using mock login (API not available)')
				const mockInfo = await mockLogin(res.code)
				resolve(mockInfo)
			},
			fail: (err) => {
				reject(new Error('wx.login 调用失败: ' + err.errMsg))
			}
		})
	})
}

/**
 * 模拟登录（本地演示用）
 * 实际项目中应替换为云函数调用
 */
async function mockLogin(code) {
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
		const { login } = require('./api')
		const res = await login(code)

		if (res.openid) {
			if (res.token) {
				uni.setStorageSync(STORAGE_KEY_TOKEN, res.token)
			}
			const userData = {
				openid: res.openid,
				create_time: Date.now()
			}
			uni.setStorageSync(STORAGE_KEY_USER, userData)
			return { openid: res.openid }
		} else {
			throw new Error('服务器返回无 openid')
		}
	} catch (e) {
		console.error('cloudLogin failed:', e)
		throw e
	}
}

/**
 * 检查登录态
 */
export function checkSession() {
	return new Promise((resolve) => {
		wx.checkSession({
			success: () => {
				const user = getStoredUser()
				resolve(!!user && !!user.openid)
			},
			fail: () => {
				resolve(false)
			}
		})
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
 * 获取用户信息（需授权）
 */
export function getUserInfo() {
	return new Promise((resolve, reject) => {
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
 */
export function logout() {
	uni.removeStorageSync(STORAGE_KEY_USER)
	uni.removeStorageSync(STORAGE_KEY_TOKEN)
}