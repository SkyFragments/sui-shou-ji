/**
 * 账单项组件
 * 显示单条账单详情
 */
<template>
	<view class="bill-item" @click="onClick">
		<view class="left">
			<view class="icon" :style="{ backgroundColor: categoryColor }">
				<text>{{ categoryIcon }}</text>
			</view>
			<view class="info">
				<text class="category">{{ categoryName }}</text>
				<text v-if="remark" class="remark">{{ remark }}</text>
			</view>
		</view>
		<view class="right">
			<text class="amount" :class="amountClass">{{ displayAmount }}</text>
			<text class="time">{{ time }}</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'BillItem',
	props: {
		type: {
			type: Number,
			default: 1 // 1=支出, 2=收入
		},
		amount: {
			type: Number,
			default: 0
		},
		categoryName: {
			type: String,
			default: ''
		},
		categoryIcon: {
			type: String,
			default: '📦'
		},
		categoryColor: {
			type: String,
			default: '#C9B1FF'
		},
		remark: {
			type: String,
			default: ''
		},
		time: {
			type: String,
			default: ''
		}
	},
	computed: {
		displayAmount() {
			const prefix = this.type === 1 ? '-' : '+'
			return `${prefix}${this.amount.toFixed(2)}`
		},
		amountClass() {
			return this.type === 1 ? 'expense' : 'income'
		}
	},
	methods: {
		onClick() {
			this.$emit('click')
		}
	}
}
</script>

<style scoped>
.bill-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	background-color: var(--color-surface);
	border-bottom: 1rpx solid var(--color-border);
}

.left {
	display: flex;
	align-items: center;
}

.icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
}

.info {
	margin-left: 20rpx;
}

.category {
	font-size: 28rpx;
	color: var(--color-text-primary);
	display: block;
}

.remark {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	display: block;
	margin-top: 5rpx;
}

.right {
	text-align: right;
}

.amount {
	font-size: 32rpx;
	font-weight: bold;
	display: block;
}

.amount.expense {
	color: var(--color-expense);
}

.amount.income {
	color: var(--color-income);
}

.time {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	display: block;
	margin-top: 5rpx;
}
</style>