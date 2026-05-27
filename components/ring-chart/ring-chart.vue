/**
 * 环形图组件
 * 显示已用/总预算比例
 */
<template>
	<view class="ring-chart">
		<view class="ring-container">
			<view class="ring" :style="ringStyle">
				<view class="ring-inner">
					<text class="amount">{{ displayAmount }}</text>
					<text class="label">{{ label }}</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'RingChart',
	props: {
		used: {
			type: Number,
			default: 0
		},
		total: {
			type: Number,
			default: 100
		},
		label: {
			type: String,
			default: '已用'
		}
	},
	computed: {
		percentage() {
			if (this.total <= 0) return 0
			return Math.min((this.used / this.total) * 100, 100)
		},
		displayAmount() {
			return this.used.toFixed(2)
		},
		ringStyle() {
			const percentage = this.percentage
			// 根据百分比选择颜色
			let color = '#07c160' // 正常绿色
			if (percentage >= 100) {
				color = '#dd524d' // 红色 - 超出
			} else if (percentage >= 80) {
				color = '#ff9500' // 橙色 - 警告
			}
			const bgColor = '#f0f0f0' // 灰色边框
			// conic-gradient 正确语法：色值 起始%, 色值 结束%, 色值 结束%, 色值 起始%
			return {
				background: `conic-gradient(${color} 0%, ${color} ${percentage}%, ${bgColor} ${percentage}%, ${bgColor} 100%)`
			}
		}
	}
}
</script>

<style scoped>
.ring-chart {
	display: flex;
	justify-content: center;
	align-items: center;
}

.ring-container {
	position: relative;
	width: 300rpx;
	height: 300rpx;
}

.ring {
	width: 100%;
	height: 100%;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.ring-inner {
	width: 80%;
	height: 80%;
	border-radius: 50%;
	background-color: #ffffff;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.amount {
	font-size: 36rpx;
	font-weight: bold;
	color: #333333;
}

.label {
	font-size: 24rpx;
	color: #666666;
	margin-top: 5rpx;
}
</style>