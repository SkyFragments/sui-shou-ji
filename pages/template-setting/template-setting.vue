/**
 * 快捷记账设置页
 * 增删改首页快捷记账模板（类型 + 金额 + 图标 + 颜色 + 分类 + 排序）
 */
<template>
	<view class="template-setting-page">
		<!-- 顶部安全区占位（兼容小程序/低版 webview） -->
		<view class="status-bar-placeholder" :style="{ height: statusBarH + 'px' }"></view>

		<!-- 自定义导航栏 -->
		<view class="nav-bar" :style="{ paddingTop: (statusBarH + 24) + 'px' }">
			<view class="nav-back" @click="goBack" aria-label="返回">
				<image src="/static/icon/icon-arrow-left.svg" class="nav-back-icon" />
			</view>
			<text class="nav-title">快捷记账设置</text>
			<view class="nav-action" @click="openAdd">
				<text class="nav-action-text">新增</text>
			</view>
		</view>

		<!-- 说明 -->
		<view class="hint-bar">
			<text class="hint-text">首页快捷记账区域显示前 {{ visibleLimit }} 个；上移/下移调整顺序</text>
		</view>

		<!-- 模板列表 -->
		<view class="template-list" v-if="templates.length > 0">
			<view
				class="template-row"
				v-for="(tpl, idx) in templates"
				:key="tpl.id"
				:class="{ 'is-visible': idx < visibleLimit }"
			>
				<view class="row-icon" :style="{ backgroundColor: tpl.color }">
					<image :src="`/static/icon/icon-${tpl.icon}.svg`" class="row-icon-svg" />
				</view>
				<view class="row-info">
					<view class="row-line-1">
						<text class="row-name">{{ tpl.name }}</text>
						<text class="row-badge" :class="tpl.type === 1 ? 'badge-expense' : 'badge-income'">
							{{ tpl.type === 1 ? '支出' : '收入' }}
						</text>
						<text class="row-visible-flag" v-if="idx < visibleLimit">首页</text>
					</view>
					<view class="row-line-2">
						<text class="row-amount" :class="tpl.type === 1 ? 'text-expense' : 'text-income'">
							{{ tpl.type === 1 ? '-' : '+' }}¥{{ Number(tpl.amount).toFixed(2) }}
						</text>
						<text class="row-category">{{ getCategoryName(tpl.category_code) }}</text>
					</view>
				</view>
				<view class="row-actions">
					<view class="sort-controls">
						<view class="sort-btn" @click="moveUp(tpl.id)" :class="{ disabled: idx === 0 }" aria-label="上移">
							<text>↑</text>
						</view>
						<view class="sort-btn" @click="moveDown(tpl.id)" :class="{ disabled: idx === templates.length - 1 }" aria-label="下移">
							<text>↓</text>
						</view>
					</view>
					<view class="action-controls">
						<view class="action-btn action-edit" @click="openEdit(tpl)">
							<text>编辑</text>
						</view>
						<view class="action-btn action-del" @click="confirmDelete(tpl)">
							<text>删除</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<!-- 空态 -->
		<view class="empty-state" v-else>
			<text class="empty-text">还没有快捷记账模板</text>
			<view class="empty-btn" @click="openAdd">
				<text>新建一个</text>
			</view>
		</view>

		<!-- 重置默认按钮 -->
		<view class="reset-section" v-if="templates.length > 0">
			<view class="reset-btn" @click="confirmReset">
				<text>重置为默认模板</text>
			</view>
		</view>

		<!-- 编辑/新增 Modal — 不绑 self 关闭，避免点 dim 区域误关 -->
		<view class="modal" v-if="showModal">
			<view class="modal-mask"></view>
			<view class="modal-content">
				<view class="modal-header">
					<text class="modal-title">{{ editMode === 'add' ? '新增模板' : '编辑模板' }}</text>
					<view class="modal-close" @click="closeModal">
						<text>×</text>
					</view>
				</view>

				<scroll-view class="modal-body" scroll-y>
					<!-- 名称 -->
					<view class="form-row">
						<text class="form-label">名称</text>
						<input
							class="form-input"
							v-model="form.name"
							placeholder="如：早餐 / 工资"
							maxlength="10"
						/>
					</view>

					<!-- 金额 -->
					<view class="form-row">
						<text class="form-label">金额</text>
						<input
							class="form-input"
							v-model="form.amount"
							type="digit"
							placeholder="0.00"
						/>
					</view>

					<!-- 类型 -->
					<view class="form-row">
						<text class="form-label">类型</text>
						<view class="type-selector">
							<view
								class="type-btn"
								:class="{ active: form.type === 1 }"
								@click="form.type = 1"
							>
								<text>支出</text>
							</view>
							<view
								class="type-btn"
								:class="{ active: form.type === 2 }"
								@click="form.type = 2"
							>
								<text>收入</text>
							</view>
						</view>
					</view>

					<!-- 分类（按当前 type 过滤） -->
					<view class="form-section">
						<text class="form-label-block">分类</text>
						<view class="category-grid">
							<view
								class="category-cell"
								v-for="cat in filteredCategories"
								:key="cat.code"
								:class="{ selected: form.category_code === cat.code }"
								@click="selectCategory(cat)"
							>
								<view class="cat-icon" :style="{ backgroundColor: cat.color }">
									<image :src="`/static/icon/icon-${cat.icon}.svg`" class="cat-icon-svg" />
								</view>
								<text class="cat-name">{{ cat.name }}</text>
							</view>
						</view>
					</view>

					<!-- 图标选择 -->
					<view class="form-section">
						<text class="form-label-block">图标</text>
						<view class="icon-grid">
							<view
								class="icon-cell"
								v-for="ic in iconPool"
								:key="ic"
								:class="{ selected: form.icon === ic }"
								@click="form.icon = ic"
							>
								<image :src="`/static/icon/icon-${ic}.svg`" class="icon-cell-svg" />
							</view>
						</view>
					</view>

					<!-- 颜色选择 -->
					<view class="form-section">
						<text class="form-label-block">颜色</text>
						<view class="color-grid">
							<view
								class="color-cell"
								v-for="c in colorPool"
								:key="c"
								:style="{ backgroundColor: c }"
								:class="{ selected: form.color === c }"
								@click="form.color = c"
							>
								<text v-if="form.color === c" class="color-check">✓</text>
							</view>
						</view>
					</view>
				</scroll-view>

				<view class="modal-footer">
					<view class="footer-btn cancel-btn" @click="closeModal">
						<text>取消</text>
					</view>
					<view class="footer-btn confirm-btn" @click="saveTemplate">
						<text>保存</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted, reactive } from 'vue'
