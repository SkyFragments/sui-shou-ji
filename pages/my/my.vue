/**
 * 我的页面
 * 个人中心管理
 */
<template>
	<view class="my-page">
		<!-- 用户信息 -->
		<view class="profile-section animate-slide-up">
			<!-- 已登录状态 -->
			<view v-if="isLoggedIn" class="profile-logged-in">
				<view class="profile-avatar">
					<image src="/static/icon/icon-user.svg" class="avatar-icon-svg" />
				</view>
				<view class="profile-info">
					<text class="profile-name">{{ nickName || '随手记用户' }}</text>
					<text class="profile-id">UID: {{ shortOpenid }}</text>
				</view>
			</view>
			<!-- 未登录状态 -->
			<view v-else class="profile-logged-out" @click="onLogin">
				<view class="profile-avatar not-login">
					<image src="/static/icon/icon-user.svg" class="avatar-icon-svg" />
				</view>
				<view class="profile-info">
					<text class="profile-name login-hint">点击登录</text>
					<text class="profile-id">登录后可同步数据</text>
				</view>
			</view>
		</view>

		<!-- 功能列表 -->
		<view class="menu-section animate-slide-up delay-1">
			<!-- 账户管理 -->
			<view class="menu-item" @click="goToAccountManage">
				<view class="menu-left">
					<image src="/static/icon/icon-card.svg" class="menu-icon-svg" />
					<text class="menu-text">账户管理</text>
				</view>
				<image src="/static/icon/icon-arrow-right.svg" class="menu-arrow-icon" />
			</view>

			<!-- 分类管理 -->
			<view class="menu-item" @click="goToCategoryManage">
				<view class="menu-left">
					<image src="/static/icon/icon-folder.svg" class="menu-icon-svg" />
					<text class="menu-text">分类管理</text>
				</view>
				<image src="/static/icon/icon-arrow-right.svg" class="menu-arrow-icon" />
			</view>

			<!-- 快捷记账设置 -->
			<view class="menu-item" @click="goToTemplateSetting">
				<view class="menu-left">
					<image src="/static/icon/icon-trend.svg" class="menu-icon-svg" />
					<text class="menu-text">快捷记账设置</text>
				</view>
				<image src="/static/icon/icon-arrow-right.svg" class="menu-arrow-icon" />
			</view>

			<!-- 预算设置 -->
			<view class="menu-item" @click="goToBudget">
				<view class="menu-left">
					<image src="/static/icon/icon-wallet.svg" class="menu-icon-svg" />
					<text class="menu-text">预算设置</text>
				</view>
				<image src="/static/icon/icon-arrow-right.svg" class="menu-arrow-icon" />
			</view>

			<!-- 数据导出 -->
			<view class="menu-item" @click="onExport">
				<view class="menu-left">
					<image src="/static/icon/icon-export.svg" class="menu-icon-svg" />
					<text class="menu-text">数据导出</text>
				</view>
				<image src="/static/icon/icon-arrow-right.svg" class="menu-arrow-icon" />
			</view>

			<!-- 同步状态 -->
			<view class="menu-item sync-item" @click="onSync">
				<view class="menu-left">
					<image src="/static/icon/icon-sync.svg" class="menu-icon-svg" />
					<text class="menu-text">同步</text>
				</view>
				<view class="sync-status">
					<text class="sync-text">{{ syncStatusText }}</text>
					<image src="/static/icon/icon-arrow-right.svg" class="menu-arrow-icon" />
				</view>
			</view>
		</view>

		<!-- 关于 -->
		<view class="menu-section animate-slide-up delay-1">
			<view class="menu-item" @click="showAbout = true">
				<view class="menu-left">
					<image src="/static/icon/icon-info.svg" class="menu-icon-svg" />
					<text class="menu-text">关于</text>
				</view>
				<text class="menu-value">v1.0.0</text>
			</view>
		</view>

		<!-- 关于弹窗 -->
		<view class="modal" v-if="showAbout">
			<view class="modal-mask" @click="showAbout = false"></view>
			<view class="modal-content about-modal">
				<view class="about-header">
					<text class="about-title">随手记</text>
					<text class="about-version">v1.0.0</text>
				</view>
				<view class="about-body">
					<view class="about-row">
						<text class="about-label">简介</text>
						<text class="about-text">个人记账小程序，记录每一笔收支</text>
					</view>
					<view class="about-row">
						<text class="about-label">技术栈</text>
						<text class="about-text">UniApp + Vue 3 + Pinia</text>
					</view>
					<view class="about-row">
						<text class="about-label">开发者</text>
						<text class="about-text">231603010217 罗诗伟</text>
					</view>
					<view class="about-row">
						<text class="about-label">学号</text>
						<text class="about-text">231603010217</text>
					</view>
				</view>
				<view class="modal-footer">
					<view class="btn confirm-btn" @click="showAbout = false">
						<text>确定</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部导航 -->
		<view class="tabbar">
			<view class="tab-item" @click="goToIndex">
				<image src="/static/icon/icon-home.svg" class="tab-icon" />
				<text>首页</text>
			</view>
			<view class="tab-item" @click="goToRecords">
				<image src="/static/icon/icon-folder.svg" class="tab-icon" />
				<text>账单</text>
			</view>
			<view class="tab-item add-tab" @click="goToAdd">
				<image src="/static/icon/icon-wallet-white.svg" class="add-tab-icon-svg" />
			</view>
			<view class="tab-item" @click="goToStats">
				<image src="/static/icon/icon-info.svg" class="tab-icon" />
				<text>分析</text>
			</view>
			<view class="tab-item active">
				<image src="/static/icon/icon-user.svg" class="tab-icon" />
				<text>我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useSyncStore } from '@/store/sync'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAccountStore } from '@/store/account'
