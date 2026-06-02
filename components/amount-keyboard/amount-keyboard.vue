/**
 * 金额键盘组件
 * 4x4 键盘布局：1-9、数字点、0、删除键
 * 支持小数点输入，最多2位小数
 * 支持最大金额 999,999.99
 */
<template>
	<view class="amount-keyboard">
		<view class="keyboard-row">
			<view class="key" @click="onInput('1')">1</view>
			<view class="key" @click="onInput('2')">2</view>
			<view class="key" @click="onInput('3')">3</view>
			<view class="key key-action" @click="onDelete">
				<text class="icon">⌫</text>
			</view>
		</view>
		<view class="keyboard-row">
			<view class="key" @click="onInput('4')">4</view>
			<view class="key" @click="onInput('5')">5</view>
			<view class="key" @click="onInput('6')">6</view>
			<view class="key key-action key-clear" @click="onClear">
				<text>清空</text>
			</view>
		</view>
		<view class="keyboard-row">
			<view class="key" @click="onInput('7')">7</view>
			<view class="key" @click="onInput('8')">8</view>
			<view class="key" @click="onInput('9')">9</view>
			<view class="key key-action key-confirm" @click="onConfirm">
				<text>确定</text>
			</view>
		</view>
		<view class="keyboard-row">
			<view class="key" @click="onInput('.')">.</view>
			<view class="key" @click="onInput('0')">0</view>
			<view class="key key-double" @click="onInput('00')">00</view>
			<view class="key key-action">
				<text class="icon">+</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'AmountKeyboard',
	emits: ['onInput', 'onDelete', 'onClear', 'onConfirm'],
	setup(props, { emit }) {
		const onInput = (value) => {
			emit('onInput', value)
		}

		const onDelete = () => {
			emit('onDelete')
		}

		const onClear = () => {
			emit('onClear')
		}

		const onConfirm = () => {
			emit('onConfirm')
		}

		return {
			onInput,
			onDelete,
			onClear,
			onConfirm
		}
	}
}
</script>

<style scoped>
.amount-keyboard {
	padding: 12rpx;
	background-color: #FDF4E9;
	border-radius: 16rpx;
}

.keyboard-row {
	display: flex;
	justify-content: space-between;
	margin-bottom: 8rpx;
}

.key {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	background-color: #ffffff;
	border-radius: 12rpx;
	font-size: 48rpx;
	color: #333333;
	margin: 0 4rpx;
	box-shadow: 0 2rpx 4rpx rgba(0, 0, 0, 0.05);
	transition: background-color 0.1s, transform 0.1s;
}

.key:active {
	background-color: #f0f0f0;
	transform: scale(0.96);
}

.key-action {
	background-color: #f0f0f0;
	color: #666666;
}

.key-action:active {
	background-color: #666666;
}

.key-clear {
	color: #ff9500;
}

.key-confirm {
	background-color: #07c160;
	color: #ffffff;
}

.key-confirm:active {
	background-color: #07c160;
	opacity: 0.85;
}

.key-double {
	font-size: 44rpx;
}

.icon {
	font-size: 44rpx;
}
</style>