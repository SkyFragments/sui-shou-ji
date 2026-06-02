/**
 * 账单列表页面
 * 按日查看所有账单
 */
<template>
	<view class="records-page">
		<!-- 月份选择器 -->
		<view class="month-selector animate-slide-up">
			<view class="month-nav" @click="prevMonth">
				<image src="/static/icon/icon-arrow-left.svg" class="nav-btn-icon" />
			</view>
			<view class="month-display">
				<picker mode="date" :value="currentYearMonth" fields="month" @change="onMonthChange">
					<text class="month-text">{{ displayMonth }}</text>
				</picker>
			</view>
			<view class="month-nav" @click="nextMonth">
				<image src="/static/icon/icon-arrow-right.svg" class="nav-btn-icon" />
			</view>
		</view>

		<!-- 统计概览 -->
		<view class="stats-overview animate-slide-up delay-1">
			<view class="stat-item">
				<text class="stat-label">支出</text>
				<text class="stat-value expense">-{{ monthStats.expense.toFixed(2) }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-label">收入</text>
				<text class="stat-value income">+{{ monthStats.income.toFixed(2) }}</text>
			</view>
			<view class="stat-item">
				<text class="stat-label">结余</text>
				<text class="stat-value" :class="monthStats.balance >= 0 ? 'income' : 'expense'">
					{{ monthStats.balance >= 0 ? '+' : '' }}{{ monthStats.balance.toFixed(2) }}
				</text>
			</view>
		</view>

		<!-- 账单列表 -->
		<scroll-view class="records-list" scroll-y @scrolltolower="loadMore">
			<view v-for="(group, date) in groupedRecords" :key="date" class="date-group">
				<view class="date-header">
					<text class="date-text">{{ formatDateHeader(date) }}</text>
					<text class="date-total" :class="getDayExpense(group) >= 0 ? 'income' : 'expense'">
						{{ getDayExpense(group) >= 0 ? '+' : '' }}{{ getDayExpense(group).toFixed(2) }}
					</text>
				</view>
				<view class="records">
					<view
						v-for="record in group"
						:key="record.id"
						class="record-item"
						@touchstart="onTouchStart"
						@touchmove="onTouchMove(record.id)"
						@touchend="onTouchEnd"
					>
						<view class="swipe-container" :class="{ open: swipeId === record.id }">
							<view class="delete-btn" @click="deleteRecord(record)">删除</view>
						</view>
						<view class="record-content" @click="editRecord(record)">
							<view class="record-icon" :style="{ backgroundColor: getCategoryColor(record.category_code) }">
								<image :src="getCategoryIconPath(record.category_code)" class="record-icon-svg" />
							</view>
							<view class="record-info">
								<text class="record-category">{{ record.category_name }}</text>
								<text v-if="record.remark" class="record-remark">{{ record.remark }}</text>
							</view>
							<text class="record-amount" :class="record.type === 1 ? 'expense' : 'income'">
								{{ record.type === 1 ? '-' : '+' }}{{ record.amount.toFixed(2) }}
							</text>
						</view>
					</view>
				</view>
			</view>

			<view class="empty-state" v-if="Object.keys(groupedRecords).length === 0">
				<text>暂无账单记录</text>
			</view>
		</scroll-view>

		<!-- 底部导航 -->
		<view class="tabbar">
			<view class="tab-item" @click="goToIndex">
				<image src="/static/icon/icon-home.svg" class="tab-icon" />
				<text>首页</text>
			</view>
			<view class="tab-item active" @click="goToRecords">
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
			<view class="tab-item" @click="goToMy">
				<image src="/static/icon/icon-user.svg" class="tab-icon" />
				<text>我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'

export default {
	setup() {
		const billStore = useBillStore()
		const categoryStore = useCategoryStore()

		const currentYearMonth = ref(getCurrentYearMonth())
		const swipeId = ref(null)
		const startX = ref(0)

		onMounted(() => {
			billStore.loadRecords()
			categoryStore.loadCategories()
		})

		const displayMonth = computed(() => {
			const [year, month] = currentYearMonth.value.split('-')
			return `${year}年${parseInt(month)}月`
		})

		const monthStats = computed(() => {
			return billStore.getMonthStats(currentYearMonth.value)
		})

		const monthRecords = computed(() => {
			return billStore.getRecordsByMonth(currentYearMonth.value)
		})

		const groupedRecords = computed(() => {
			const groups = {}
			monthRecords.value.forEach(record => {
				const date = record.record_date
				if (!groups[date]) {
					groups[date] = []
				}
				groups[date].push(record)
			})
			// Sort by date descending
			const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a))
			const sortedGroups = {}
			sortedKeys.forEach(key => {
				sortedGroups[key] = groups[key]
			})
			return sortedGroups
		})

		const getDayExpense = (records) => {
			return records
				.filter(r => r.type === 1)
				.reduce((sum, r) => sum + r.amount, 0) -
				records
					.filter(r => r.type === 2)
					.reduce((sum, r) => sum + r.amount, 0)
		}

		const formatDateHeader = (date) => {
			const [year, month, day] = date.split('-')
			const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(date).getDay()]
			return `${parseInt(month)}月${parseInt(day)}日 ${weekDay}`
		}

		const getCategoryColor = (code) => {
			const category = categoryStore.getCategoryByCode(code)
			return category?.color || '#999'
		}

		const getCategoryIcon = (code) => {
			const category = categoryStore.getCategoryByCode(code)
			return category?.icon || 'box'
		}

		const getCategoryIconPath = (code) => {
			const iconName = getCategoryIcon(code)
			return `/static/icon/icon-${iconName}.svg`
		}

		const prevMonth = () => {
			const [year, month] = currentYearMonth.value.split('-').map(Number)
			if (month === 1) {
				currentYearMonth.value = `${year - 1}-12`
			} else {
				currentYearMonth.value = `${year}-${String(month - 1).padStart(2, '0')}`
			}
		}

		const nextMonth = () => {
			const [year, month] = currentYearMonth.value.split('-').map(Number)
			if (month === 12) {
				currentYearMonth.value = `${year + 1}-01`
			} else {
				currentYearMonth.value = `${year}-${String(month + 1).padStart(2, '0')}`
			}
		}

		const onMonthChange = (e) => {
			const date = new Date(e.detail.value)
			currentYearMonth.value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
		}

		const onTouchStart = (e) => {
			startX.value = e.touches[0].clientX
		}

		const onTouchMove = (id) => {
			// Simple swipe detection
		}

		const onTouchEnd = () => {
			// Close swipe
		}

		const deleteRecord = async (record) => {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除这条账单吗？',
				success: async (res) => {
					if (res.confirm) {
						await billStore.deleteRecord(record.id)
						uni.showToast({ title: '已删除', icon: 'success' })
					}
				}
			})
		}

		const editRecord = (record) => {
			uni.navigateTo({
				url: `/pages/add/add?recordId=${record.id}`
			})
		}

		const loadMore = () => {
			// Pagination if needed
		}

		const goToIndex = () => {
			uni.reLaunch({ url: '/pages/index/index' })
		}

		const goToRecords = () => {
			uni.reLaunch({ url: '/pages/records/records' })
		}

		const goToAdd = () => {
			uni.reLaunch({ url: '/pages/add/add' })
		}

		const goToStats = () => {
			uni.reLaunch({ url: '/pages/stats/stats' })
		}

		const goToMy = () => {
			uni.reLaunch({ url: '/pages/my/my' })
		}

		return {
			currentYearMonth,
			displayMonth,
			monthStats,
			groupedRecords,
			swipeId,
			getDayExpense,
			formatDateHeader,
			getCategoryColor,
			getCategoryIcon,
			getCategoryIconPath,
			prevMonth,
			nextMonth,
			onMonthChange,
			onTouchStart,
			onTouchMove,
			onTouchEnd,
			deleteRecord,
			editRecord,
			loadMore,
			goToIndex,
			goToRecords,
			goToAdd,
			goToStats,
			goToMy
		}
	}
}

