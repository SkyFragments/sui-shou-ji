/**
 * 我的页面
 * 个人中心管理
 */
<template>
	<view class="my-page">
		<!-- 用户信息 -->
		<view class="profile-section">
			<view class="profile-avatar">
				<text class="avatar-icon">👤</text>
			</view>
			<view class="profile-info">
				<text class="profile-name">随手记用户</text>
				<text class="profile-id">UID: {{ userId }}</text>
			</view>
		</view>

		<!-- 功能列表 -->
		<view class="menu-section">
			<!-- 账户管理 -->
			<view class="menu-item" @click="goToAccountManage">
				<view class="menu-left">
					<text class="menu-icon">💳</text>
					<text class="menu-text">账户管理</text>
				</view>
				<text class="menu-arrow">▶</text>
			</view>

			<!-- 分类管理 -->
			<view class="menu-item" @click="goToCategoryManage">
				<view class="menu-left">
					<text class="menu-icon">📂</text>
					<text class="menu-text">分类管理</text>
				</view>
				<text class="menu-arrow">▶</text>
			</view>

			<!-- 预算设置 -->
			<view class="menu-item" @click="goToBudget">
				<view class="menu-left">
					<text class="menu-icon">💰</text>
					<text class="menu-text">预算设置</text>
				</view>
				<text class="menu-arrow">▶</text>
			</view>

			<!-- 数据导出 -->
			<view class="menu-item" @click="onExport">
				<view class="menu-left">
					<text class="menu-icon">📤</text>
					<text class="menu-text">数据导出</text>
				</view>
				<text class="menu-arrow">▶</text>
			</view>

			<!-- 同步状态 -->
			<view class="menu-item sync-item" @click="onSync">
				<view class="menu-left">
					<text class="menu-icon">🔄</text>
					<text class="menu-text">同步</text>
				</view>
				<view class="sync-status">
					<text class="sync-text">{{ syncStatusText }}</text>
					<text class="menu-arrow">▶</text>
				</view>
			</view>
		</view>

		<!-- 关于 -->
		<view class="menu-section">
			<view class="menu-item">
				<view class="menu-left">
					<text class="menu-icon">ℹ️</text>
					<text class="menu-text">关于</text>
				</view>
				<text class="menu-value">v1.0.0</text>
			</view>
		</view>

		<!-- 底部导航 -->
		<view class="tabbar">
			<view class="tab-item" @click="goToIndex">
				<text>首页</text>
			</view>
			<view class="tab-item" @click="goToRecords">
				<text>账单</text>
			</view>
			<view class="tab-item add-tab" @click="goToAdd">
				<text class="add-tab-icon">+</text>
			</view>
			<view class="tab-item" @click="goToStats">
				<text>分析</text>
			</view>
			<view class="tab-item active">
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

export default {
	setup() {
		const syncStore = useSyncStore()
		const billStore = useBillStore()
		const categoryStore = useCategoryStore()
		const accountStore = useAccountStore()
		const userId = ref('******')

		onMounted(() => {
			syncStore.loadSyncStatus()
			billStore.loadRecords()
			categoryStore.loadCategories()
			accountStore.loadAccounts()
		})

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
				content: `确定导出 ${startMonth} 至 ${endMonth} 的账单数据吗？`,
				success: async (res) => {
					if (res.confirm) {
						const billStore = useBillStore()
						const records = billStore.getRecordsByDateRange(startMonth, endMonth)

						if (records.length === 0) {
							uni.showToast({ title: '该月无账单数据', icon: 'none' })
							return
						}

						const { exportToCSV, generateExportFileName } = require('@/utils/export.js')
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

						// 导出结果预览（演示模式）
						const totalExpense = records.filter(r => r.type === 1).reduce((sum, r) => sum + r.amount, 0)
						const totalIncome = records.filter(r => r.type === 2).reduce((sum, r) => sum + r.amount, 0)

						uni.showModal({
							title: `导出成功 - ${fileName}`,
							content: `📊 数据统计\n• 支出记录：${records.filter(r => r.type === 1).length} 条\n• 收入记录：${records.filter(r => r.type === 2).length} 条\n• 支出总额：¥${totalExpense.toFixed(2)}\n• 收入总额：¥${totalIncome.toFixed(2)}\n\n📄 CSV 预览（前 500 字符）：\n${csvContent.substring(0, 500)}${csvContent.length > 500 ? '\n...' : ''}`,
							showCancel: false,
							confirmText: '确定'
						})
					}
				}
			})
		}

		const onSync = async () => {
			uni.showToast({ title: '同步中...', icon: 'loading' })
			try {
				// 获取当前数据状态（演示用）
				const records = billStore.records
				const categories = categoryStore.categories
				const accounts = accountStore.accounts

				// 模拟同步过程
				await new Promise(resolve => setTimeout(resolve, 1500))

				// 演示模式：显示同步结果摘要
				const syncSummary = {
					records: records.length,
					categories: categories.length,
					accounts: accounts.length,
					timestamp: new Date().toLocaleString('zh-CN')
				}

				uni.showModal({
					title: '同步成功',
					content: `✅ 数据同步完成\n\n📱 设备信息\n• 记录数量：${syncSummary.records} 条\n• 分类数量：${syncSummary.categories} 条\n• 账户数量：${syncSummary.accounts} 条\n\n🕐 同步时间：${syncSummary.timestamp}\n\n💡 提示：当前为演示模式，实际云同步需接入微信云开发环境`,
					showCancel: false,
					confirmText: '确定'
				})
			} catch (e) {
				uni.showToast({ title: '同步失败', icon: 'none' })
			}
		}

		return {
			userId,
			syncStatusText,
			goToIndex,
			goToRecords,
			goToAdd,
			goToStats,
			goToAccountManage,
			goToCategoryManage,
			goToBudget,
			onExport,
			onSync
		}
	}
}
</script>

<style scoped>
.my-page {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding-bottom: 120rpx;
}

.profile-section {
	display: flex;
	align-items: center;
	background-color: #07c160;
	padding: 40rpx 30rpx;
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

.avatar-icon {
	font-size: 60rpx;
}

.profile-info {
	flex: 1;
}

.profile-name {
	font-size: 36rpx;
	font-weight: bold;
	color: #ffffff;
	display: block;
}

.profile-id {
	font-size: 24rpx;
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
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-left {
	display: flex;
	align-items: center;
}

.menu-icon {
	font-size: 36rpx;
	margin-right: 16rpx;
}

.menu-text {
	font-size: 28rpx;
	color: #333;
}

.menu-arrow {
	font-size: 24rpx;
	color: #999;
}

.menu-value {
	font-size: 26rpx;
	color: #999;
}

.sync-item {
	background-color: #fff;
}

.sync-status {
	display: flex;
	align-items: center;
}

.sync-text {
	font-size: 24rpx;
	color: #999;
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
	font-size: 22rpx;
	color: #999;
}

.tab-item.active {
	color: #07c160;
}

.add-tab {
	display: flex;
	align-items: center;
	justify-content: center;
}

.add-tab-icon {
	font-size: 56rpx;
	color: #07c160;
}
</style>
