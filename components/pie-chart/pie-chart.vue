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
				return { background: '#e0e0e0' }
			}
			// 简化实现，使用渐变模拟
			const colors = this.data.map(item => item.color || '#007AFF')
			return {
				background: `conic-gradient(${colors.join(', ')})`
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
	background-color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
}

.total {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
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
	font-size: 22rpx;
	color: #666;
}

.legend-value {
	font-size: 20rpx;
	color: #999;
}
</style>