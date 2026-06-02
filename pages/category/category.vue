/**
 * 分类管理页面
* 管理支出和收入分类
 */
<template>
	<view class="category-page">
		<!-- 类型切换 -->
		<view class="type-tabs animate-slide-up">
			<view
				class="type-tab"
				:class="{ active: currentType === 1 }"
				@click="switchType(1)"
			>
				<text>支出分类</text>
			</view>
			<view
				class="type-tab"
				:class="{ active: currentType === 2 }"
				@click="switchType(2)"
			>
				<text>收入分类</text>
			</view>
		</view>

		<!-- 分类列表 -->
		<view class="category-list animate-slide-up delay-1">
			<view
				v-for="category in filteredCategories"
				:key="category.code"
				class="category-item"
				@click="editCategory(category)"
			>
				<view class="category-icon" :style="{ backgroundColor: category.color }">
					<image :src="getIconPath(category.icon)" class="category-icon-svg" />
				</view>
				<view class="category-info">
					<text class="category-name">{{ category.name }}</text>
					<text class="category-code">{{ category.code }}</text>
				</view>
					<text class="category-arrow">></text>
			</view>

			<view class="empty-state" v-if="filteredCategories.length === 0">
				<text>暂无分类</text>
			</view>
		</view>

		<!-- 添加按钮 -->
		<view class="add-btn animate-scale-in delay-2" @click="addCategory">
			<text class="add-icon">+</text>
		</view>

		<!-- 添加/编辑弹窗 -->
		<view class="modal" v-if="showModal">
			<view class="modal-mask" @click="closeModal"></view>
			<view class="modal-content">
				<view class="modal-header">
					<text class="modal-title">{{ isEdit ? '编辑分类' : '添加分类' }}</text>
				</view>
				<view class="modal-body">
					<!-- 分类名称 -->
					<view class="form-item">
						<text class="form-label">名称</text>
						<input
							class="form-input"
							v-model="formData.name"
							placeholder="请输入分类名称"
						/>
					</view>

					<!-- 图标选择 -->
					<view class="form-item">
						<text class="form-label">图标</text>
						<view class="icon-grid">
							<view
								v-for="icon in iconOptions"
								:key="icon"
								class="icon-item"
								:class="{ selected: formData.icon === icon }"
								@click="selectIcon(icon)"
							>
								<image :src="getIconPath(icon)" class="icon-option-svg" />
							</view>
						</view>
					</view>

					<!-- 颜色选择 -->
					<view class="form-item">
						<text class="form-label">颜色</text>
						<view class="color-grid">
							<view
								v-for="color in colorOptions"
								:key="color"
								class="color-item"
								:class="{ selected: formData.color === color }"
								:style="{ backgroundColor: color }"
								@click="selectColor(color)"
							>
							<text v-if="formData.color === color" class="color-check">✓</text>
							</view>
						</view>
					</view>
				</view>
				<view class="modal-footer">
					<view class="btn cancel-btn" @click="closeModal">
						<text>取消</text>
					</view>
					<view class="btn danger-btn" @click="deleteCategory" v-if="isEdit">
						<text>删除</text>
					</view>
					<view class="btn confirm-btn" @click="saveCategory">
						<text>保存</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部导航 -->
		<view class="tabbar">
			<view class="tab-item" @click="goToIndex">
				<image src="/static/icon/icon-home.svg" class="tab-icon" />
				<text>首页</text>
			</view>
			<view class="tab-item" @click="goToRecords">
				<image src="/static/icon/icon-folder.svg" class="tab-icon" />
				<text>账单</text>
			</view>
			<view class="tab-item add-tab" @click="goToAdd">
				<image src="/static/icon/icon-wallet.svg" class="add-tab-icon-svg" />
			</view>
			<view class="tab-item" @click="goToStats">
				<image src="/static/icon/icon-info.svg" class="tab-icon" />
				<text>分析</text>
			</view>
			<view class="tab-item" @click="goToMy">
				<image src="/static/icon/icon-user.svg" class="tab-icon" />
				<text>我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useCategoryStore } from '@/store/category'