import { useTemplateStore } from '@/store/template'
import { useCategoryStore } from '@/store/category'
import { HOME_TEMPLATE_VISIBLE_LIMIT } from '@/utils/schema'

// 可选图标池（仅模板/分类相关的视觉资产，排除 UI 控件图标）
const ICON_POOL = [
	'meal', 'food', 'drink', 'fruit',
	'shopping', 'clothes', 'gift', 'box',
	'car', 'bus', 'travel', 'home',
	'movie', 'game', 'health', 'phone',
	'briefcase', 'wallet', 'card', 'trend'
]

// 可选颜色池（沿用 categories 设计的暖/冷/中性色阶）
const COLOR_POOL = [
	'#FF6B6B', '#FF9F43', '#FFC312', '#27AE60',
	'#4ECDC4', '#45B7D1', '#3498DB', '#5F27CD',
	'#96CEB4', '#DDA0DD', '#85C1E9', '#BB8FCE'
]

export default {
	setup() {
		const templateStore = useTemplateStore()
		const categoryStore = useCategoryStore()

		// 状态栏高度：用 JS 读 env() 在小程序不可靠
		const statusBarH = ref(20)
		try {
			const info = uni.getSystemInfoSync()
			statusBarH.value = info.statusBarHeight || 20
		} catch (e) {}

		const showModal = ref(false)
		const editMode = ref('add') // 'add' | 'edit'
		const editingId = ref(null)

		const form = reactive({
			name: '',
			amount: '',
			type: 1,
			category_code: '',
			icon: 'meal',
			color: '#FF6B6B'
		})

		onMounted(() => {
			templateStore.loadTemplates()
			categoryStore.loadCategories()
		})

		const templates = computed(() => templateStore.allTemplates)
		const visibleLimit = HOME_TEMPLATE_VISIBLE_LIMIT

		// 按当前 form.type 过滤分类
		const filteredCategories = computed(() => {
			return categoryStore.categories
				.filter(c => c.type === form.type)
				.sort((a, b) => (a.sort || 0) - (b.sort || 0))
		})

		const getCategoryName = (code) => {
			const cat = categoryStore.getCategoryByCode(code)
			return cat ? cat.name : '未分类'
		}

		const resetForm = () => {
			form.name = ''
			form.amount = ''
			form.type = 1
			form.category_code = ''
			form.icon = 'meal'
			form.color = '#FF6B6B'
		}

		const openAdd = () => {
			editMode.value = 'add'
			editingId.value = null
			resetForm()
			showModal.value = true
		}

		const openEdit = (tpl) => {
			editMode.value = 'edit'
			editingId.value = tpl.id
			form.name = tpl.name
			form.amount = String(tpl.amount)
			form.type = tpl.type || 1
			form.category_code = tpl.category_code || ''
			form.icon = tpl.icon || 'meal'
			form.color = tpl.color || '#FF6B6B'
			showModal.value = true
		}

		const closeModal = () => {
			showModal.value = false
		}

		// 切类型时清空分类选择，避免支出选中收入分类导致 quickAdd 落入错位
		const selectCategory = (cat) => {
			form.category_code = cat.code
			// 若用户未自定义 icon/color，跟随 category 默认值
			if (!form.icon || form.icon === 'meal') {
				form.icon = cat.icon || form.icon
			}
		}

		const validate = () => {
			if (!form.name.trim()) {
				uni.showToast({ title: '请填写名称', icon: 'none' })
				return false
			}
			const amt = Number(form.amount)
			if (!form.amount || isNaN(amt) || amt <= 0) {
				uni.showToast({ title: '金额需大于 0', icon: 'none' })
				return false
			}
			if (!form.category_code) {
				uni.showToast({ title: '请选择分类', icon: 'none' })
				return false
			}
			return true
		}

		const saveTemplate = () => {
			if (!validate()) return
			const payload = {
				name: form.name.trim(),
				amount: Number(form.amount),
				type: form.type,
				category_code: form.category_code,
				icon: form.icon,
				color: form.color
			}
			if (editMode.value === 'add') {
				templateStore.addTemplate(payload)
				uni.showToast({ title: '已新增', icon: 'success' })
			} else {
				templateStore.updateTemplate(editingId.value, payload)
				uni.showToast({ title: '已保存', icon: 'success' })
			}
			closeModal()
		}

		const moveUp = (id) => {
			templateStore.moveUp(id)
		}

		const moveDown = (id) => {
			templateStore.moveDown(id)
		}

		const confirmDelete = (tpl) => {
			uni.showModal({
				title: '删除模板',
				content: `确定删除「${tpl.name}」吗？`,
				success: (res) => {
					if (res.confirm) {
						templateStore.deleteTemplate(tpl.id)
						uni.showToast({ title: '已删除', icon: 'success' })
					}
				}
			})
		}

		const confirmReset = () => {
			uni.showModal({
				title: '重置默认',
				content: '当前所有模板将被默认模板覆盖，确定？',
				success: (res) => {
					if (res.confirm) {
						templateStore.resetTemplates()
						uni.showToast({ title: '已重置', icon: 'success' })
					}
				}
			})
		}

		const goBack = () => {
			uni.navigateBack()
		}

		return {
			statusBarH,
			templates,
			visibleLimit,
			iconPool: ICON_POOL,
			colorPool: COLOR_POOL,
			showModal,
			editMode,
			form,
			filteredCategories,
			getCategoryName,
			openAdd,
			openEdit,
			closeModal,
			selectCategory,
			saveTemplate,
			moveUp,
			moveDown,
			confirmDelete,
			confirmReset,
			goBack
		}
	}
}
</script>

