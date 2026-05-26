/**
 * 首页
 * 显示今日概况和快速入口
 */
<template>
	<view class="index-page">
		<!-- 头部概况 -->
		<view class="overview-section animate-slide-up">
			<view class="overview-header">
				<text class="date">{{ todayDate }}</text>
				<text class="greeting">今天</text>
			</view>

			<view class="stats-row">
				<view class="stat-item expense">
					<text class="stat-label">支出</text>
					<text class="stat-amount">-{{ todayExpense.toFixed(2) }}</text>
				</view>
				<view class="stat-item income">
					<text class="stat-label">收入</text>
					<text class="stat-amount">+{{ todayIncome.toFixed(2) }}</text>
				</view>
			</view>
		</view>

		<!-- 预算进度 -->
		<view class="budget-section animate-slide-up delay-1" v-if="budgetStore.currentBudget">
			<ring-chart
				:used="monthUsed"
				:total="budgetStore.currentBudget"
				label="本月已用"
			/>
			<view class="budget-info">
				<view class="budget-item">
					<text class="budget-label">预算</text>
					<text class="budget-value">¥{{ budgetStore.currentBudget.toFixed(2) }}</text>
				</view>
				<view class="budget-item">
					<text class="budget-label">剩余</text>
					<text class="budget-value" :class="remainingClass">
						¥{{ remaining.toFixed(2) }}
					</text>
				</view>
			</view>
		</view>

		<!-- 超支提醒 - 使用 CSS dot 替代 emoji -->
		<view class="alert-banner animate-slide-up delay-2" :class="alertClass" v-if="alertMessage">
			<view class="alert-icon-wrapper">
				<text class="alert-icon">!</text>
			</view>
			<text class="alert-text">{{ alertMessage }}</text>
		</view>

		<!-- 快捷模板 -->
		<view class="templates-section animate-slide-up delay-3">
			<view class="section-title">快捷记账</view>
			<view class="templates-grid">
				<view
					class="template-item"
					v-for="template in templates"
					:key="template.id"
					@click="quickAdd(template)"
				>
					<view class="template-icon" :style="{ backgroundColor: template.color }">
						<image :src="getIconPath(template.icon)" class="icon-svg" />
					</view>
					<text class="template-name">{{ template.name }}</text>
					<text class="template-amount">¥{{ template.amount }}</text>
				</view>
			</view>
		</view>

		<!-- 今日账单 -->
		<view class="records-section animate-slide-up delay-4">
			<view class="section-header">
				<text class="section-title">今日账单</text>
				<text class="more" @click="goToRecords">查看全部</text>
			</view>
			<view class="records-list" v-if="todayRecords.length > 0">
				<view
					class="record-item"
					v-for="record in recentRecords"
					:key="record.id"
					@click="editRecord(record)"
				>
					<view class="record-icon" :style="{ backgroundColor: getCategoryColor(record.category_code) }">
						<image :src="getCategoryIconPath(record.category_code)" class="record-icon-svg" />
					</view>
					<view class="record-info">
						<text class="record-category">{{ record.category_name }}</text>
						<text class="record-time">{{ formatTime(record.create_time) }}</text>
					</view>
					<text class="record-amount" :class="record.type === 1 ? 'expense' : 'income'">
						{{ record.type === 1 ? '-' : '+' }}{{ record.amount.toFixed(2) }}
					</text>
				</view>
			</view>
			<view class="empty-state" v-else>
				<text>暂无账单记录</text>
			</view>
		</view>

		<!-- 记一笔按钮 -->
		<view class="add-btn" @click="goToAdd">
			<text class="add-icon">+</text>
			<text class="add-text">记一笔</text>
		</view>

		<!-- 底部导航 -->
		<view class="tabbar">
			<view class="tab-item active">
				<image src="/static/icon/icon-home.svg" class="tab-icon" />
				<text>首页</text>
			</view>
			<view class="tab-item" @click="goToRecords">
				<image src="/static/icon/icon-folder.svg" class="tab-icon" />
				<text>账单</text>
			</view>
			<view class="tab-item add-tab" @click="goToAdd">
				<image src="/static/icon/icon-wallet.svg" class="add-tab-icon-svg" />
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
import { useBudgetStore } from '@/store/budget'
import { useCategoryStore } from '@/store/category'
import RingChart from '@/components/ring-chart/ring-chart.vue'