export default {
	setup() {
		const categoryStore = useCategoryStore()

		const currentType = ref(1)
		const showModal = ref(false)
		const isEdit = ref(false)
		const editingCode = ref('')

		const formData = ref({
			name: '',
			icon: 'meal',
			color: '#07c160'
		})

		const iconOptions = [
			'meal', 'food', 'shopping', 'home', 'car', 'bus', 'travel', 'health',
			'movie', 'game', 'phone', 'wallet', 'gift', 'drink', 'fruit', 'clothes'
		]

		const colorOptions = [
			'#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
			'#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
			'#BB8FCE', '#85C1E9', '#F8B500', '#07c160'
		]

		onMounted(() => {
			categoryStore.loadCategories()
		})

		const filteredCategories = computed(() => {
			return categoryStore.categories.filter(c => c.type === currentType.value)
		})

		const switchType = (type) => {
			currentType.value = type
		}

		const addCategory = () => {
			isEdit.value = false
			editingCode.value = ''
			formData.value = {
				name: '',
				icon: 'meal',
				color: '#07c160'
			}
			showModal.value = true
		}

		const editCategory = (category) => {
			isEdit.value = true
			editingCode.value = category.code
			formData.value = {
				name: category.name,
				icon: category.icon,
				color: category.color
			}
			showModal.value = true
		}

		const closeModal = () => {
			showModal.value = false
		}

		const selectIcon = (icon) => {
			formData.value.icon = icon
		}

		const selectColor = (color) => {
			formData.value.color = color
		}

		const saveCategory = () => {
			if (!formData.value.name.trim()) {
				uni.showToast({ title: '请输入分类名称', icon: 'none' })
				return
			}
			if (formData.value.name.length > 20) {
				uni.showToast({ title: '名称不能超过20字符', icon: 'none' })
				return
			}

			const categoryData = {
				type: currentType.value,
				name: formData.value.name.trim(),
				icon: formData.value.icon,
				color: formData.value.color
			}

			if (isEdit.value) {
				categoryStore.updateCategory(editingCode.value, categoryData)
				uni.showToast({ title: '修改成功', icon: 'success' })
			} else {
				categoryStore.addCategory(categoryData)
				uni.showToast({ title: '添加成功', icon: 'success' })
			}
			closeModal()
		}

		const deleteCategory = () => {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除该分类吗？',
				success: async (res) => {
					if (res.confirm) {
						categoryStore.deleteCategory(editingCode.value)
						uni.showToast({ title: '已删除', icon: 'success' })
						closeModal()
					}
				}
			})
		}

		const goToIndex = () => {
			uni.reLaunch({ url: '/pages/index/index' })
		}

		const goToRecords = () => {
			uni.reLaunch({ url: '/pages/records/records' })
		}

		const goToAdd = () => {
			uni.navigateTo({ url: '/pages/add/add' })
		}

		const goToStats = () => {
			uni.reLaunch({ url: '/pages/stats/stats' })
		}

		const goToMy = () => {
			uni.reLaunch({ url: '/pages/my/my' })
		}

		const getIconPath = (iconName) => {
			return `/static/icon/icon-${iconName}.svg`
		}

		return {
			currentType,
			showModal,
			isEdit,
			formData,
			iconOptions,
			colorOptions,
			filteredCategories,
			switchType,
			addCategory,
			editCategory,
			closeModal,
			selectIcon,
			selectColor,
			saveCategory,
			deleteCategory,
			goToIndex,
			goToRecords,
			goToAdd,
			goToStats,
			goToMy,
			getIconPath
		}
	}
}
</script>

<style scoped>
.category-page {
	min-height: 100vh;
	background-color: #FDF4E9;
	padding-bottom: 120rpx;
}

.type-tabs {
	display: flex;
	background-color: #ffffff;
	padding: 20rpx;
	gap: 20rpx;
}

.type-tab {
	flex: 1;
	text-align: center;
	padding: 20rpx 0;
	border-radius: 12rpx;
	background-color: #FDF4E9;
	font-size: 34rpx;
	color: #666666;
}

.type-tab.active {
	background-color: #07c160;
	color: #ffffff;
}

.category-list {
	padding: 20rpx;
}

.category-item {
	display: flex;
	align-items: center;
	background-color: #ffffff;
	padding: 24rpx;
	border-radius: 12rpx;
	margin-bottom: 16rpx;
}

.category-icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 20rpx;
}