function getCurrentYearMonth() {
	const now = new Date()
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
</script>

<style scoped>
.records-page {
	min-height: 100vh;
	background-color: #FDF4E9;
	padding-bottom: 120rpx;
}

.month-selector {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: #ffffff;
	padding: 20rpx 30rpx;
}

.month-nav {
	padding: 10rpx 20rpx;
}

.nav-btn {
	font-size: 34rpx;
	color: #666666;
}

.nav-btn-icon {
	width: 36rpx;
	height: 36rpx;
	color: #666666;
}

.month-display {
	text-align: center;
}

.month-text {
	font-size: 38rpx;
	font-weight: bold;
	color: #333333;
}

.stats-overview {
	display: flex;
	justify-content: space-around;
	background-color: #ffffff;
	padding: 24rpx;
	margin: 16rpx;
	border-radius: 12rpx;
}

.stat-item {
	text-align: center;
}

.stat-label {
	font-size: 28rpx;
	color: #666666;
	display: block;
}

.stat-value {
	font-size: 38rpx;
	font-weight: bold;
	display: block;
	margin-top: 8rpx;
}

.expense {
	color: #dd524d;
}

.income {
	color: #07c160;
}

.records-list {
	height: calc(100vh - 300rpx);
}

.date-group {
	margin-bottom: 16rpx;
}

.date-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 16rpx 24rpx;
	background-color: #FDF4E9;
}

.date-text {
	font-size: 32rpx;
	color: #666666;
}

.date-total {
	font-size: 32rpx;
	font-weight: 500;
}

.records {
	background-color: #ffffff;
}

.record-item {
	position: relative;
	overflow: hidden;
	transition: background-color 0.15s ease-out;
}

.record-item:active {
	background-color: #FDF4E9;
}

.swipe-container {
	position: absolute;
	right: 0;
	top: 0;
	bottom: 0;
	width: 160rpx;
	background-color: #dd524d;
	display: flex;
	align-items: center;
	justify-content: center;
	transform: translateX(100%);
}

.swipe-container.open {
	transform: translateX(0);
}

.delete-btn {
	color: #ffffff;
	font-size: 34rpx;
}

.record-content {
	display: flex;
	align-items: center;
	padding: 24rpx;
	background-color: #ffffff;
	border-bottom: 1rpx solid #FDF4E9;
}

.record-icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 20rpx;
}

.record-icon-svg {
	width: 44rpx;
	height: 44rpx;
}

.record-info {
	flex: 1;
}

.record-category {
	font-size: 34rpx;
	color: #333333;
	display: block;
}

.record-remark {
	font-size: 28rpx;
	color: #666666;
	margin-top: 4rpx;
	display: block;
}

.record-amount {
	font-size: 38rpx;
	font-weight: 500;
}

.empty-state {
	text-align: center;
	padding: 100rpx 0;
	color: #666666;
	font-size: 34rpx;
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
	width: 48rpx;
	height: 48rpx;
}

.add-tab-icon {
	font-size: 48rpx;
	color: #ffffff;
	font-weight: 300;
	line-height: 1;
}

.tab-icon {
	width: 44rpx;
	height: 44rpx;
	margin-bottom: 4rpx;
}


.tab-item .tab-icon {
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab-item.active .tab-icon {
	transform: scale(1.2);
}

</style>