import { login, getStoredUser, isLoggedIn as checkIsLoggedIn } from '@/utils/auth'
import { exportToCSV, generateExportFileName, exportToExcelWithStyle, generateExcelFileName, downloadCSVFile, downloadExcelFile } from '@/utils/export.js'


export default {
	setup() {
		const syncStore = useSyncStore()
		const billStore = useBillStore()
		const categoryStore = useCategoryStore()
		const accountStore = useAccountStore()

		// 用户状态
		const nickName = ref('')
		const isLoggedIn = ref(false)
		const shortOpenid = ref('')
		const showAbout = ref(false)

		// 初始化用户状态
		const initUserState = () => {
			const user = getStoredUser()
			if (user && user.openid) {
				isLoggedIn.value = true
				nickName.value = user.nickName || ''
				shortOpenid.value = user.openid.substring(0, 8) + '...'
			} else {
				isLoggedIn.value = false
				shortOpenid.value = ''
			}
		}

		onMounted(() => {
			initUserState()
			syncStore.loadSyncStatus()
			billStore.loadRecords()
			categoryStore.loadCategories()
			accountStore.loadAccounts()
		})

		// 登录
		const onLogin = async () => {
			try {
				uni.showLoading({ title: '登录中...' })
				const userInfo = await login()
				isLoggedIn.value = true
				nickName.value = userInfo.nickName || ''
				shortOpenid.value = userInfo.openid.substring(0, 8) + '...'
				uni.hideLoading()
				uni.showToast({ title: '登录成功', icon: 'success' })

				// 登录成功后触发首次同步
				await syncStore.triggerFirstSync()
			} catch (e) {
				uni.hideLoading()
				const msg = (e && e.message) || String(e) || ''
				let hint = '登录失败'
				if (msg.includes('无 code') || msg.includes('uni.login 调用失败')) {
					hint = '请在微信小程序中打开'
				} else if (msg.includes('Network') || msg.includes('timeout') || msg.includes('fail')) {
					hint = '服务器不可达，请稍后重试'
				} else if (msg) {
					hint = `登录失败：${msg.slice(0, 20)}`
				}
				uni.showToast({ title: hint, icon: 'none' })
				console.error('Login error:', e)
			}
		}

		const syncStatusText = computed(() => {
			switch (syncStore.syncStatus) {
				case 'syncing':
					return '同步中...'
				case 'success':
					return '已同步'
				case 'error':
					return '同步失败'
				default:
					return '未同步'
			}
		})

		const goToIndex = () => {
			uni.reLaunch({ url: '/pages/index/index' })
		}

		const goToRecords = () => {
			uni.reLaunch({ url: '/pages/records/records' })
		}

		const goToAdd = () => {
			uni.navigateTo({ url: '/pages/add/add' })
		}

		const goToStats = () => {
			uni.reLaunch({ url: '/pages/stats/stats' })
		}

		const goToAccountManage = () => {
			uni.navigateTo({ url: '/pages/account/account' })
		}

		const goToCategoryManage = () => {
			uni.navigateTo({ url: '/pages/category/category' })
		}

		const goToTemplateSetting = () => {
			uni.navigateTo({ url: '/pages/template-setting/template-setting' })
		}

		const goToBudget = () => {
			uni.navigateTo({ url: '/pages/budget/budget' })
		}

		const onExport = () => {
			const now = new Date()
			const year = now.getFullYear()
			const month = now.getMonth() + 1
			const startMonth = `${year}-${String(month).padStart(2, '0')}-01`
			const endDay = new Date(year, month, 0).getDate()
			const endMonth = `${year}-${String(month).padStart(2, '0')}-${endDay}`

			uni.showModal({
				title: '数据导出',
				content: '确定导出全部账单数据吗？',
				success: async (res) => {
					if (res.confirm) {
						const billStore = useBillStore()
						const records = billStore.records

						if (records.length === 0) {
							uni.showToast({ title: '暂无账单数据', icon: 'none' })
							return
						}

						// 已在 setup 顶部 import，不再 require
						const categoryStore = useCategoryStore()
						const accountStore = useAccountStore()

						const categoryMap = {}
						categoryStore.categories.forEach(c => {
							categoryMap[c.code] = c.name
						})

						const accountMap = {}
						accountStore.accounts.forEach(a => {
							accountMap[a.code] = a.name
						})

						const csvContent = exportToCSV(records, { categoryMap, accountMap })
						const fileName = generateExportFileName(startMonth, endMonth)

						// 实际触发下载/保存
						downloadCSVFile(csvContent, fileName)

						// 按平台给出保存位置说明
						// #ifdef MP-WEIXIN
						const saveTip = '小程序本地目录：\nwxfile://usr/' + fileName + '\n\n点击右上角"…"可转发或保存到手机'
						// #endif
						// #ifdef H5
						const saveTip = '浏览器默认下载目录：\n' + fileName + '\n\n可在浏览器下载列表中查看'
						// #endif
						// #ifdef APP-PLUS
						const saveTip = '应用沙盒目录：\n' + fileName + '\n\n可通过文件管理 App 在应用目录下找到'
						// #endif
						// #ifndef MP-WEIXIN
						// #ifndef H5
						// #ifndef APP-PLUS
						const saveTip = '已生成文件：' + fileName
						// #endif
						// #endif
						// #endif

						// 导出结果预览
						const totalExpense = records.filter(r => r.type === 1).reduce((sum, r) => sum + r.amount, 0)
						const totalIncome = records.filter(r => r.type === 2).reduce((sum, r) => sum + r.amount, 0)

						uni.showModal({
							title: '导出成功 - ' + fileName,
							content: '数据统计\n• 支出记录：' + records.filter(r => r.type === 1).length + ' 条\n• 收入记录：' + records.filter(r => r.type === 2).length + ' 条\n• 支出总额：¥' + totalExpense.toFixed(2) + '\n• 收入总额：¥' + totalIncome.toFixed(2) + '\n\n保存位置\n' + saveTip + '\n\nCSV 预览（前 500 字符）：\n' + csvContent.substring(0, 500) + (csvContent.length > 500 ? '\n...' : ''),
							showCancel: false,
							confirmText: '确定'
						})
					}
				}
			})
		}

		const onSync = async () => {
			// 走真实 REST 同步：pull + push + flush pending
			// store/sync.js 的 triggerFirstSync 已处理 loading / 登录守卫 / 离线分支 / truncated
			const result = await syncStore.triggerFirstSync()
			if (result.needLogin) {
				uni.showToast({ title: '请先登录', icon: 'none' })
				return
			}
			if (result.offline) {
				uni.showToast({ title: '离线模式', icon: 'none' })
				return
			}
			if (result.truncated) {
				uni.showToast({ title: '已拉取部分数据，请稍后再同步', icon: 'none' })
				return
			}
			// 拉取并合并完成后显示真实统计
			const records = billStore.records
			const categories = categoryStore.categories
			const accounts = accountStore.accounts
			const pending = syncStore.pendingSync.length
			uni.showModal({
				title: '同步完成',
				content: `数据同步完成\n\n设备信息\n• 记录数量：${records.length} 条\n• 分类数量：${categories.length} 条\n• 账户数量：${accounts.length} 条\n\n同步时间：${new Date(syncStore.lastSyncTime || Date.now()).toLocaleString('zh-CN')}${pending ? `\n\n${pending} 项待重试` : ''}`,
				showCancel: false,
				confirmText: '确定'
			})
		}

		return {
			isLoggedIn,
			nickName,
			shortOpenid,
			showAbout,
			syncStatusText,
			goToIndex,
			goToRecords,
			goToAdd,
			goToStats,
			goToAccountManage,
			goToCategoryManage,
			goToTemplateSetting,
			goToBudget,
			onExport,
			onSync,
			onLogin
		}
	}
}
</script>