<style scoped>
.template-setting-page {
	min-height: 100vh;
	background-color: #FDF4E9;
	padding-bottom: 60rpx;
}

/* 自定义导航 */
.nav-bar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	background-color: #07c160;
	padding: 24rpx 30rpx;
	color: #ffffff;
}

.status-bar-placeholder {
	width: 100%;
	background-color: #07c160;
}

.nav-back, .nav-action {
	min-width: 88rpx;
	display: flex;
	align-items: center;
}

.nav-action {
	justify-content: flex-end;
}

.nav-back-icon {
	width: 48rpx;
	height: 48rpx;
	filter: brightness(0) invert(1);
}

.nav-title {
	font-size: 40rpx;
	font-weight: bold;
	flex: 1;
	text-align: center;
}

.nav-action-text {
	font-size: 32rpx;
	color: #ffffff;
}

/* 说明条 */
.hint-bar {
	background-color: #FFF9F0;
	padding: 16rpx 24rpx;
	border-bottom: 1rpx solid #F0E8D8;
}

.hint-text {
	font-size: 24rpx;
	color: #A87E50;
}

/* 列表 */
.template-list {
	padding: 16rpx 20rpx;
}

.template-row {
	display: flex;
	align-items: center;
	background-color: #ffffff;
	margin-bottom: 16rpx;
	padding: 20rpx;
	border-radius: 16rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
	transition: transform 0.15s ease-out;
}

