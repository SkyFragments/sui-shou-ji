/**
 * 预算页面
 * 设置月预算并查看执行进度
 */
<template>
	<view class="budget-page">
		<!-- 月份选择器 -->
		<view class="month-selector animate-slide-up">
			<view class="month-nav" @click="prevMonth">
				<text class="nav-btn"><</text>
			</view>
			<view class="month-display">
				<text class="month-text">{{ displayMonth }}</text>
			</view>
			<view class="month-nav" @click="nextMonth">
				<text class="nav-btn">></text>
			</view>
		</view>

		<!-- 预算设置 -->
		<view class="budget-setting-section animate-slide-up delay-1">
			<view class="section-title">月预算设置</view>
			<view class="budget-input-row">
				<text class="budget-currency">¥</text>
				<input
					class="budget-input"
					type="digit"
					v-model="budgetAmount"
					@blur="onBudgetChange"
					placeholder="请输入预算金额"
				/>
			</view>
			<slider
				class="budget-slider"
				:min="0"
				:max="10000"
				:step="100"
				:value="budgetAmount"
				@change="onSliderChange"
				activeColor="var(--color-primary)"
			/>
			<view class="budget-presets">
				<view
					class="preset-btn"
					v-for="preset in presets"
					:key="preset"
					@click="setPreset(preset)"
				>
					{{ preset }}
				</view>
			</view>
		</view>

		<!-- 预算进度 -->
		<view class="progress-section animate-slide-up delay-2">
			<view class="progress-info">
				<view class="progress-item">
					<text class="progress-label">预算</text>
					<text class="progress-value">¥{{ currentBudget.toFixed(2) }}</text>
				</view>
				<view class="progress-item">
					<text class="progress-label">已用</text>
					<text class="progress-value expense">¥{{ used.toFixed(2) }}</text>
				</view>
				<view class="progress-item">
					<text class="progress-label">剩余</text>
					<text class="progress-value" :class="remaining >= 0 ? 'income' : 'expense'">
						¥{{ Math.abs(remaining).toFixed(2) }}{{ remaining < 0 ? ' (超支)' : '' }}
					</text>
				</view>
			</view>

		<!-- 进度条 -->
			<view class="progress-bar">
				<view class="progress-fill" :class="progressClass" :style="{ width: progressWidth }"></view>
			</view>
			<view class="progress-percentage">
				<text>已使用{{ percentage.toFixed(1) }}%</text>
			</view>
		</view>

		<!-- 超支提醒 -->
		<view class="alert-banner" :class="alertClass" v-if="alertMessage">
			<text>{{ alertMessage }}</text>
		</view>

		<!-- 日均消费建议 -->
		<view class="suggestion-section" v-if="remaining > 0">
			<view class="suggestion-title">日均可用</view>
			<text class="suggestion-value">¥{{ dailyAvailable.toFixed(2) }}</text>
			<text class="suggestion-hint">按剩余天数平均计算</text>
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
import { useBudgetStore } from '@/store/budget'
import { useBillStore } from '@/store/bill'

