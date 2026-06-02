/**
 * 饼图组件
 * 显示分类支出占比，支持触摸旋转 + 点击 spin + 边缘标签 + 小切块合并
 */
<template>
	<view class="pie-chart">
		<view class="chart-container">
			<view
				class="pie-rotator"
				:style="rotatorStyle"
				@touchstart="onTouchStart"
				@touchmove.stop.prevent="onTouchMove"
				@touchend="onTouchEnd"
			>
				<view class="pie" :style="pieStyle">
					<view class="pie-inner"></view>
				</view>
				<view
					v-for="slice in slices"
					:key="'lead-' + slice.code"
					class="leader"
					:style="getLeaderStyle(slice)"
				></view>
				<view
					v-for="slice in slices"
					:key="'lbl-' + slice.code"
					class="slice-label"
					:style="getLabelPosition(slice)"
				>
					<text class="label-percent">{{ slice.percentage }}%</text>
				</view>
			</view>
		</view>
		<view class="legend">
			<view
				v-for="item in legendItems"
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
const OTHER_THRESHOLD = 5       // <5% 切块合并
const TAP_THRESHOLD_PX = 8      // 移动 <8px 视为 tap
const SPIN_EXTRA_TURNS = 2      // spin 多转几圈做效果
const MOMENTUM_DECAY = 0.94     // 惯性衰减
const MOMENTUM_MIN = 0.3        // 惯性截止速度 (deg/frame)
const SPIN_DURATION_MS = 900    // spin 动画时长
const PIE_SIZE = 300
const ROTATOR_SIZE = 600
const PIE_RADIUS = PIE_SIZE / 2
const LABEL_R = 200             // label 距中心
const LEADER_INNER = PIE_RADIUS + 4
const LEADER_OUTER = LABEL_R - 8