.category-icon-svg {
	width: 48rpx;
	height: 48rpx;
}

.category-info {
	flex: 1;
}

.category-name {
	font-size: 34rpx;
	color: #333333;
	display: block;
}

.category-code {
	font-size: 26rpx;
	color: #666666;
	margin-top: 4rpx;
	display: block;
}

.category-arrow {
	font-size: 28rpx;
	color: #666666;
}

.empty-state {
	text-align: center;
	padding: 100rpx 0;
	color: #666666;
	font-size: 34rpx;
}

.add-btn {
	position: fixed;
	right: 30rpx;
	bottom: 150rpx;
	width: 100rpx;
	height: 100rpx;
	border-radius: 50%;
	background-color: #07c160;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 20rpx rgba(7, 193, 96, 0.4);
}

.add-icon {
	font-size: 58rpx;
	color: #ffffff;
}

/* Modal */
.modal {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 999;
}

.modal-mask {
	position: absolute;
	width: 100%;
	height: 100%;
	background-color: rgba(0, 0, 0, 0.5);
}

.modal-content {
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	width: 600rpx;
	max-height: 80vh;
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
}

.modal-header {
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
	font-size: 38rpx;
	font-weight: bold;
	color: #333333;
}

.modal-body {
	padding: 30rpx;
	max-height: 60vh;
	overflow-y: auto;
}

.form-item {
	margin-bottom: 30rpx;
}

.form-label {
	font-size: 34rpx;
	color: #666666;
	display: block;
	margin-bottom: 16rpx;
}

.form-input {
	border: 1rpx solid #f0f0f0;
	border-radius: 8rpx;
	padding: 20rpx;
	font-size: 34rpx;
}

.icon-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.icon-item {
	width: 80rpx;
	height: 80rpx;
	border-radius: 12rpx;
	background-color: #FDF4E9;
	display: flex;
	align-items: center;
	justify-content: center;
}

.icon-option-svg {
	width: 48rpx;
	height: 48rpx;
}

.icon-item.selected {
	background-color: var(--bg-income);
	border: 2rpx solid #07c160;
}

.color-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.color-item {
	width: 80rpx;
	height: 80rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.color-item.selected {
	border: 3rpx solid #333333;
}

.color-check {
	color: #ffffff;
	font-size: 38rpx;
	font-weight: bold;
}

.modal-footer {
	display: flex;
	border-top: 1rpx solid #f0f0f0;
}

.btn {
	flex: 1;
	text-align: center;
	padding: 30rpx;
	font-size: 34rpx;
}

.cancel-btn {
	color: #666666;
	border-right: 1rpx solid #f0f0f0;
}

.danger-btn {
	color: #dd524d;
}

.confirm-btn {
	color: #07c160;
}

.tabbar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 100rpx;
	background-color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: space-around;
	border-top: 1rpx solid #f0f0f0;
	padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
	flex: 1;
	text-align: center;
	font-size: 26rpx;
	color: #666666;
}

.tab-item.active {
	color: #07c160;
}

.add-tab {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 96rpx;
	height: 96rpx;
	margin: 0 auto;
	margin-top: -18rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #07c160 0%, #06ae56 100%);
	box-shadow: 0 6rpx 20rpx rgba(7, 193, 96, 0.35);
	transition: transform 0.2s ease, box-shadow 0.2s ease;
	position: relative;
}

.add-tab:active {
	transform: scale(0.94);
	box-shadow: 0 3rpx 10rpx rgba(7, 193, 96, 0.25);
}

.add-tab-icon-svg {
	width: 48rpx;
	height: 48rpx;
	filter: brightness(0) invert(1);
}

.add-tab-icon {
	font-size: 48rpx;
	color: #ffffff;
	font-weight: 300;
	line-height: 1;
}

.add-tab-icon {
	font-size: 68rpx;
	color: #07c160;
}

.tab-icon {
	width: 44rpx;
	height: 44rpx;
	margin-bottom: 4rpx;
}

.add-tab-icon-svg {
	width: 56rpx;
	height: 56rpx;
}

.icon-svg {
	width: 48rpx;
	height: 48rpx;
}
.tab-item .tab-icon {
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab-item.active .tab-icon {
	transform: scale(1.2);
}

</style>