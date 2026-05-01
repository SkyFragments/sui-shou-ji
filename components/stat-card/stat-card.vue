/**
 * 统计卡片组件
 * 显示收入/支出/结余统计
 */
<template>
	<view class="stat-card" :class="typeClass">
		<text class="title">{{ title }}</text>
		<text class="amount">{{ displayAmount }}</text>
		<text v-if="compareText" class="compare">{{ compareText }}</text>
	</view>
</template>

<script>
export default {
	name: 'StatCard',
	props: {
		title: {
			type: String,
			default: ''
		},
		amount: {
			type: Number,
			default: 0
		},
		type: {
			type: String,
			default: 'expense' // expense | income | balance
		},
		compareText: {
			type: String,
			default: ''
		}
	},
	computed: {
		typeClass() {
			return `type-${this.type}`
		},
		displayAmount() {
			return this.amount.toFixed(2)
		}
	}
}
</script>

<style scoped>
.stat-card {
	padding: 20rpx;
	border-radius: 12rpx;
	background-color: #ffffff;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.title {
	font-size: 28rpx;
	color: #666;
}

.amount {
	font-size: 40rpx;
	font-weight: bold;
	display: block;
	margin-top: 10rpx;
}

.compare {
	font-size: 24rpx;
	color: #999;
	display: block;
	margin-top: 5rpx;
}

.type-expense .amount {
	color: #dd524d;
}

.type-income .amount {
	color: #4cd964;
}

.type-balance .amount {
	color: #007AFF;
}
</style>