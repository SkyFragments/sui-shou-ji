/**
 * 折线图组件
 * 显示日支出趋势
 */
<template>
	<view class="line-chart">
		<view class="chart-header">
			<text class="title">{{ title }}</text>
		</view>
		<view class="chart-container">
			<!-- 简化折线图实现 -->
			<view class="line-canvas">
				<view
					v-for="(point, index) in points"
					:key="index"
					class="point"
					:style="getPointStyle(point, index)"
				>
					<view class="dot"></view>
				</view>
			</view>
			<view class="x-axis">
				<text v-for="label in xLabels" :key="label" class="x-label">{{ label }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'LineChart',
	props: {
		title: {
			type: String,
			default: '支出趋势'
		},
		data: {
			type: Array,
			default: () => []
		},
		xLabels: {
			type: Array,
			default: () => []
		}
	},
	computed: {
		points() {
			if (this.data.length === 0) return []
			const max = Math.max(...this.data, 1)
			return this.data.map((value, index) => ({
				value,
				x: (index / Math.max(this.data.length - 1, 1)) * 100,
				y: 100 - (value / max) * 80
			}))
		}
	},
	methods: {
		getPointStyle(point, index) {
			return {
				left: `${point.x}%`,
				top: `${point.y}%`
			}
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
	margin-bottom: 20rpx;
}

.title {
	font-size: 34rpx;
	color: #333333;
	font-weight: bold;
}

.chart-container {
	position: relative;
	height: 300rpx;
}

.line-canvas {
	position: relative;
	height: 250rpx;
	border-left: 1rpx solid #f0f0f0;
	border-bottom: 1rpx solid #f0f0f0;
	margin: 0 20rpx;
}

.point {
	position: absolute;
	transform: translate(-50%, -50%);
}

.dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background-color: #07c160;
}

.x-axis {
	display: flex;
	justify-content: space-between;
	padding: 10rpx 20rpx 0;
}

.x-label {
	font-size: 24rpx;
	color: #666666;
}
</style>