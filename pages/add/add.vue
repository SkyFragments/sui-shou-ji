/**
 * 记账页面
 * 输入金额、选择分类、选择账户、添加备注后保存账单
 */
<template>
	<view class="add-page">
		<!-- 金额显示 -->
		<view class="amount-display">
			<view class="amount-label">{{ recordType === 1 ? '支出' : '收入' }}</view>
			<view class="amount-value">
				<text class="currency">¥</text>
				<text class="amount">{{ displayAmount || '0.00' }}</text>
			</view>
		</view>

		<!-- 收支切换 -->
		<view class="type-switch">
			<view
				class="type-btn"
				:class="{ active: recordType === 1 }"
				@click="switchType(1)"
			>
				支出
			</view>
			<view
				class="type-btn"
				:class="{ active: recordType === 2 }"
				@click="switchType(2)"
			>
				收入
			</view>
		</view>

		<!-- 分类选择 -->
		<view class="section">
			<view class="section-title">分类</view>
			<category-picker
				:type="recordType"
				:modelValue="selectedCategoryCode"
				@select="onCategorySelect"
			/>
		</view>

		<!-- 账户和日期 -->
		<view class="form-row">
			<view class="form-item">
				<view class="form-label">账户</view>
				<picker
					:range="accountOptions"
					:value="accountIndex"
					@change="onAccountChange"
				>
					<view class="picker-value">
						{{ selectedAccount?.name || '请选择账户' }}
					</view>
				</picker>
			</view>
			<view class="form-item">
				<view class="form-label">日期</view>
				<picker
					mode="date"
					:value="recordDate"
					@change="onDateChange"
				>
					<view class="picker-value">
						{{ recordDate }}
					</view>
				</picker>
			</view>
		</view>

		<!-- 备注 -->
		<view class="section">
			<view class="section-title">备注</view>
			<input
				class="remark-input"
				type="text"
				v-model="remark"
				placeholder="选填，最多256字符"
				maxlength="256"
			/>
		</view>

		<!-- 键盘 -->
		<amount-keyboard
			@onInput="onInput"
			@onDelete="onDelete"
			@onClear="onClear"
			@onConfirm="onSave"
		/>
	</view>
</template>

<script>
import { ref, computed } from 'vue'
import { useBillStore } from '@/store/bill'
import { useCategoryStore } from '@/store/category'
import { useAccountStore } from '@/store/account'
import CategoryPicker from '@/components/category-picker/category-picker.vue'
import AmountKeyboard from '@/components/amount-keyboard/amount-keyboard.vue'

