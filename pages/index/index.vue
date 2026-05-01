<template>
	<view class="container">
		<text class="title">随手记</text>
		<text class="subtitle">个人记账小程序</text>
	</view>
</template>

<script>
export default {
	data() {
		return {
			title: '随手记',
			subtitle: '个人记账小程序'
		}
	},
	onLoad() {
		console.log('Index page loaded')
	}
}
</script>

<style scoped>
.container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx;
}

.title {
	font-size: 48rpx;
	font-weight: bold;
	color: #007AFF;
	margin-bottom: 20rpx;
}

.subtitle {
	font-size: 28rpx;
	color: #999;
}
</style>