<style scoped>
.my-page {
	min-height: 100vh;
	background: transparent;
	padding-bottom: 120rpx;
}

.profile-section {
	display: flex;
	align-items: center;
	background-color: #07c160;
	padding: 40rpx 30rpx;
	padding-top: calc(40rpx + env(safe-area-inset-top));
}

.profile-logged-in,
.profile-logged-out {
	display: flex;
	align-items: center;
	width: 100%;
}

.profile-avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	background-color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
}

.profile-avatar.not-login {
	background-color: rgba(255, 255, 255, 0.5);
}

.avatar-icon-svg {
	width: 80rpx;
	 height: 80rpx;
	 border-radius: 50%;
}

.profile-info {
	flex: 1;
}

.profile-name {
	font-size: 44rpx;
	font-weight: bold;
	color: #ffffff;
	display: block;
}

.profile-name.login-hint {
	opacity: 0.8;
}

.profile-id {
	font-size: 28rpx;
	color: rgba(255, 255, 255, 0.8);
	margin-top: 8rpx;
	display: block;
}

.menu-section {
	background-color: #ffffff;
	margin: 20rpx;
	border-radius: 12rpx;
	overflow: hidden;
}

.menu-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 24rpx;
	border-bottom: 1rpx solid #f0f0f0;
	transition: background-color 0.15s ease-out;
}

