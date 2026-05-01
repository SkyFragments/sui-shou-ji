/**
 * 分类选择器组件
 * 显示分类图标网格，支持切换支出/收入分类
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
					<text>{{ category.icon }}</text>
				</view>
				<text class="category-name">{{ category.name }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'CategoryPicker',
	props: {
		type: {
			type: Number,
			default: 1
		}
	},
	data() {
		return {
			currentType: this.type,
			selectedCode: ''
		}
	},
	computed: {
		displayCategories() {
			if (this.currentType === 1) {
				return this.expenseCategories
			}
			return this.incomeCategories
		}
	},
	setup() {
		// 支出分类
		const expenseCategories = [
			{ code: 'FOOD', name: '餐饮', icon: '🍜', color: '#FF6B6B' },
			{ code: 'TRANSPORT', name: '交通', icon: '🚌', color: '#4ECDC4' },
			{ code: 'SHOPPING', name: '购物', icon: '🛒', color: '#FFE66D' },
			{ code: 'ENTERTAINMENT', name: '娱乐', icon: '🎮', color: '#95E1D3' },
			{ code: 'LIVING', name: '居住', icon: '🏠', color: '#F38181' },
			{ code: 'MEDICAL', name: '医疗', icon: '🏥', color: '#AA96DA' },
			{ code: 'EDUCATION', name: '教育', icon: '📚', color: '#FCBAD3' },
			{ code: 'COMMUNICATION', name: '通讯', icon: '📱', color: '#A8D8EA' },
			{ code: 'OTHER', name: '其他', icon: '📦', color: '#C9B1FF' }
		]
		// 收入分类
		const incomeCategories = [
			{ code: 'SALARY', name: '工资', icon: '💰', color: '#4CAF50' },
			{ code: 'SIDE_JOB', name: '副业', icon: '💼', color: '#2196F3' },
			{ code: 'INVESTMENT', name: '投资', icon: '📈', color: '#FF9800' },
			{ code: 'OTHER_INCOME', name: '其他', icon: '💵', color: '#9C27B0' }
		]
		return { expenseCategories, incomeCategories }
	},
	methods: {
		switchType(type) {
			this.currentType = type
			this.selectedCode = ''
		},
		selectCategory(category) {
			this.selectedCode = category.code
			this.$emit('select', {
				type: this.currentType,
				code: category.code,
				name: category.name
			})
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
	margin-bottom: 20rpx;
}

.tab {
	padding: 10rpx 40rpx;
	margin: 0 10rpx;
	border-radius: 30rpx;
	font-size: 28rpx;
	color: #666;
	background-color: #f0f0f0;
}

.tab.active {
	color: #ffffff;
	background-color: #007AFF;
}

.category-grid {
	display: flex;
	flex-wrap: wrap;
	justify-content: flex-start;
}

.category-item {
	width: 20%;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 15rpx 0;
}

.category-item.selected .category-icon {
	border: 2px solid #007AFF;
}

.category-icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 40rpx;
}

.category-name {
	font-size: 24rpx;
	color: #666;
	margin-top: 8rpx;
}
</style>