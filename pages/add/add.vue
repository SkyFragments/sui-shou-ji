/**
 * 记账页面
 * 输入金额、选择分类、选择账户、添加备注后保存账单
 * 支持编辑模式：通过 url 参数传入 recordId
 */
<template>
	<view class="add-page">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="page-title">{{ isEdit ? '编辑账单' : '记一笔' }}</text>
			<view class="delete-btn" v-if="isEdit" @click="onDelete">
				<text>删除</text>
			</view>
		</view>

		<!-- 金额显示 -->
		<view class="amount-display">
			<view class="amount-value">
				<text class="currency">¥</text>
				<text class="amount">{{ displayAmount || '0.00' }}</text>
			</view>
		</view>

		<!-- 分类选择 -->
		<view class="section">
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
			<input
				class="remark-input"
				type="text"
				v-model="remark"
				placeholder="选填，最多256字符"
				maxlength="256"
			/>
		</view>

		<!-- 键盘 -->
		<view class="keyboard-wrapper">
			<amount-keyboard
				@onInput="onInput"
				@onDelete="onDelete"
				@onClear="onClear"
				@onConfirm="onSave"
			/>
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
			<view class="tab-item add-tab active">
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
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
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

		// 编辑模式状态
		const isEdit = ref(false)
		const editingRecordId = ref(null)

		// 状态
		const recordType = ref(1)
		const amount = ref('')
		const selectedCategoryCode = ref('')
		const selectedCategory = ref(null)
		const selectedAccountCode = ref('')
		const recordDate = ref(getToday())
		const remark = ref('')

		// 页面加载时检查是否编辑模式
		onLoad((options) => {
			if (options.recordId) {
				isEdit.value = true
				editingRecordId.value = options.recordId
				loadRecord(options.recordId)
			}
		})

		// 加载编辑的账单
		const loadRecord = (recordId) => {
			const record = billStore.records.find(r => r.id === recordId)
			if (record) {
				recordType.value = record.type
				amount.value = record.amount.toString()
				selectedCategoryCode.value = record.category_code
				selectedCategory.value = categoryStore.getCategoryByCode(record.category_code)
				selectedAccountCode.value = record.account_code
				recordDate.value = record.record_date
				remark.value = record.remark || ''
			}
		}

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

			// 限制最大2位小数
			const parts = amount.value.split('.')
			if (parts[1] && parts[1].length >= 2) return

			// 限制最大金额999,999.99
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

		const onDeleteRecord = () => {
			if (!editingRecordId.value) return
			uni.showModal({
				title: '确认删除',
					content: '确定要删除这条账单吗？',
				success: async (res) => {
					if (res.confirm) {
						await billStore.deleteRecord(editingRecordId.value)
						uni.showToast({ title: '已删除', icon: 'success' })
						setTimeout(() => {
							uni.navigateBack()
						}, 1500)
					}
				}
			})
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
			const recordData = {
				type: recordType.value,
				amount: numAmount,
				category_code: selectedCategoryCode.value,
				category_name: selectedCategory.value?.name || '',
				account_code: selectedAccountCode.value,
				remark: remark.value,
				record_date: recordDate.value
			}

			try {
				if (isEdit.value && editingRecordId.value) {
					// 更新账单
					await billStore.updateRecord(editingRecordId.value, recordData)
					uni.showToast({ title: '已更新', icon: 'success' })
				} else {
					// 添加账单
					await billStore.addRecord(recordData)
					uni.showToast({ title: '保存成功', icon: 'success' })
				}

				// 返回上一页
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
			} catch (error) {
				uni.showToast({ title: '保存失败', icon: 'none' })
			}
		}

		const goToIndex = () => {
			uni.reLaunch({ url: '/pages/index/index' })
		}

		const goToRecords = () => {
			uni.reLaunch({ url: '/pages/records/records' })
		}

		const goToStats = () => {
			uni.reLaunch({ url: '/pages/stats/stats' })
		}

		const goToMy = () => {
			uni.reLaunch({ url: '/pages/my/my' })
		}

		return {
			isEdit,
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
			onDelete: onDeleteRecord,
			onSave,
			goToIndex,
			goToRecords,
			goToStats,
			goToMy
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
	background-color: #FDF4E9;
	padding-bottom: 240rpx;
}

.page-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 30rpx;
	background-color: #ffffff;
	border-bottom: 1rpx solid #f0f0f0;
}

.page-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333333;
}

.delete-btn {
	padding: 10rpx 24rpx;
	background-color: #FDEBE7;
	border-radius: 8rpx;
}

.delete-btn text {
	font-size: 26rpx;
	color: #dd524d;
}

.amount-display {
	background-color: #ffffff;
	padding: 40rpx 0;
	text-align: center;
}

.amount-label {
	font-size: 28rpx;
	color: #666666;
	margin-bottom: 16rpx;
}

.amount-value {
	display: flex;
	justify-content: center;
	align-items: baseline;
}

.currency {
	font-size: 40rpx;
	color: #333333;
	margin-right: 8rpx;
}

.amount {
	font-size: 72rpx;
	font-weight: bold;
	color: #333333;
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
	color: #666666;
	background-color: #f0f0f0;
	transition: all 0.2s;
}

.type-btn.active {
	color: #ffffff;
}

.type-btn.active:nth-child(1) {
	background-color: #C85A53;
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
	color: #333333;
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
	color: #666666;
	margin-bottom: 12rpx;
}

.picker-value {
	font-size: 28rpx;
	color: #333333;
	padding: 16rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
	min-height: 88rpx;
	box-sizing: border-box;
}

.remark-input {
	width: 100%;
	padding: 20rpx 24rpx;
	font-size: 28rpx;
	box-sizing: border-box;
	min-height: 88rpx;
}

.keyboard-wrapper {
	background-color: #ffffff;
	box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
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
	font-size: 22rpx;
	color: #666666;
}

.tab-item.active {
	color: #07c160;
}

.add-tab {
	display: flex;
	align-items: center;
	justify-content: center;
}

.tab-icon { width: 44rpx; height: 44rpx; margin-bottom: 4rpx; } .add-tab-icon-svg { width: 56rpx; height: 56rpx; }
</style>