export default {
	components: {
		RingChart
	},
	setup() {
		const billStore = useBillStore()
		const budgetStore = useBudgetStore()
		const categoryStore = useCategoryStore()

		// 快捷模板 - 使用SVG图标
		const templates = [
			{ id: 1, name: '早餐', amount: 10, category_code: 'FOOD', icon: 'meal', color: '#FF6B6B' },
			{ id: 2, name: '午餐', amount: 30, category_code: 'FOOD', icon: 'food', color: '#FF6B6B' },
			{ id: 3, name: '打车', amount: 25, category_code: 'TRANSPORT', icon: 'car', color: '#4ECDC4' },
			{ id: 4, name: '地铁', amount: 5, category_code: 'TRANSPORT', icon: 'bus', color: '#4ECDC4' },
			{ id: 5, name: '咖啡', amount: 20, category_code: 'FOOD', icon: 'drink', color: '#FF6B6B' },
			{ id: 6, name: '电影', amount: 50, category_code: 'ENTERTAINMENT', icon: 'movie', color: '#96CEB4' }
		]

		// 初始化数据
		onMounted(() => {
			billStore.loadRecords()
			budgetStore.loadBudgets()
			categoryStore.loadCategories()
		})

		// 计算属性
		const todayDate = computed(() => {
			const now = new Date()
			const month = now.getMonth() + 1
			const day = now.getDate()
			const weekDay = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()]
			return `${month}月${day}日 ${weekDay}`
		})

		const todayRecords = computed(() => billStore.todayRecords)
		const recentRecords = computed(() => todayRecords.value.slice(0, 5))
		const todayExpense = computed(() => billStore.todayExpense)
		const todayIncome = computed(() => billStore.todayIncome)

		const monthUsed = computed(() => {
			const now = new Date()
			const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
			return billStore.getMonthStats(yearMonth).expense
		})

		const remaining = computed(() => {
			if (!budgetStore.currentBudget) return 0
			return Math.max(0, budgetStore.currentBudget - monthUsed.value)
		})

		const percentage = computed(() => {
			if (!budgetStore.currentBudget) return 0
			return (monthUsed.value / budgetStore.currentBudget) * 100
		})

		const alertClass = computed(() => {
			if (percentage.value >= 120) return 'alert-danger'
			if (percentage.value >= 100) return 'alert-warning'
			if (percentage.value >= 80) return 'alert-caution'
			return ''
		})

		// 优化：移除 emoji 使用纯文字提示
		const alertMessage = computed(() => {
			if (percentage.value >= 120) return '已超支120%，注意控制支出！'
			if (percentage.value >= 100) return '已超支，请调整消费计划'
			if (percentage.value >= 80) return '预算已用80%，注意控制'
			return ''
		})

		const remainingClass = computed(() => {
			if (percentage.value >= 100) return 'text-danger'
			if (percentage.value >= 80) return 'text-warning'
			return ''
		})

		// 方法
		const getCategoryColor = (code) => {
			const category = categoryStore.getCategoryByCode(code)
			return category?.color || '#999'
		}

		const getCategoryIcon = (code) => {
			const category = categoryStore.getCategoryByCode(code)
			if (category?.icon) {
				return category.icon
			}
			return '?'
		}

		const getCategoryIconPath = (code) => {
			const iconName = getCategoryIcon(code)
			return `/static/icon/icon-${iconName}.svg`
		}

		const formatTime = (timestamp) => {
			const date = new Date(timestamp)
			return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
		}

		const quickAdd = async (template) => {
			const category = categoryStore.getCategoryByCode(template.category_code)
			const record = {
				type: 1, // 支出
				amount: template.amount,
				category_code: template.category_code,
				category_name: category?.name || template.name,
				account_code: 'cash',
				remark: '',
				record_date: new Date().toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }).replace(/\//g, '-')
			}
			try {
				await billStore.addRecord(record)
				uni.showToast({ title: '已添加', icon: 'success' })
			} catch (e) {
				uni.showToast({ title: '添加失败', icon: 'none' })
			}
		}

		const goToAdd = () => {
			uni.navigateTo({ url: '/pages/add/add' })
		}

		const goToRecords = () => {
			uni.reLaunch({ url: '/pages/records/records' })
		}

		const goToStats = () => {
			uni.reLaunch({ url: '/pages/stats/stats' })
		}

		const goToMy = () => {
			uni.reLaunch({ url: '/pages/my/my' })
		}

		const getIconPath = (iconName) => {
			return `/static/icon/icon-${iconName}.svg`
		}

		const editRecord = (record) => {
			uni.navigateTo({
				url: `/pages/add/add?recordId=${record.id}`
			})
		}

		return {
			templates,
			todayDate,
			todayRecords,
			recentRecords,
			todayExpense,
			todayIncome,
			monthUsed,
			remaining,
			percentage,
			alertClass,
			alertMessage,
			remainingClass,
			budgetStore,
			getCategoryColor,
			getCategoryIcon,
			getCategoryIconPath,
			formatTime,
			quickAdd,
			goToAdd,
			goToRecords,
			goToStats,
			goToMy,
			getIconPath,
			editRecord
		}
	}
}
</script>

<style scoped>
.index-page {
	min-height: 100vh;
	background-color: var(--color-background);
	padding-bottom: 120rpx;
}

.overview-section {
	background-color: var(--color-primary);
	padding: 30rpx 30rpx 40rpx;
	color: var(--color-surface);
}

.overview-header {
	margin-bottom: 20rpx;
}

.date {
	font-size: 28rpx;
	opacity: 0.9;
}

.greeting {
	font-size: 40rpx;
	font-weight: bold;
	display: block;
	margin-top: 8rpx;
}