.menu-item:active {
	background-color: #FDF4E9;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-left {
	display: flex;
	align-items: center;
}

.menu-icon {
	font-size: 44rpx;
	margin-right: 16rpx;
}

.menu-icon-svg {
	width: 48rpx;
	height: 48rpx;
	margin-right: 16rpx;
}

.menu-text {
	font-size: 34rpx;
	color: #333333;
}

.menu-arrow-icon {
	width: 32rpx;
	height: 32rpx;
	color: #666666;
}

.menu-value {
	font-size: 32rpx;
	color: #666666;
}

.sync-item {
	background-color: #ffffff;
}

.sync-status {
	display: flex;
	align-items: center;
}

/* About Modal */
.modal {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	z-index: 999;
}
.modal-mask {
	position: absolute;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
}
.modal-content {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 600rpx;
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
}
.modal-footer {
	border-top: 1rpx solid #f0f0f0;
}
.btn {
	text-align: center;
	padding: 28rpx;
	font-size: 32rpx;
}
.confirm-btn {
	color: #07c160;
}

.about-modal {
	padding: 0;
}
.about-header {
	padding: 40rpx 30rpx 24rpx;
	text-align: center;
	border-bottom: 1rpx solid #f0f0f0;
}
.about-title {
	display: block;
	font-size: 44rpx;
	font-weight: bold;
	color: #333333;
}
.about-version {
	display: block;
	font-size: 24rpx;
	color: #999999;
	margin-top: 8rpx;
}
.about-body {
	padding: 20rpx 30rpx;
}
.about-row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 18rpx 0;
	border-bottom: 1rpx solid #f5f5f5;
}
.about-row:last-child {
	border-bottom: none;
}
.about-label {
	font-size: 28rpx;
	color: #999999;
}
.about-text {
	font-size: 28rpx;
	color: #333333;
	font-weight: 500;
}

