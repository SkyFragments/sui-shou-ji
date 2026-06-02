/**
 * 记账页面
 * 输入金额、选择分类、选择账户、添加备注后保存账单
 * 支持编辑模式：通过 url 参数传入 recordId
 */
<template>
	<view class="add-page" :style="{ paddingTop: (statusBarH + 88) + 'px' }">
		<!-- 顶部安全区占位（兼容小程序/低版 webview，env() 不可靠） -->
		<view class="status-bar-placeholder" :style="{ height: statusBarH + 'px' }"></view>

		<!-- 顶部导航栏 -->
		<view class="navbar" :style="{ top: statusBarH + 'px' }">
			<view class="navbar-left" @click="goBack">
				<image src="/static/icon/icon-arrow-left.svg" class="navbar-back-icon" />
			</view>
			<text class="navbar-title">{{ isEdit ? '编辑账单' : '记一笔' }}</text>
			<view class="navbar-right">
				<text
					v-if="isEdit"
					class="navbar-action danger"
					@click="onDeleteRecord"
				>删除</text>
			</view>
		</view>

		<!-- 高度补偿 spacer 已合并到 .add-page 的 paddingTop，此处删除 -->

		<!-- 金额显示 -->
		<view class="amount-display">
			<view class="amount-value">
				<text class="currency">¥</text>
				<text class="amount">{{ displayAmount || '0.00' }}</text>
			</view>
		</view>

		<!-- 支出/收入 段控件（一体的胶囊式容器） -->
		<view class="segmented">
			<view
				class="segmented-item"
				:class="{ active: recordType === 1 }"
				@click="switchType(1)"
			>
				<text>支出</text>
			</view>
			<view
				class="segmented-item"
				:class="{ active: recordType === 2 }"
				@click="switchType(2)"
			>
				<text>收入</text>
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
				:cursor-spacing="100"
				:adjust-position="true"
			/>
		</view>

		<!-- 键盘 -->
		<view class="keyboard-wrapper">
			<amount-keyboard
				@onInput="onInput"
				@onDelete="onBackspace"
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
				<image src="/static/icon/icon-wallet-white.svg" class="add-tab-icon-svg" />
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

		// 状态栏高度：env() 在小程序/低版 webview 不可靠，用 JS 读出来
		// 取 statusBarHeight 即可；safeAreaInsets.top 在 iOS 上与 statusBarHeight 重叠，相加会双倍
		const statusBarH = ref(20)
		try {
			const info = uni.getSystemInfoSync()
			statusBarH.value = info.statusBarHeight || 20
		} catch (e) {}

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
		const onBackspace = () => {
			if (amount.value.length > 0) {
				amount.value = amount.value.slice(0, -1)
			}
		}

		const switchType = (type) => {
			recordType.value = type
			selectedCategoryCode.value = ''
			selectedCategory.value = null
		}

		const onCategorySelect = (category) => {
			if (category.type) {
				recordType.value = category.type
			}
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

		const goBack = () => {
			const pages = getCurrentPages()
			if (pages && pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.reLaunch({ url: '/pages/index/index' })
			}
		}

		return {
			statusBarH,
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
			onBackspace,
			onClear,
			onDeleteRecord,
			onSave,
			goBack,
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
	background: transparent;
	padding-bottom: 240rpx;
}

.navbar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: 0 24rpx;
	box-sizing: border-box;
	background-color: #ffffff;
	border-bottom: 1rpx solid #f0f0f0;
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	z-index: 100;
}

.status-bar-placeholder {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	width: 100%;
	background-color: #ffffff;
	z-index: 99;
}

/* spacer 已合并到 .add-page paddingTop，此处删除 .navbar-spacer */

.navbar-left,
.navbar-right {
	min-width: 80rpx;
	display: flex;
	align-items: center;
}

.navbar-right {
	justify-content: flex-end;
}

.navbar-back-icon {
	width: 40rpx;
	height: 40rpx;
	padding: 0 8rpx;
}

.navbar-title {
	font-size: 38rpx;
	font-weight: 600;
	color: #333333;
	flex: 1;
	text-align: center;
}

.navbar-action {
	font-size: 34rpx;
	color: #333333;
	padding: 8rpx 16rpx;
}

.navbar-action.danger {
	color: #dd524d;
}

.amount-display {
	background-color: #ffffff;
	padding: 40rpx 0;
	text-align: center;
}

.amount-label {
	font-size: 34rpx;
	color: #666666;
	margin-bottom: 16rpx;
}

.amount-value {
	display: flex;
	justify-content: center;
	align-items: baseline;
}

.currency {
	font-size: 48rpx;
	color: #333333;
	margin-right: 8rpx;
}

.amount {
	font-size: 86rpx;
	font-weight: bold;
	color: #333333;
}

/* 段控件：单容器包裹两段，整体是一个胶囊 */
.segmented {
	display: flex;
	margin: 16rpx 30rpx;
	padding: 6rpx;
	background-color: #f0f0f0;
	border-radius: 999rpx;
}

.segmented-item {
	flex: 1;
	height: 64rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999rpx;
	font-size: 34rpx;
	color: #666666;
	transition: all 0.2s;
}

.segmented-item.active {
	background-color: #ffffff;
	color: #333333;
	font-weight: 600;
	box-shadow: 0 2rpx 6rpx rgba(0, 0, 0, 0.08);
}

.segmented-item.active:nth-child(1) {
	color: #C85A53;
}

.segmented-item.active:nth-child(2) {
	color: #07c160;
}

.section {
	background-color: #ffffff;
	margin-bottom: 16rpx;
}

.section-title {
	padding: 20rpx 24rpx;
	font-size: 36rpx;
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
	font-size: 32rpx;
	color: #666666;
	margin-bottom: 12rpx;
}

.picker-value {
	font-size: 34rpx;
	color: #333333;
	padding: 16rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
	min-height: 88rpx;
	box-sizing: border-box;
}

.remark-input {
	width: 100%;
	padding: 20rpx 24rpx;
	font-size: 34rpx;
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
	width: 52rpx;
	height: 52rpx;
}

.add-tab-icon {
	font-size: 48rpx;
	color: #ffffff;
	font-weight: 300;
	line-height: 1;
}

.tab-icon { width: 56rpx; height: 56rpx; margin-bottom: 4rpx; } 
.tab-item .tab-icon {
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab-item.active .tab-icon {
	transform: scale(1.2);
}

</style>