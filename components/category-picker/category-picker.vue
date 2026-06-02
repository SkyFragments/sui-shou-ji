/**
 * 分类选择器组件
 * 显示分类图标网格，支持切换支出/收入分类
 * 支出显示9个分类图标，收入显示4个分类图标
 */
<template>
	<view class="category-picker">
		<view class="type-tabs">
			<view
				class="tab"
				:class="{ active: currentType === 1 }"
				@click="switchType(1)"
			>
				支出
			</view>
			<view
				class="tab"
				:class="{ active: currentType === 2 }"
				@click="switchType(2)"
			>
				收入
			</view>
		</view>
		<view class="category-grid">
			<view
				v-for="category in displayCategories"
				:key="category.code"
				class="category-item"
				:class="{ selected: selectedCode === category.code }"
				@click="selectCategory(category)"
			>
				<view class="category-icon" :style="{ backgroundColor: category.color }">
					<image :src="getIconPath(category.icon)" class="category-icon-img" />
				</view>
				<text class="category-name">{{ category.name }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { computed } from 'vue'
import { useCategoryStore } from '@/store/category'

export default {
	name: 'CategoryPicker',
	props: {
		type: {
			type: Number,
			default: 1
		},
		modelValue: {
			type: String,
			default: ''
		}
	},
	emits: ['update:modelValue', 'select'],
	setup(props, { emit }) {
		const categoryStore = useCategoryStore()

		// 初始化加载分类
		categoryStore.loadCategories()

		const currentType = computed(() => props.type)
		const selectedCode = computed({
			get: () => props.modelValue,
			set: (val) => emit('update:modelValue', val)
		})

		const displayCategories = computed(() => {
			if (currentType.value === 1) {
				return categoryStore.expenseCategories
			}
			return categoryStore.incomeCategories
		})

		const switchType = (type) => {
			emit('update:modelValue', '')
			emit('select', { type, code: '', name: '' })
		}

		const selectCategory = (category) => {
			selectedCode.value = category.code
			emit('select', {
				type: currentType.value,
				code: category.code,
				name: category.name,
				icon: category.icon,
				color: category.color
			})
		}

		const getIconPath = (iconName) => {
			return `/static/icon/icon-${iconName}.svg`
		}

		return {
			currentType,
			selectedCode,
			displayCategories,
			switchType,
			selectCategory,
			getIconPath
		}
	}
}
</script>

<style scoped>
.category-picker {
	padding: 20rpx;
}

.type-tabs {
	display: flex;
	justify-content: center;
	margin-bottom: 24rpx;
	gap: 24rpx;
}

.tab {
	padding: 12rpx 48rpx;
	border-radius: 40rpx;
	font-size: 34rpx;
	color: #666666;
	background-color: #f0f0f0;
	transition: all 0.2s;
}

.tab.active {
	color: #ffffff;
	background-color: #07c160;
}

.category-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
	padding: 0 10rpx;
}

.category-item {
	width: 20%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 12rpx 0;
}

.category-icon {
	width: 96rpx;
	height: 96rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 3rpx solid transparent;
	transition: border-color 0.2s;
}

.category-icon-img {
	width: 56rpx;
	height: 56rpx;
}

.category-item.selected .category-icon {
	border-color: #333333;
}

.category-name {
	font-size: 32rpx;
	color: #666666;
	margin-top: 8rpx;
	text-align: center;
}
</style>