.template-row.is-visible {
	border-left: 6rpx solid #07c160;
}

.row-icon {
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
	flex-shrink: 0;
}

.row-icon-svg {
	width: 56rpx;
	height: 56rpx;
}

.row-info {
	flex: 1;
	min-width: 0;
}

.row-line-1 {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 6rpx;
}

.row-name {
	font-size: 34rpx;
	font-weight: 500;
	color: #333;
}

.row-badge {
	font-size: 22rpx;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
}

.badge-expense {
	background-color: #FDEBE7;
	color: #C85A53;
}

.badge-income {
	background-color: #E5F4EA;
	color: #3A7D5C;
}

.row-visible-flag {
	font-size: 20rpx;
	color: #07c160;
	background-color: #E5F4EA;
	padding: 2rpx 10rpx;
	border-radius: 8rpx;
}

.row-line-2 {
	display: flex;
	gap: 16rpx;
	align-items: center;
}

.row-amount {
	font-size: 32rpx;
	font-weight: 500;
	font-variant-numeric: tabular-nums;
}

.text-expense {
	color: #C85A53;
}

.text-income {
	color: #3A7D5C;
}

.row-category {
	font-size: 24rpx;
	color: #999;
}

/* 操作按钮 */
.row-actions {
	display: flex;
	align-items: center;
	gap: 12rpx;
	flex-shrink: 0;
}

