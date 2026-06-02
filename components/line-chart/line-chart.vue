<!--
	周聚合柱状图
	输入：data = [d1, d2, ..., dN] 每日金额；xLabels 与 data 等长（如 ['1日','','3日',...]）
	内部按 7 天一组聚合，输出 4~5 根周柱，柱顶直接显示周金额。
-->
<template>
	<view class="line-chart">
		<view class="chart-header">
			<text class="title">{{ title }}</text>
			<text class="total">合计 ¥{{ total.toFixed(2) }}</text>
		</view>
		<view class="chart-area">
			<view v-for="(b, i) in bars" :key="i" class="bar-col">
				<view class="bar-value">¥{{ b.value.toFixed(0) }}</view>
				<view class="bar-track">
					<view class="bar" :style="{ height: b.heightPct + '%' }"></view>
				</view>
				<view class="bar-label">{{ b.label }}</view>
			</view>
			<view v-if="bars.length === 0" class="empty">
				<text>暂无支出</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'LineChart',
	props: {
		title: { type: String, default: '支出趋势' },
		data: { type: Array, default: () => [] },
		xLabels: { type: Array, default: () => [] }
	},
	computed: {
		// 把每日数组按 7 天一组求和
		weeks() {
			const days = this.data
			if (!days.length) return []
			const groups = []
			for (let i = 0; i < days.length; i += 7) {
				const slice = days.slice(i, i + 7)
				groups.push(slice.reduce((s, v) => s + (v || 0), 0))
			}
			return groups
		},
		total() {
			return this.weeks.reduce((s, v) => s + v, 0)
		},
		max() {
			return Math.max(...this.weeks, 1)
		},
		bars() {
			const weeks = this.weeks
			if (!weeks.length) return []
			// 找出每天对应原始日期标签，找该周第一天的"1日"/"10日"等作为标签
			// xLabels 多为空字符串，简单地用 "第N周"+起始日
			return weeks.map((val, i) => {
				const startDay = i * 7 + 1
				return {
					value: val,
					label: '第' + (i + 1) + '周',
					heightPct: (val / this.max) * 90  // 90% 留顶给金额标签
				}
			})
		}
	}
}
</script>

<style scoped>
.line-chart {
	padding: 20rpx;
	background-color: #ffffff;
	border-radius: 12rpx;
}

.chart-header {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	margin-bottom: 24rpx;
}

.title {
	font-size: 34rpx;
	color: #333333;
	font-weight: bold;
}

.total {
	font-size: 26rpx;
	color: #666666;
}

.chart-area {
	display: flex;
	align-items: flex-end;
	justify-content: space-around;
	height: 320rpx;
	padding: 0 8rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.bar-col {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-end;
	height: 100%;
	margin: 0 6rpx;
}

.bar-value {
	font-size: 22rpx;
	color: #333333;
	font-weight: 500;
	margin-bottom: 6rpx;
	min-height: 28rpx;
}

.bar-track {
	width: 100%;
	max-width: 80rpx;
	height: 220rpx;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.bar {
	width: 100%;
	background: linear-gradient(to top, rgba(7, 193, 96, 0.55), rgba(7, 193, 96, 0.85));
	border-radius: 8rpx 8rpx 0 0;
	min-height: 4rpx;
	transition: height 0.3s ease;
}

.bar-label {
	font-size: 24rpx;
	color: #666666;
	margin-top: 10rpx;
}

.empty {
	position: absolute;
	left: 0;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	text-align: center;
	color: #999;
	font-size: 30rpx;
}
</style>