.sync-text {
	font-size: 28rpx;
	color: #666666;
	margin-right: 12rpx;
}

.tabbar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 100rpx;
	background-color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: space-around;
	border-top: 1rpx solid #f0f0f0;
	padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
	flex: 1;
	text-align: center;
	font-size: 26rpx;
	color: #666666;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.tab-item.active {
	color: #07c160;
}

.add-tab {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 96rpx;
	height: 96rpx;
	margin: 0 auto;
	margin-top: -18rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #07c160 0%, #06ae56 100%);
	box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.35);
	transition: transform 0.2s ease, box-shadow 0.2s ease;
	position: relative;
}

.add-tab:active {
	transform: scale(0.94);
	box-shadow: 0 3rpx 10rpx rgba(7, 193, 96, 0.25);
}

.add-tab-icon-svg {
	width: 52rpx;
	height: 52rpx;
}

.add-tab-icon {
	font-size: 48rpx;
	color: #ffffff;
	font-weight: 300;
	line-height: 1;
}

.tab-icon {
	width: 56rpx;
	height: 56rpx;
	margin-bottom: 4rpx;
}


.tab-item .tab-icon {
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab-item.active .tab-icon {
	transform: scale(1.2);
}

</style>

		const onExportExcel = () => {
			const now = new Date()
			const year = now.getFullYear()
			const month = now.getMonth() + 1
			const startMonth = `${year}-${String(month).padStart(2, '0')}-01`
			const endDay = new Date(year, month, 0).getDate()
			const endMonth = `${year}-${String(month).padStart(2, '0')}-${endDay}`

			uni.showModal({
				title: '数据导出',
				content: `确定导出 ${startMonth} 至 ${endMonth} 的账单数据到 Excel 吗？`,
				success: async (res) => {
					if (res.confirm) {
						const billStore = useBillStore()
						const records = billStore.getRecordsByDateRange(startMonth, endMonth)

						if (records.length === 0) {
							uni.showToast({ title: '该月无账单数据', icon: 'none' })
							return
						}

						const categoryStore = useCategoryStore()
						const accountStore = useAccountStore()

						const categoryMap = {}
						categoryStore.categories.forEach(c => {
							categoryMap[c.code] = c.name
						})

						const accountMap = {}
						accountStore.accounts.forEach(a => {
							accountMap[a.code] = a.name
						})

						// 已在 setup 顶部 import

						try {
							const excelData = exportToExcelWithStyle(records, { categoryMap, accountMap })
							const fileName = generateExcelFileName(startMonth, endMonth)
							downloadExcelFile(excelData, fileName)
							uni.showToast({ title: '导出成功', icon: 'success' })
						} catch (e) {
							console.error('Export Excel failed:', e)
							uni.showToast({ title: '导出失败', icon: 'none' })
						}
					}
				}
			})
		}