/* 上下移：圆形 56rpx 图标按钮（≥ 44pt 触摸目标） */
.sort-controls {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.sort-btn {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background-color: #F5F5F5;
	color: #555;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	font-weight: bold;
	transition: background-color 0.15s ease-out;
}

.sort-btn:active {
	background-color: #E0E0E0;
}

.sort-btn.disabled {
	opacity: 0.3;
	pointer-events: none;
}

/* 编辑 / 删除：文字按钮，竖排 */
.action-controls {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.action-btn {
	font-size: 26rpx;
	padding: 0 20rpx;
	min-width: 96rpx;
	height: 56rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 12rpx;
	background-color: #F5F5F5;
	color: #555;
	transition: background-color 0.15s ease-out;
}

.action-btn:active {
	background-color: #E0E0E0;
}

.action-edit {
	background-color: #E3F2FD;
	color: #1976D2;
}

.action-edit:active {
	background-color: #BBDEFB;
}

.action-del {
	background-color: #FFEBEE;
	color: #C62828;
}

/* 空态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 120rpx 0;
}

.empty-text {
	font-size: 32rpx;
	color: #999;
	margin-bottom: 30rpx;
}

.empty-btn {
	padding: 20rpx 40rpx;
	background-color: #07c160;
	color: #ffffff;
	border-radius: 30rpx;
	font-size: 28rpx;
}

/* 重置 */
.reset-section {
	padding: 30rpx 20rpx;
}

.reset-btn {
	text-align: center;
	padding: 24rpx;
	background-color: #ffffff;
	color: #C62828;
	border-radius: 16rpx;
	font-size: 28rpx;
	transition: background-color 0.15s ease-out;
}

.reset-btn:active {
	background-color: #FDEBE7;
}

/* Modal */
.modal {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	z-index: 999;
	display: flex;
	align-items: flex-end;
	justify-content: center;
}

.modal-mask {
	position: absolute;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
	position: relative;
	width: 100%;
	max-height: 80vh;
	background-color: #ffffff;
	border-radius: 24rpx 24rpx 0 0;
	display: flex;
	flex-direction: column;
}

.modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 28rpx 30rpx;
	border-bottom: 1rpx solid #F0F0F0;
}

.modal-title {
	font-size: 34rpx;
	font-weight: bold;
	color: #333;
}

.modal-close {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	color: #999;
	line-height: 1;
}

.modal-body {
	flex: 1;
	padding: 20rpx 30rpx;
	max-height: calc(80vh - 200rpx);
}

.form-row {
	display: flex;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #F5F5F5;
}

.form-label {
	width: 140rpx;
	font-size: 30rpx;
	color: #333;
}

.form-input {
	flex: 1;
	font-size: 30rpx;
	color: #333;
}

.type-selector {
	display: flex;
	gap: 16rpx;
}

.type-btn {
	padding: 10rpx 28rpx;
	border-radius: 24rpx;
	background-color: #F5F5F5;
	color: #666;
	font-size: 26rpx;
}

.type-btn.active {
	background-color: #07c160;
	color: #ffffff;
}

.form-section {
	padding: 20rpx 0;
	border-bottom: 1rpx solid #F5F5F5;
}

.form-label-block {
	font-size: 30rpx;
	color: #333;
	display: block;
	margin-bottom: 16rpx;
}

/* 分类网格 */
.category-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.category-cell {
	width: calc(20% - 13rpx);
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 12rpx 0;
	border-radius: 12rpx;
	transition: transform 0.15s ease-out;
}

.category-cell.selected {
	background-color: #E5F4EA;
	transform: scale(1.05);
}

.cat-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cat-icon-svg {
	width: 36rpx;
	height: 36rpx;
}

.cat-name {
	font-size: 22rpx;
	color: #333;
	margin-top: 6rpx;
}

/* 图标网格 */
.icon-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.icon-cell {
	width: calc(20% - 10rpx);
	aspect-ratio: 1;
	background-color: #F5F5F5;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.15s ease-out;
}

.icon-cell.selected {
	background-color: #07c160;
	transform: scale(1.05);
}

.icon-cell-svg {
	width: 50rpx;
	height: 50rpx;
}

.icon-cell.selected .icon-cell-svg {
	filter: brightness(0) invert(1);
}

/* 颜色网格 */
.color-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 14rpx;
}

.color-cell {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: transform 0.15s ease-out;
}

.color-cell.selected {
	transform: scale(1.15);
	box-shadow: 0 0 0 4rpx rgba(7, 193, 96, 0.4);
}

.color-check {
	color: #ffffff;
	font-size: 30rpx;
	font-weight: bold;
}

/* Modal Footer */
.modal-footer {
	display: flex;
	border-top: 1rpx solid #F0F0F0;
	padding-bottom: env(safe-area-inset-bottom);
}

.footer-btn {
	flex: 1;
	text-align: center;
	padding: 28rpx;
	font-size: 32rpx;
}

.cancel-btn {
	color: #666;
	border-right: 1rpx solid #F0F0F0;
}

.confirm-btn {
	color: #07c160;
	font-weight: 500;
}
</style>
