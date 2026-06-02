<template>
	<view class="line-chart">
		<view class="chart-header">
			<text class="title">{{ title }}</text>
		</view>
		<view class="chart-body" @touchstart="onTouch">
			<view class="chart-area">
				<view v-for="(p, i) in points" :key="i" class="bar-wrap" :style="p.wrap">
					<view class="bar" :style="p.bar"></view>
				</view>
				<view v-for="(p, i) in points" :key="'d' + i" class="dot" :style="p.dot"></view>
				<view v-for="(p, i) in points" :key="'l' + i" class="link" :style="p.link"></view>
				<view v-if="hover.visible" class="tooltip" :style="hover.style">
					<text class="tooltip-day">{{ hover.day }}</text>
					<text class="tooltip-val">¥{{ hover.value }}</text>
				</view>
			</view>
			<view class="x-axis">
				<text v-for="label in xLabels" :key="label" class="x-label">{{ label }}</text>
			</view>
		</view>
	</view>
</template>

<script>
let __chartUid = 0

export default {
	name: 'LineChart',
	props: {
		title: { type: String, default: '支出趋势' },
		data: { type: Array, default: () => [] },
		xLabels: { type: Array, default: () => [] }
	},
	data() {
		return {
			uid: 'line-chart-' + (++__chartUid),
			hover: { visible: false, day: '', value: '', style: {} }
		}
	},
	computed: {
		points() {
			if (this.data.length === 0) return []
			const max = Math.max(...this.data, 1)
			const n = this.data.length
			const slot = 100 / Math.max(n - 1, 1)
			return this.data.map((value, i) => {
				const xPct = i * slot
				const yPct = 100 - (value / max) * 80 - 10
				return {
					value,
					wrap: { left: (xPct - slot / 2) + '%', width: slot + '%' },
					bar: { height: (100 - yPct) + '%' },
					dot: { left: xPct + '%', top: yPct + '%' },
					link: i < n - 1
						? { left: xPct + '%', top: yPct + '%', width: slot + '%', transform: 'rotate(' + Math.atan2(this.data[i + 1] / Math.max(...this.data, 1) * 80 - value / max * 80, slot) * 180 / Math.PI + 'deg)' }
						: null
				}
			})
		}
	},
	methods: {
		onTouch(e) {
			const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0])
			if (!touch || !this.points.length) return
			const query = uni.createSelectorQuery().in(this)
			query.select('.chart-area').boundingClientRect(rect => {
				if (!rect) return
				const tx = touch.x - rect.left
				const innerW = rect.width * 0.88
				const padX = rect.width * 0.06
				const relX = (tx - padX) / innerW * 100
				let best = 0, bestDist = Infinity
				for (let i = 0; i < this.points.length; i++) {
					const d = Math.abs(this.points[i].dot.left.replace('%', '') * 1 - relX)
					if (d < bestDist) { bestDist = d; best = i }
				}
				const p = this.points[best]
				const val = (this.data[best] || 0).toFixed(2)
				const day = this.xLabels[best] || (best + 1) + '日'
				this.hover = {
					visible: true,
					day,
					value: val,
					style: { left: p.dot.left, top: p.dot.top, transform: 'translate(-50%, -100%)' }
				}
			}).exec()
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
	margin-bottom: 16rpx;
}
.title {
	font-size: 34rpx;
	color: #333333;
	font-weight: bold;
}
.chart-body {
	position: relative;
}
.chart-area {
	position: relative;
	height: 240rpx;
	margin: 0 20rpx 20rpx;
	border-left: 1rpx solid #f0f0f0;
	border-bottom: 1rpx solid #f0f0f0;
}
.bar-wrap {
	position: absolute;
	bottom: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	justify-content: flex-end;
}
.bar {
	width: 60%;
	margin: 0 auto;
	background: linear-gradient(to top, rgba(7, 193, 96, 0.18), rgba(7, 193, 96, 0.55));
	border-radius: 4rpx;
}
.dot {
	position: absolute;
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	background-color: #ffffff;
	border: 4rpx solid #07c160;
	transform: translate(-50%, -50%);
	box-sizing: border-box;
	z-index: 2;
	pointer-events: none;
}
.link {
	position: absolute;
	height: 2rpx;
	background: #07c160;
	transform-origin: 0 0;
	z-index: 1;
	pointer-events: none;
}
.tooltip {
	position: absolute;
	background: rgba(50, 50, 50, 0.85);
	color: #fff;
	padding: 6rpx 14rpx;
	border-radius: 8rpx;
	font-size: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	white-space: nowrap;
	pointer-events: none;
	z-index: 10;
}
.tooltip-day {
	font-size: 22rpx;
	opacity: 0.85;
}
.tooltip-val {
	font-size: 26rpx;
	font-weight: bold;
}
.x-axis {
	display: flex;
	justify-content: space-between;
	padding: 0 20rpx;
}
.x-label {
	font-size: 28rpx;
	color: #666666;
}
</style>