export default {
	components: {
		CategoryPicker,
		AmountKeyboard
	},
	setup() {
		const billStore = useBillStore()
		const categoryStore = useCategoryStore()
		const accountStore = useAccountStore()

		// 初始化 stores
		categoryStore.loadCategories()
		accountStore.loadAccounts()

		// 状态
		const recordType = ref(1)
		const amount = ref('')
		const selectedCategoryCode = ref('')
		const selectedCategory = ref(null)
		const selectedAccountCode = ref('')
		const recordDate = ref(getToday())
		const remark = ref('')

		// 计算属性
		const displayAmount = computed(() => {
			if (!amount.value) return ''
			const num = parseFloat(amount.value)
			if (isNaN(num)) return ''
			return num.toFixed(2)
		})

		const accountOptions = computed(() => {
			return accountStore.accounts.map(a => a.name)
		})

		const accountIndex = computed(() => {
			return accountStore.accounts.findIndex(a => a.code === selectedAccountCode.value)
		})

		const selectedAccount = computed(() => {
			return accountStore.accounts.find(a => a.code === selectedAccountCode.value) || null
		})

		// 方法
		const switchType = (type) => {
			recordType.value = type
			selectedCategoryCode.value = ''
			selectedCategory.value = null
		}

		const onCategorySelect = (category) => {
			selectedCategoryCode.value = category.code
			selectedCategory.value = category
		}

		const onAccountChange = (e) => {
			const index = e.detail.value
			if (accountStore.accounts[index]) {
				selectedAccountCode.value = accountStore.accounts[index].code
			}
		}

		const onDateChange = (e) => {
			recordDate.value = e.detail.value
		}

		const onInput = (value) => {
			// 处理小数点
			if (value === '.') {
				if (amount.value.includes('.')) return
				amount.value = amount.value + '.'
				return
			}

			// 限制最多2位小数
			const parts = amount.value.split('.')
			if (parts[1] && parts[1].length >= 2) return

			// 限制最大金额 999,999.99
			const newAmount = amount.value + value
			const num = parseFloat(newAmount)
			if (num > 999999.99) return

			amount.value = newAmount
		}

		const onDelete = () => {
			if (amount.value.length > 0) {
				amount.value = amount.value.slice(0, -1)
			}
		}

		const onClear = () => {
			amount.value = ''
		}

		const onSave = async () => {
			// 验证金额
			const numAmount = parseFloat(amount.value)
			if (!numAmount || numAmount <= 0) {
				uni.showToast({ title: '请输入金额', icon: 'none' })
				return
			}

			// 验证分类
			if (!selectedCategoryCode.value) {
				uni.showToast({ title: '请选择分类', icon: 'none' })
				return
			}

			// 验证账户
			if (!selectedAccountCode.value) {
				uni.showToast({ title: '请选择账户', icon: 'none' })
				return
			}

			// 保存账单
			const record = {
				type: recordType.value,
				amount: numAmount,
				category_code: selectedCategoryCode.value,
				category_name: selectedCategory.value?.name || '',
				account_code: selectedAccountCode.value,
				remark: remark.value,
				record_date: recordDate.value
			}

			try {
				await billStore.addRecord(record)
				uni.showToast({ title: '保存成功', icon: 'success' })

				// 重置表单
				amount.value = ''
				selectedCategoryCode.value = ''
				selectedCategory.value = null
				remark.value = ''

				// 返回上一页
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
			} catch (error) {
				uni.showToast({ title: '保存失败', icon: 'none' })
			}
		}

		return {
			recordType,
			amount,
			displayAmount,
			selectedCategoryCode,
			selectedAccountCode,
			recordDate,
			remark,
			accountOptions,
			accountIndex,
			selectedAccount,
			switchType,
			onCategorySelect,
			onAccountChange,
			onDateChange,
			onInput,
			onDelete,
			onClear,
			onSave
		}
	}
}

function getToday() {
	const now = new Date()
	const y = now.getFullYear()
	const m = String(now.getMonth() + 1).padStart(2, '0')
	const d = String(now.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}
</script>

<style scoped>
.add-page {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding-bottom: 40rpx;
}

.amount-display {
	background-color: #ffffff;
	padding: 40rpx 0;
	text-align: center;
}

.amount-label {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 16rpx;
}

.amount-value {
	display: flex;
	justify-content: center;
	align-items: baseline;
}

.currency {
	font-size: 40rpx;
	color: #333;
	margin-right: 8rpx;
}

.amount {
	font-size: 72rpx;
	font-weight: bold;
	color: #333;
}

.type-switch {
	display: flex;
	justify-content: center;
	gap: 60rpx;
	padding: 24rpx;
	background-color: #ffffff;
	margin-bottom: 16rpx;
}

.type-btn {
	padding: 12rpx 48rpx;
	border-radius: 40rpx;
	font-size: 28rpx;
	color: #666;
	background-color: #f0f0f0;
	transition: all 0.2s;
}

.type-btn.active {
	color: #ffffff;
}

.type-btn.active:nth-child(1) {
	background-color: #ff6b6b;
}

.type-btn.active:nth-child(2) {
	background-color: #07c160;
}

.section {
	background-color: #ffffff;
	margin-bottom: 16rpx;
}

.section-title {
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	color: #333;
	border-bottom: 1rpx solid #f0f0f0;
}

.form-row {
	display: flex;
	background-color: #ffffff;
	margin-bottom: 16rpx;
}

.form-item {
	flex: 1;
	padding: 20rpx 24rpx;
}

.form-label {
	font-size: 26rpx;
	color: #666;
	margin-bottom: 12rpx;
}

.picker-value {
	font-size: 28rpx;
	color: #333;
	padding: 16rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.remark-input {
	width: 100%;
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	box-sizing: border-box;
}
</style>