export default {
	setup() {
		const budgetStore = useBudgetStore()
		const billStore = useBillStore()

		const currentYearMonth = ref(getCurrentYearMonth())
		const budgetAmount = ref(3000)

		const presets = [1000, 2000, 3000, 5000, 10000]

		onMounted(() => {
			budgetStore.loadBudgets()
			billStore.loadRecords()
			budgetAmount.value = budgetStore.getBudget(currentYearMonth.value)
		})

		const displayMonth = computed(() => {
			const [year, month] = currentYearMonth.value.split('-')
			return `${year}年${parseInt(month)}月`
		})

		const currentBudget = computed(() => {
			return budgetStore.getBudget(currentYearMonth.value)
		})

		const used = computed(() => {
			const stats = billStore.getMonthStats(currentYearMonth.value)
			return stats.expense
		})

		const remaining = computed(() => {
			return currentBudget.value - used.value
		})

		const percentage = computed(() => {
			if (currentBudget.value === 0) return 0
			return (used.value / currentBudget.value) * 100
		})

		const progressWidth = computed(() => {
			return `${Math.min(percentage.value, 100)}%`
		})

		const progressClass = computed(() => {
			if (percentage.value >= 120) return 'danger'
			if (percentage.value >= 100) return 'warning'
			if (percentage.value >= 80) return 'caution'
			return 'normal'
		})

		const alertMessage = computed(() => {
				if (percentage.value >= 120) return '已超支20%，注意控制支出！'
				if (percentage.value >= 100) return '已超支，请调整消费计划'
				if (percentage.value >= 80) return '预算已用80%，注意控制'
			return ''
		})

		const alertClass = computed(() => {
			if (percentage.value >= 120) return 'alert-danger'
			if (percentage.value >= 100) return 'alert-warning'
			if (percentage.value >= 80) return 'alert-caution'
			return ''
		})

		const dailyAvailable = computed(() => {
			const now = new Date()
			const [year, month] = currentYearMonth.value.split('-').map(Number)
			const daysInMonth = new Date(year, month, 0).getDate()
			const today = now.getDate()
			const daysLeft = daysInMonth - today + 1
			return remaining.value > 0 ? remaining.value / daysLeft : 0
		})

		const onBudgetChange = () => {
			const amount = parseFloat(budgetAmount.value) || 0
			budgetStore.setBudget(currentYearMonth.value, amount)
		}

		const onSliderChange = (e) => {
			budgetAmount.value = e.detail.value
			budgetStore.setBudget(currentYearMonth.value, budgetAmount.value)
		}

		const setPreset = (preset) => {
			budgetAmount.value = preset
			budgetStore.setBudget(currentYearMonth.value, preset)
		}

		const prevMonth = () => {
			const [year, month] = currentYearMonth.value.split('-').map(Number)
			if (month === 1) {
				currentYearMonth.value = `${year - 1}-12`
			} else {
				currentYearMonth.value = `${year}-${String(month - 1).padStart(2, '0')}`
			}
			budgetAmount.value = budgetStore.getBudget(currentYearMonth.value)
		}

		const nextMonth = () => {
			const [year, month] = currentYearMonth.value.split('-').map(Number)
			if (month === 12) {
				currentYearMonth.value = `${year + 1}-01`
			} else {
				currentYearMonth.value = `${year}-${String(month + 1).padStart(2, '0')}`
			}
			budgetAmount.value = budgetStore.getBudget(currentYearMonth.value)
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
			budgetAmount,
			presets,
			currentBudget,
			used,
			remaining,
			percentage,
			progressWidth,
			progressClass,
			alertMessage,
			alertClass,
			dailyAvailable,
			onBudgetChange,
			onSliderChange,
			setPreset,
			prevMonth,
			nextMonth,
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
.budget-page {
	min-height: 100vh;
	background-color: var(--color-background);
	padding-bottom: 120rpx;
}

.month-selector {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: var(--color-surface);
	padding: 20rpx 30rpx;
}

.month-nav {
	padding: 10rpx 20rpx;
}

.nav-btn {
	font-size: 28rpx;
	color: var(--color-text-secondary);
}

.month-display {
	text-align: center;
}

.month-text {
	font-size: 32rpx;
	font-weight: bold;
	color: var(--color-text-primary);
}

.budget-setting-section {
	background-color: var(--color-surface);
	margin: 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: var(--color-text-primary);
	margin-bottom: 20rpx;
}

.budget-input-row {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20rpx 0;
}

.budget-currency {
	font-size: 48rpx;
	color: var(--color-text-primary);
	margin-right: 8rpx;
}

.budget-input {
	font-size: 64rpx;
	font-weight: bold;
	text-align: center;
	width: 300rpx;
	min-height: 88rpx;
	color: var(--color-text-primary);
	box-sizing: border-box;
}

.budget-slider {
	margin: 20rpx 0;
	height: 88rpx;
}

.budget-presets {
	display: flex;
	justify-content: space-around;
	padding-top: 20rpx;
}

.preset-btn {
	padding: 12rpx 32rpx;
	border-radius: 40rpx;
	background-color: var(--color-border);
	font-size: 26rpx;
	color: var(--color-text-secondary);
	transition: transform 0.15s ease-out, opacity 0.15s ease-out;
}

.preset-btn:active {
	transform: scale(0.95);
	opacity: 0.8;
}

.progress-section {
	background-color: var(--color-surface);
	margin: 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
}

.progress-info {
	display: flex;
	justify-content: space-around;
	margin-bottom: 24rpx;
}

.progress-item {
	text-align: center;
}

.progress-label {
	font-size: 26rpx;
	color: var(--color-text-secondary);
	display: block;
}

.progress-value {
	font-size: 32rpx;
	font-weight: bold;
	display: block;
	margin-top: 8rpx;
}

.expense {
	color: var(--color-danger);
}

.income {
	color: var(--color-primary);
}

.progress-bar {
	height: 24rpx;
	background-color: var(--color-border);
	border-radius: 12rpx;
	overflow: hidden;
}

.progress-fill {
	height: 100%;
	border-radius: 12rpx;
	transition: width 0.3s;
}

.progress-fill.normal {
	background-color: var(--color-primary);
}

.progress-fill.caution {
	background-color: var(--color-warning);
}

.progress-fill.warning {
	background-color: var(--color-warning);
}

.progress-fill.danger {
	background-color: var(--color-danger);
}

.progress-percentage {
	text-align: center;
	font-size: 24rpx;
	color: var(--color-text-secondary);
	margin-top: 12rpx;
}

.alert-banner {
	margin: 0 20rpx 20rpx;
	padding: 20rpx 24rpx;
	border-radius: 12rpx;
	font-size: 26rpx;
	text-align: center;
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

.suggestion-section {
	background-color: var(--color-surface);
	margin: 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
	text-align: center;
}

.suggestion-title {
	font-size: 26rpx;
	color: var(--color-text-secondary);
}

.suggestion-value {
	font-size: 56rpx;
	font-weight: bold;
	color: var(--color-primary);
	display: block;
	margin: 10rpx 0;
}

.suggestion-hint {
	font-size: 24rpx;
	color: var(--color-text-secondary);
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
	color: var(--color-text-secondary);
}

.tab-item.active {
	color: var(--color-primary);
}

.add-tab {
	display: flex;
	align-items: center;
	justify-content: center;
}

.tab-icon { width: 44rpx; height: 44rpx; margin-bottom: 4rpx; } .add-tab-icon-svg { width: 56rpx; height: 56rpx; }
</style>