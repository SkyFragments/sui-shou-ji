/**
 * 折线图组件
 * 显示日支出趋势
 *
 * 实现：<canvas> + uni.createCanvasContext 2D 绘制。
 * 不用 SVG（微信小程序不渲染内联 svg），
 * 不用纯 CSS 旋转线段（viewBox 与容器非正方形时角度会失真）。
 */
<template>
	<view class="line-chart">
		<view class="chart-header">
			<text class="title">{{ title }}</text>
		</view>
		<view class="chart-container">
			<view class="line-canvas" :style="canvasWrapStyle">
				<canvas class="real-canvas" :canvas-id="canvasId" :id="canvasId" :style="canvasStyle" @touchstart="onTouch"></canvas>
				<!-- 数据点 + 触摸提示 -->
				<template v-for="(p, i) in points" :key="'p-' + i">
					<view class="point" :style="getPointStyle(p)">
						<view class="dot"></view>
					</view>
				</template>
				<view v-if="hoverInfo.visible" class="tooltip" :style="hoverInfo.style">
					<text class="tooltip-day">{{ hoverInfo.day }}</text>
					<text class="tooltip-val">¥{{ hoverInfo.value }}</text>
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
	data() {
		return {
			canvasId: 'line-chart-' + (++__chartUid),
			canvasW: 0,
			canvasH: 0,
			touchIndex: -1,
			hover: { visible: false, day: '', value: '', style: {} }
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
		canvasWrapStyle() {
			return { position: 'relative' }
		},
		canvasStyle() {
			return {
				width: this.canvasW + 'px',
				height: this.canvasH + 'px'
			}
		},
		hoverInfo() {
			return this.hover
		}
	},
	watch: {
		data: {
			handler() {
				this.$nextTick(() => this.measureAndDraw())
			},
			deep: true
		}
	},
	mounted() {
		this.$nextTick(() => this.measureAndDraw())
	},
	methods: {
		measureAndDraw() {
			const query = uni.createSelectorQuery().in(this)
			query.select('.line-canvas').boundingClientRect(rect => {
				if (!rect || !rect.width) {
					// 容器未就绪，再来一次
					setTimeout(() => this.measureAndDraw(), 50)
					return
				}
				this.canvasW = Math.floor(rect.width)
				this.canvasH = Math.floor(rect.height)
				this.$nextTick(() => this.drawLine())
			}).exec()
		},
		drawLine() {
			if (this.canvasW === 0 || this.canvasH === 0) return
			const ctx = uni.createCanvasContext(this.canvasId, this)
			const W = this.canvasW
			const H = this.canvasH
			const padX = 8
			const padTop = 8
			const padBottom = 4
			const innerW = W - padX * 2
			const innerH = H - padTop - padBottom

			// 背景
			ctx.setFillStyle('#ffffff')
			ctx.fillRect(0, 0, W, H)

			const pts = this.points
			if (pts.length < 2) {
				ctx.draw()
				return
			}

			// 计算每点像素坐标
			const px = (p) => padX + (p.x / 100) * innerW
			const py = (p) => padTop + (p.y / 100) * innerH

			// 渐变填充（线下面积）
			const grad = ctx.createLinearGradient ? ctx.createLinearGradient(0, padTop, 0, padTop + innerH) : null
			if (grad) {
				grad.addColorStop(0, 'rgba(7, 193, 96, 0.28)')
				grad.addColorStop(1, 'rgba(7, 193, 96, 0)')
			}
			ctx.setFillStyle(grad || 'rgba(7, 193, 96, 0.18)')

			ctx.beginPath()
			ctx.moveTo(px(pts[0]), padTop + innerH)
			for (const p of pts) {
				ctx.lineTo(px(p), py(p))
			}
			ctx.lineTo(px(pts[pts.length - 1]), padTop + innerH)
			ctx.closePath()
			ctx.fill()

			// 折线
			ctx.setStrokeStyle('#07c160')
			ctx.setLineWidth(2)
			ctx.setLineCap('round')
			ctx.setLineJoin('round')
			ctx.beginPath()
			ctx.moveTo(px(pts[0]), py(pts[0]))
			for (let i = 1; i < pts.length; i++) {
				ctx.lineTo(px(pts[i]), py(pts[i]))
			}
			ctx.stroke()

			ctx.draw()
		},
		getPointStyle(p) {
			// 等 canvas 画好后，圆点叠在折线上做装饰
			const W = this.canvasW
			const H = this.canvasH
			if (!W || !H) return { display: 'none' }
			const padX = 8
			const padTop = 8
			const padBottom = 4
			const innerW = W - padX * 2
			const innerH = H - padTop - padBottom
			const x = padX + (p.x / 100) * innerW
			const y = padTop + (p.y / 100) * innerH
			return {
				left: x + 'px',
				top: y + 'px',
				width: W + 'px',
				height: H + 'px',
				pointerEvents: 'none'
			}
		},
		onTouch(e) {
			// 简易触摸：找最近的点显示 tooltip
			if (this.points.length === 0) return
			const touch = (e.touches && e.touches[0]) || e.changedTouches && e.changedTouches[0]
			if (!touch) return
			const tx = touch.x
			const W = this.canvasW
			const padX = 8
			const innerW = W - padX * 2
			// 反推最近 index
			let best = 0
			let bestDist = Infinity
			for (let i = 0; i < this.points.length; i++) {
				const px = padX + (this.points[i].x / 100) * innerW
				const d = Math.abs(px - tx)
				if (d < bestDist) { bestDist = d; best = i }
			}
			const p = this.points[best]
			const val = (this.data[best] || 0).toFixed(2)
			const dayLabel = this.xLabels[best] || `${best + 1}日`
			const tipX = padX + (p.x / 100) * innerW
			const tipY = 8 + (p.y / 100) * (this.canvasH - 12)
			this.hover = {
				visible: true,
				day: dayLabel,
				value: val,
				style: {
					left: tipX + 'px',
					top: (tipY - 12) + 'px',
					transform: 'translate(-50%, -100%)'
				}
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

.real-canvas {
	position: absolute;
	left: 0;
	top: 0;
}

.point {
	position: absolute;
	pointer-events: none;
	transform: translate(-50%, -50%);
}

.dot {
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background-color: #ffffff;
	border: 4rpx solid #07c160;
	box-sizing: border-box;
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
	padding: 10rpx 20rpx 0;
}

.x-label {
	font-size: 28rpx;
	color: #666666;
}
</style>