export default {
	name: 'PieChart',
	props: {
		data: {
			type: Array,
			default: () => []
		}
	},
	data() {
		return {
			rotation: 0,
			dragging: false,
			didDrag: false,
			touchStart: null,
			lastTouchAngle: 0,
			lastTouchTime: 0,
			angularVelocity: 0,
			pieCenter: null,
			pieRadius: 0,
			momentumRaf: null,
			spinning: false
		}
	},
	computed: {
		totalAmount() {
			return this.data.reduce((s, i) => s + i.value, 0)
		},
		// 合并 <5% 切块为"其他"
		processedData() {
			const total = this.totalAmount
			if (total === 0) return []
			const big = []
			let otherSum = 0
			this.data.forEach(item => {
				const pct = (item.value / total) * 100
				if (pct < OTHER_THRESHOLD) {
					otherSum += item.value
				} else {
					big.push(item)
				}
			})
			if (otherSum > 0) {
				big.push({
					code: '__other__',
					name: '其他',
					value: otherSum,
					color: '#cccccc'
				})
			}
			return big
		},
		pieStyle() {
			const data = this.processedData
			if (data.length === 0) return { background: '#f0f0f0' }
			const total = data.reduce((s, i) => s + i.value, 0)
			const gradient = []
			let cur = 0
			data.forEach(item => {
				const color = item.color || '#07c160'
				const pct = total > 0 ? (item.value / total) * 100 : 0
				gradient.push(`${color} ${cur}% ${cur + pct}%`)
				cur += pct
			})
			if (cur < 100) gradient.push(`#f0f0f0 ${cur}% 100%`)
			return { background: `conic-gradient(${gradient.join(', ')})` }
		},
		// 每个切块的起止角度 + 中线角度，用于标签定位
		slices() {
			const data = this.processedData
			const total = data.reduce((s, i) => s + i.value, 0)
			if (total === 0) return []
			const result = []
			let cur = 0
			data.forEach(item => {
				const pct = (item.value / total) * 100
				const startAngle = (cur / 100) * 360
				const endAngle = ((cur + pct) / 100) * 360
				result.push({
					...item,
					percentage: pct.toFixed(1),
					startAngle,
					endAngle,
					midAngle: (startAngle + endAngle) / 2
				})
				cur += pct
			})
			return result
		},
		legendItems() {
			return this.slices
		},
		rotatorStyle() {
			let transition = 'none'
			if (this.spinning) {
				transition = `transform ${SPIN_DURATION_MS}ms cubic-bezier(0.17, 0.67, 0.21, 0.99)`
			}
			return {
				transform: `rotate(${this.rotation}deg)`,
				transition
			}
		}
	},
	mounted() {
		this.$nextTick(() => this.updatePieRect())
	},
	methods: {
		onLegendClick(item) {
			this.$emit('legend-click', item)
		},
		getRect(selector) {
			return new Promise(resolve => {
				try {
					const query = uni.createSelectorQuery().in(this)
					query.select(selector).boundingClientRect(resolve).exec()
				} catch (e) {
					resolve(null)
				}
			})
		},
		async updatePieRect() {
			const rect = await this.getRect('.pie')
			if (rect) {
				this.pieCenter = {
					x: rect.left + rect.width / 2,
					y: rect.top + rect.height / 2
				}
				this.pieRadius = rect.width / 2
			}
		},
		// label 中心位于 midAngle 方向 LABEL_R 处
		getLabelPosition(slice) {
			const rad = (slice.midAngle * Math.PI) / 180
			const cx = ROTATOR_SIZE / 2
			const cy = ROTATOR_SIZE / 2
			const x = cx + LABEL_R * Math.sin(rad)
			const y = cy - LABEL_R * Math.cos(rad)
			// 反向旋转抵消父 rotator 旋转，让文字在 pie 转动时保持正立
			const counter = -this.rotation
			return {
				left: `${x}rpx`,
				top: `${y}rpx`,
				transform: `translate(-50%, -50%) rotate(${counter}deg)`
			}
		},
		// leader 从 pie 边缘向外延伸到 label 前
		getLeaderStyle(slice) {
			const rad = (slice.midAngle * Math.PI) / 180
			const cx = ROTATOR_SIZE / 2
			const cy = ROTATOR_SIZE / 2
			const x = cx + LEADER_INNER * Math.sin(rad) - 1  // -1 居中 2rpx 线
			const y = cy - LEADER_INNER * Math.cos(rad)
			return {
				left: `${x}rpx`,
				top: `${y}rpx`,
				height: `${LEADER_OUTER - LEADER_INNER}rpx`,
				transform: `rotate(${slice.midAngle - 180}deg)`
			}
		},
		onTouchStart(e) {
			if (e.touches.length === 0) return
			this.cancelMomentum()
			this.spinning = false
			this.dragging = true
			this.didDrag = false
			this.angularVelocity = 0
			const t = e.touches[0]
			this.touchStart = { x: t.pageX, y: t.pageY }
			this.lastTouchAngle = this.angleFromCenter(t.pageX, t.pageY)
			this.lastTouchTime = Date.now()
		},
		onTouchMove(e) {
			if (!this.dragging || e.touches.length === 0) return
			const t = e.touches[0]
			if (this.touchStart) {
				const dx = t.pageX - this.touchStart.x
				const dy = t.pageY - this.touchStart.y
				if (Math.sqrt(dx * dx + dy * dy) > TAP_THRESHOLD_PX) {
					this.didDrag = true
				}
			}
			const angle = this.angleFromCenter(t.pageX, t.pageY)
			let delta = angle - this.lastTouchAngle
			// 跨 -180/180 边界修正
			if (delta > 180) delta -= 360
			if (delta <= -180) delta += 360
			this.rotation += delta
			const now = Date.now()
			const dt = Math.max(now - this.lastTouchTime, 1)
			this.angularVelocity = (delta / dt) * 16  // deg/frame
			this.lastTouchAngle = angle
			this.lastTouchTime = now
		},
		onTouchEnd() {
			this.dragging = false
			if (this.didDrag) {
				this.startMomentum()
			} else {
				// tap → spin to slice
				this.handleTap()
			}
		},
		handleTap() {
			if (!this.touchStart || !this.pieCenter) return
			const dx = this.touchStart.x - this.pieCenter.x
			const dy = this.touchStart.y - this.pieCenter.y
			if (Math.sqrt(dx * dx + dy * dy) > this.pieRadius) return  // tap outside pie
			// touchStart 角度 → conic 局部角度 (考虑当前 rotation)
			const tapAngle = Math.atan2(dy, dx) * 180 / Math.PI
			const localConic = (((tapAngle + 90) - this.rotation) % 360 + 360) % 360
			const slice = this.slices.find(
				s => localConic >= s.startAngle && localConic < s.endAngle
			)
			if (slice) this.spinToSlice(slice)
		},
		// 把指定切块旋到顶部
		spinToSlice(slice) {
			// 当前: slice midAngle 在屏幕 conic 位置 (midAngle + rotation) mod 360
			// 目标: 屏幕 conic 0 (即顶部)
			// 求解: newRotation = -midAngle mod 360
			const target = ((360 - slice.midAngle) % 360 + 360) % 360
			let delta = target - this.rotation
			delta = ((delta % 360) + 360) % 360
			delta += 360 * SPIN_EXTRA_TURNS
			this.spinning = true
			this.rotation += delta
			clearTimeout(this._spinTimer)
			this._spinTimer = setTimeout(() => {
				this.spinning = false
			}, SPIN_DURATION_MS)
		},
		startMomentum() {
			if (Math.abs(this.angularVelocity) < MOMENTUM_MIN) return
			const tick = () => {
				this.rotation += this.angularVelocity
				this.angularVelocity *= MOMENTUM_DECAY
				if (Math.abs(this.angularVelocity) >= MOMENTUM_MIN) {
					this.momentumRaf = setTimeout(tick, 16)
				} else {
					this.momentumRaf = null
				}
			}
			this.momentumRaf = setTimeout(tick, 16)
		},
		cancelMomentum() {
			if (this.momentumRaf) {
				clearTimeout(this.momentumRaf)
				this.momentumRaf = null
			}
		},
		angleFromCenter(x, y) {
			if (!this.pieCenter) return 0
			return Math.atan2(y - this.pieCenter.y, x - this.pieCenter.x) * 180 / Math.PI
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
	overflow: visible;
}

.pie-rotator {
	position: relative;
	width: 600rpx;
	height: 600rpx;
	margin: 0 auto;
}

.pie {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 300rpx;
	height: 300rpx;
	border-radius: 50%;
}

.pie-inner {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 70%;
	height: 70%;
	border-radius: 50%;
	background-color: var(--color-surface);
}

.leader {
	position: absolute;
	width: 2rpx;
	background: #cccccc;
	transform-origin: 50% 0%;
	pointer-events: none;
}

.slice-label {
	position: absolute;
	text-align: center;
	pointer-events: none;
	white-space: nowrap;
}

.label-percent {
	font-size: 22rpx;
	color: #666666;
	font-weight: 500;
}

.legend {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	padding: 0 20rpx;
}

.legend-item {
	width: 50%;
	display: flex;
	flex-direction: row;
	align-items: center;
	padding: 12rpx 0;
	gap: 12rpx;
}

.legend-color {
	width: 30rpx;
	height: 30rpx;
	border-radius: 50%;
	margin-bottom: 5rpx;
}

.legend-name {
	font-size: 26rpx;
	color: var(--color-text-secondary);
}

.legend-value {
	font-size: 28rpx;
	color: var(--color-text-secondary);
}
</style>
