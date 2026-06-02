/**
 * 饼图组件
 * 显示分类支出占比
 */
<template>
	<view class="pie-chart">
		<view class="chart-container">
			<!-- 简单饼图实现 -->
			<view class="pie" :style="pieStyle">
				<view class="pie-inner">
					<text class="total">{{ totalAmount.toFixed(2) }}</text>
				</view>
			</view>
		</view>
		<view class="legend">
			<view
				v-for="(item, index) in legendItems"
				:key="item.code"
				class="legend-item"
				@click="onLegendClick(item)"
			>
				<view class="legend-color" :style="{ backgroundColor: item.color }"></view>
				<text class="legend-name">{{ item.name }}</text>
				<text class="legend-value">{{ item.percentage }}%</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'PieChart',
	props: {
		data: {
			type: Array,
			default: () => []
		}
	},
	computed: {
		totalAmount() {
			return this.data.reduce((sum, item) => sum + item.value, 0)
		},
		pieStyle() {
			if (this.data.length === 0) {
				return { background: '#f0f0f0' }
			}
			// 构建 conic-gradient 正确语法：每段需要起止百分比
			const total = this.totalAmount
			let gradient = []
			let currentPercent = 0
			this.data.forEach((item, index) => {
				const color = item.color || '#07c160'
				const percent = total > 0 ? (item.value / total) * 100 : 0
				const startPercent = currentPercent
				const endPercent = currentPercent + percent
				gradient.push(`${color} ${startPercent}% ${endPercent}%`)
				currentPercent = endPercent
			})
			// 补足100%
			if (currentPercent < 100) {
				gradient.push(`#f0f0f0 ${currentPercent}% 100%`)
			}
			return {
				background: `conic-gradient(${gradient.join(', ')})`
			}
		},
		legendItems() {
			const total = this.totalAmount
			return this.data.map(item => ({
				...item,
				percentage: total > 0 ? ((item.value / total) * 100).toFixed(1) : '0.0'
			}))
		}
	},
	methods: {
		onLegendClick(item) {
			this.$emit('legend-click', item)
		}
	}
}
</script>

<style scoped>
.pie-chart {
	padding: 20rpx;
}

.chart-container {
	display: flex;
	justify-content: center;
	margin-bottom: 20rpx;
}

.pie {
	width: 300rpx;
	height: 300rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.pie-inner {
	width: 70%;
	height: 70%;
	border-radius: 50%;
	background-color: var(--color-surface);
	display: flex;
	align-items: center;
	justify-content: center;
}

.total {
	font-size: 38rpx;
	font-weight: bold;
	color: var(--color-text-primary);
}

.legend {
	display: flex;
	flex-wrap: wrap;
	justify-content: center;
}

.legend-item {
	width: 25%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 10rpx 0;
}

.legend-color {
	width: 30rpx;
	height: 30rpx;
	border-radius: 50%;
	margin-bottom: 5rpx;
}

.legend-name {
	font-size: 26rpx;
	color: var(--color-text-secondary);
}

.legend-value {
	font-size: 24rpx;
	color: var(--color-text-secondary);
}
</style>