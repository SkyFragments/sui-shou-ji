/**
 * 统计页面
 * 月度统计分析
 */
<template>
	<view class="stats-page">
		<!-- 月份选择器 -->
		<view class="month-selector">
			<view class="month-nav" @click="prevMonth">
				<text class="nav-btn">◀</text>
			</view>
			<view class="month-display">
				<text class="month-text">{{ displayMonth }}</text>
			</view>
			<view class="month-nav" @click="nextMonth">
				<text class="nav-btn">▶</text>
			</view>
		</view>

		<!-- 本月概况 -->
		<view class="overview-section">
			<view class="overview-card">
				<view class="stat-row">
					<view class="stat-item">
						<text class="stat-label">收入</text>
						<text class="stat-value income">+{{ monthStats.income.toFixed(2) }}</text>
					</view>
					<view class="stat-item">
						<text class="stat-label">支出</text>
						<text class="stat-value expense">-{{ monthStats.expense.toFixed(2) }}</text>
					</view>
					<view class="stat-item">
						<text class="stat-label">结余</text>
						<text class="stat-value" :class="monthStats.balance >= 0 ? 'income' : 'expense'">
							{{ monthStats.balance >= 0 ? '+' : '' }}{{ monthStats.balance.toFixed(2) }}
						</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 分类占比饼图 -->
		<view class="chart-section">
			<view class="section-title">支出分类</view>
			<pie-chart
				v-if="categoryStats.length > 0"
				:data="categoryStats"
				@legend-click="onCategoryClick"
			/>
			<view class="empty-chart" v-else>
				<text>暂无数据</text>
			</view>
		</view>

		<!-- 日支出趋势 -->
		<view class="chart-section">
			<view class="section-title">日支出趋势</view>
			<line-chart
				v-if="dailyExpense.length > 0"
				:data="dailyExpense"
				:xLabels="xLabels"
				title="日支出"
			/>
			<view class="empty-chart" v-else>
				<text>暂无数据</text>
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
			<view class="tab-item active" @click="goToStats">
				<text>分析</text>
			</view>
			<view class="tab-item" @click="goToMy">
				<text>我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import PieChart from '@/components/pie-chart/pie-chart.vue'
import LineChart from '@/components/line-chart/line-chart.vue'

export default {
	components: {
		PieChart,
		LineChart
	},
	setup() {
		const billStore = useBillStore()
		const categoryStore = useCategoryStore()

		const currentYearMonth = ref(getCurrentYearMonth())

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

		const categoryStats = computed(() => {
			const stats = billStore.getCategoryStats(currentYearMonth.value, 1)
			return stats.map(s => {
				const category = categoryStore.getCategoryByCode(s.code)
				return {
					code: s.code,
					name: s.name,
					value: s.total,
					color: category?.color || '#999'
				}
			})
		})

		const dailyExpense = computed(() => {
			const records = billStore.getRecordsByMonth(currentYearMonth.value)
			const days = {}
			const [year, month] = currentYearMonth.value.split('-')
			const daysInMonth = new Date(year, month, 0).getDate()

			for (let i = 1; i <= daysInMonth; i++) {
				days[`${String(i).padStart(2, '0')}`] = 0
			}

			records
				.filter(r => r.type === 1)
				.forEach(r => {
					const day = r.record_date.split('-')[2]
					days[day] = (days[day] || 0) + r.amount
				})

			return Object.values(days)
		})

		const xLabels = computed(() => {
			const [year, month] = currentYearMonth.value.split('-')
			const daysInMonth = new Date(year, month, 0).getDate()
			const labels = []
			for (let i = 1; i <= daysInMonth; i++) {
				if (i === 1 || i === 10 || i === 20 || i === daysInMonth) {
					labels.push(`${i}日`)
				} else {
					labels.push('')
				}
			}
			return labels
		})

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

		const onCategoryClick = (item) => {
			// TODO: Show category details
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
			categoryStats,
			dailyExpense,
			xLabels,
			prevMonth,
			nextMonth,
			onCategoryClick,
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
.stats-page {
	min-height: 100vh;
	background-color: #f5f5f5;
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
	font-size: 28rpx;
	color: #666;
}

.month-display {
	text-align: center;
}

.month-text {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.overview-section {
	padding: 20rpx;
}

.overview-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 30rpx;
}

.stat-row {
	display: flex;
	justify-content: space-around;
}

.stat-item {
	text-align: center;
}

.stat-label {
	font-size: 26rpx;
	color: #666;
	display: block;
}

.stat-value {
	font-size: 40rpx;
	font-weight: bold;
	display: block;
	margin-top: 8rpx;
}

.income {
	color: #07c160;
}

.expense {
	color: #dd524d;
}

.chart-section {
	background-color: #ffffff;
	margin: 0 20rpx 20rpx;
	border-radius: 16rpx;
	padding: 24rpx;
}

.section-title {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
}

.empty-chart {
	text-align: center;
	padding: 60rpx 0;
	color: #999;
	font-size: 28rpx;
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