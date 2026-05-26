/**
 * 统计页面
 * 月度统计分析
 */
<template>
	<view class="stats-page">
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

		<!-- 本月概况 -->
		<view class="overview-section animate-slide-up delay-1">
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
		<view class="chart-section animate-slide-up delay-2">
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

		<!-- 分类详情弹窗 -->
		<view class="modal" v-if="showCategoryModal">
			<view class="modal-mask" @click="closeCategoryModal"></view>
			<view class="modal-content">
				<view class="modal-header">
					<text class="modal-title">{{ selectedCategory?.name || '' }} 详情</text>
				</view>
				<view class="modal-body">
					<view class="detail-row">
						<text class="detail-label">支出金额</text>
						<text class="detail-value expense">¥{{ selectedCategory?.value?.toFixed(2) || '0.00' }}</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">占比</text>
						<text class="detail-value">{{ selectedCategory?.percentage || '0' }}%</text>
					</view>
					<view class="detail-row">
						<text class="detail-label">交易笔数</text>
						<text class="detail-value">{{ getCategoryCount(selectedCategory?.code) }} 笔</text>
					</view>
				</view>
				<view class="modal-footer">
					<view class="btn confirm-btn" @click="closeCategoryModal">
						<text>确定</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 日支出趋势 -->
		<view class="chart-section animate-slide-up delay-2">
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
			<view class="tab-item active" @click="goToStats">
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
		const showCategoryModal = ref(false)
		const selectedCategory = ref(null)

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
			const categoryWithPercentage = categoryStats.value.find(c => c.code === item.code)
			selectedCategory.value = categoryWithPercentage || item
			showCategoryModal.value = true
		}

		const closeCategoryModal = () => {
			showCategoryModal.value = false
			selectedCategory.value = null
		}

		const getCategoryCount = (code) => {
			if (!code) return 0
			const records = billStore.getRecordsByMonth(currentYearMonth.value)
			return records.filter(r => r.category_code === code && r.type === 1).length
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
			showCategoryModal,
			selectedCategory,
			prevMonth,
			nextMonth,
			onCategoryClick,
			closeCategoryModal,
			getCategoryCount,
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

.overview-section {
	padding: 20rpx;
}

.overview-card {
	background-color: var(--color-surface);
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
	color: var(--color-text-secondary);
	display: block;
}

.stat-value {
	font-size: 40rpx;
	font-weight: bold;
	display: block;
	margin-top: 8rpx;
}

.income {
	color: var(--color-primary);
}

.expense {
	color: var(--color-danger);
}

.chart-section {
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

.empty-chart {
	text-align: center;
	padding: 60rpx 0;
	color: var(--color-text-secondary);
	font-size: 28rpx;
}

/* Modal */
.modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
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
	background-color: var(--color-surface);
	border-radius: 16rpx;
	overflow: hidden;
}

.modal-header {
	padding: 30rpx;
	border-bottom: 1rpx solid var(--color-border);
}

.modal-title {
	font-size: 32rpx;
	font-weight: bold;
	color: var(--color-text-primary);
}

.modal-body {
	padding: 30rpx;
}

.detail-row {
	display: flex;
	justify-content: space-between;
	padding: 20rpx 0;
	border-bottom: 1rpx solid var(--color-border);
}

.detail-row:last-child {
	border-bottom: none;
}

.detail-label {
	font-size: 28rpx;
	color: var(--color-text-secondary);
}

.detail-value {
	font-size: 28rpx;
	color: var(--color-text-primary);
	font-weight: 500;
}

.modal-footer {
	border-top: 1rpx solid var(--color-border);
}

.btn {
	text-align: center;
	padding: 30rpx;
	font-size: 28rpx;
}

.confirm-btn {
	color: var(--color-primary);
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
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
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
</style>