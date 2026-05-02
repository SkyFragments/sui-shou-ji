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

export default {
	setup() {
		const syncStore = useSyncStore()
		const userId = ref('******')

		onMounted(() => {
			syncStore.loadSyncStatus()
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
			uni.switchTab({ url: '/pages/index/index' })
		}

		const goToRecords = () => {
			uni.switchTab({ url: '/pages/records/records' })
		}

		const goToAdd = () => {
			uni.navigateTo({ url: '/pages/add/add' })
		}

		const goToStats = () => {
			uni.switchTab({ url: '/pages/stats/stats' })
		}

		const goToAccountManage = () => {
			// TODO: Navigate to account management page
			uni.showToast({ title: '功能开发中', icon: 'none' })
		}

		const goToBudget = () => {
			uni.navigateTo({ url: '/pages/budget/budget' })
		}

		const onExport = () => {
			uni.showModal({
				title: '数据导出',
				content: '选择导出月份范围',
				success: () => {
					uni.showToast({ title: '功能开发中', icon: 'none' })
				}
			})
		}

		const onSync = async () => {
			uni.showToast({ title: '同步中...', icon: 'loading' })
			try {
				// Simulate sync
				await new Promise(resolve => setTimeout(resolve, 1500))
				uni.showToast({ title: '同步成功', icon: 'success' })
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