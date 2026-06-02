/**
 * 折线图组件
 * 显示日支出趋势
 *
 * 实现：纯 CSS 折线。每段 = 绝对定位 div + transform: rotate()；
 * 不用 SVG，因为微信小程序不渲染内联 svg 标签。
 */
<template>
	<view class="line-chart">
		<view class="chart-header">
			<text class="title">{{ title }}</text>
		</view>
		<view class="chart-container">
			<view class="line-canvas">
				<view
					v-for="(seg, i) in segments"
					:key="'seg-' + i"
					class="line-seg"
					:style="seg.style"
				></view>
				<view
					v-for="(p, i) in points"
					:key="'p-' + i"
					class="point"
					:style="getPointStyle(p)"
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
		},
		segments() {
			const pts = this.points
			const segs = []
			for (let i = 0; i < pts.length - 1; i++) {
				const a = pts[i]
				const b = pts[i + 1]
				const dx = b.x - a.x
				const dy = b.y - a.y
				// 长度按 x 方向百分比近似（容器宽高比在小屏接近 16:9~3:1，
				// 主要段几乎水平；倾斜段视觉差可接受）。
				const length = Math.abs(dx)
				const angle = Math.atan2(dy, dx) * 180 / Math.PI
				segs.push({
					style: {
						left: a.x + '%',
						top: a.y + '%',
						width: length + '%',
						transform: `rotate(${angle}deg)`,
						transformOrigin: '0 50%'
					}
				})
			}
			return segs
		}
	},
	methods: {
		getPointStyle(p) {
			return {
				left: p.x + '%',
				top: p.y + '%'
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

.line-seg {
	position: absolute;
	height: 4rpx;
	background-color: #07c160;
	border-radius: 2rpx;
	transform-origin: 0 50%;
	pointer-events: none;
}

.point {
	position: absolute;
	transform: translate(-50%, -50%);
	width: 16rpx;
	height: 16rpx;
}

.dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background-color: #07c160;
	border: 2rpx solid #ffffff;
	box-sizing: border-box;
}

.x-axis {
	display: flex;
	justify-content: space-between;
	padding: 10rpx 20rpx 0;
}

.x-label {
	font-size: 28rpx;
	color: #666666;
}
</style>
