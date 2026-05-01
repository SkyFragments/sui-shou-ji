/**
 * 金额键盘组件
 * 4x4 键盘布局：1-9、数字点、0、删除键
 */
<template>
	<view class="amount-keyboard">
		<view class="keyboard-row">
			<view class="key" @click="onInput('1')">1</view>
			<view class="key" @click="onInput('2')">2</view>
			<view class="key" @click="onInput('3')">3</view>
			<view class="key key-delete" @click="onDelete">
				<text class="icon">⌫</text>
			</view>
		</view>
		<view class="keyboard-row">
			<view class="key" @click="onInput('4')">4</view>
			<view class="key" @click="onInput('5')">5</view>
			<view class="key" @click="onInput('6')">6</view>
			<view class="key key-empty"></view>
		</view>
		<view class="keyboard-row">
			<view class="key" @click="onInput('7')">7</view>
			<view class="key" @click="onInput('8')">8</view>
			<view class="key" @click="onInput('9')">9</view>
			<view class="key key-empty"></view>
		</view>
		<view class="keyboard-row">
			<view class="key" @click="onInput('.')">.</view>
			<view class="key" @click="onInput('0')">0</view>
			<view class="key key-empty"></view>
			<view class="key key-empty"></view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'AmountKeyboard',
	methods: {
		onInput(value) {
			this.$emit('input', value)
		},
		onDelete() {
			this.$emit('delete')
		}
	}
}
</script>

<style scoped>
.amount-keyboard {
	padding: 10rpx;
	background-color: #f5f5f5;
}

.keyboard-row {
	display: flex;
	justify-content: space-between;
	margin-bottom: 10rpx;
}

.key {
	width: 23%;
	height: 80rpx;
	line-height: 80rpx;
	text-align: center;
	background-color: #ffffff;
	border-radius: 8rpx;
	font-size: 36rpx;
}

.key-delete {
	background-color: #f0f0f0;
}

.key-empty {
	background-color: transparent;
}
</style>