.stats-row {
	display: flex;
	justify-content: space-around;
	margin-top: 20rpx;
}

.stat-item {
	text-align: center;
}

.stat-label {
	font-size: 26rpx;
	opacity: 0.85;
}

.stat-amount {
	font-size: 44rpx;
	font-weight: bold;
	display: block;
	margin-top: 8rpx;
}

.budget-section {
	display: flex;
	align-items: center;
	background-color: var(--color-surface);
	margin: 20rpx;
	border-radius: 16rpx;
	padding: 30rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.budget-info {
	flex: 1;
	margin-left: 30rpx;
}

.budget-item {
	display: flex;
	justify-content: space-between;
	padding: 10rpx 0;
}

.budget-label {
	font-size: 26rpx;
	color: var(--color-text-secondary);
}

.budget-value {
	font-size: 28rpx;
	color: var(--color-text-primary);
	font-weight: 500;
}

.text-danger {
	color: var(--color-danger);
}

.text-warning {
	color: var(--color-warning);
}

/* 优化：超支提醒 Banner 样式 */
.alert-banner {
	margin: 0 20rpx 20rpx;
	padding: 20rpx 24rpx;
	border-radius: 12rpx;
	font-size: 26rpx;
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.alert-icon-wrapper {
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	background-color: rgba(255, 255, 255, 0.3);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.alert-icon {
	font-size: 28rpx;
	font-weight: bold;
	color: inherit;
}

.alert-text {
	flex: 1;
}

.alert-caution {
	background-color: var(--bg-caution);
	color: var(--color-warning);
}

.alert-warning {
	background-color: var(--bg-warning);
	color: var(--color-warning);
}

.alert-danger {
	background-color: var(--bg-expense);
	color: var(--color-danger);
}

.templates-section {
	background-color: var(--color-surface);
	margin: 0 20rpx 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: var(--color-text-primary);
	margin-bottom: 20rpx;
}

.templates-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
}

/* 优化：添加触摸反馈动画 */
.template-item {
	width: 25%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 16rpx 0;
	transition: transform 0.15s ease-out, opacity 0.15s ease-out;
}

.template-item:active {
	transform: scale(0.95);
	opacity: 0.8;
}

.template-icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	color: var(--color-surface);
	font-weight: 500;
}

.template-name {
	font-size: 24rpx;
	color: var(--color-text-primary);
	margin-top: 10rpx;
}

.template-amount {
	font-size: 22rpx;
	color: var(--color-text-secondary);
	margin-top: 4rpx;
}

.records-section {
	background-color: var(--color-surface);
	margin: 0 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.more {
	font-size: 26rpx;
	color: #999;
}

.records-list {
	border-top: 1rpx solid var(--color-border);
}

.record-item {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid var(--color-background);
	transition: background-color 0.15s ease-out;
}

/* 优化：记录项触摸反馈 */
.record-item:active {
	background-color: #f8f8f8;
}

.record-item:last-child {
	border-bottom: none;
}

.record-icon {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--color-surface);
	font-weight: 500;
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
	font-size: 28rpx;
	color: var(--color-text-primary);
	display: block;
}

.record-time {
	font-size: 24rpx;
	color: #999;
	margin-top: 4rpx;
}

.record-amount {
	font-size: 32rpx;
	font-weight: 500;
}

.record-amount.expense {
	color: var(--color-danger);
}

.record-amount.income {
	color: var(--color-primary);
}

.empty-state {
	text-align: center;
	padding: 60rpx 0;
	color: #999;
	font-size: 28rpx;
}

.add-btn {
	position: fixed;
	right: 30rpx;
	bottom: 120rpx;
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background-color: var(--color-primary);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 20rpx rgba(7, 193, 96, 0.4);
	transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
}

/* 优化：记一笔按钮触摸反馈 */
.add-btn:active {
	transform: scale(0.95);
	box-shadow: 0 2rpx 10rpx rgba(7, 193, 96, 0.3);
}

.add-icon {
	font-size: 48rpx;
	color: var(--color-surface);
	line-height: 1;
}

.add-text {
	font-size: 22rpx;
	color: var(--color-surface);
	margin-top: 4rpx;
}

.tabbar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 100rpx;
	background-color: var(--color-surface);
	display: flex;
	align-items: center;
	justify-content: space-around;
	border-top: 1rpx solid var(--color-border);
	padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
	flex: 1;
	text-align: center;
	font-size: 22rpx;
	color: #999;
	transition: color 0.15s ease-out;
}

.tab-item.active {
	color: var(--color-primary);
}

.add-tab {
	display: flex;
	align-items: center;
	justify-content: center;
}

.add-tab-icon {
	font-size: 56rpx;
	color: var(--color-primary);
}

.tab-icon {
	width: 44rpx;
	height: 44rpx;
	margin-bottom: 4rpx;
}

.add-tab-icon-svg {
	width: 56rpx;
	height: 56rpx;
}

.icon-svg {
	width: 48rpx;
	height: 48rpx;
}
</style>
