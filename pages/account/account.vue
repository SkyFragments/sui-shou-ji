/**
 * 账户管理页面
 * 查看、添加、编辑、删除账户
 */
<template>
	<view class="account-page" :style="{ paddingTop: statusBarH + 'px' }">
		<!-- 顶部安全区占位（兼容小程序/低版 webview，env() 不可靠） -->
		<view class="status-bar-placeholder" :style="{ height: statusBarH + 'px' }"></view>

		<!-- 页面标题栏：吸收状态栏/刘海区域，提供返回 -->
		<view class="page-header">
			<view class="header-btn back-btn" @click="goBack" aria-label="返回">
				<image src="/static/icon/icon-arrow-left.svg" class="header-btn-icon" />
			</view>
			<text class="header-title">账户管理</text>
			<view class="header-btn placeholder" aria-hidden="true"></view>
		</view>

		<!-- 账户列表 -->
		<view class="account-list animate-slide-up">
			<view
				v-for="account in accounts"
				:key="account.code"
				class="account-item"
			>
				<view class="account-info">
					<view class="account-icon" :style="{ backgroundColor: getAccountColor(account.type) }">
						<image :src="getAccountIconPath(account.type)" class="account-icon-img" />
					</view>
					<view class="account-detail">
						<text class="account-name">{{ account.name }}</text>
						<text class="account-type">{{ getAccountTypeName(account.type) }}</text>
					</view>
				</view>
				<view class="account-actions">
					<view v-if="account.is_default" class="default-badge">默认</view>
					<view class="action-btn" @click="editAccount(account)">
						<text>编辑</text>
					</view>
					<view
						class="action-btn delete-btn"
						v-if="!account.is_default"
						@click="deleteAccount(account)"
					>
						<text>删除</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state animate-fade-in" v-if="accounts.length === 0">
			<text class="empty-text">暂无账户</text>
			<text class="empty-hint">点击下方按钮添加第一个账户</text>
		</view>

		<!-- 添加账户按钮 -->
		<view class="add-account-btn" @click="showAddModal = true">
			<text class="add-icon">+</text>
			<text class="add-text">添加账户</text>
		</view>

		<!-- 添加/编辑模态框 -->
		<view class="modal" v-if="showAddModal || editingAccount">
			<view class="modal-mask" @click="closeModal"></view>
			<view class="modal-content">
				<view class="modal-header">
					<text class="modal-title">{{ editingAccount ? '编辑账户' : '添加账户' }}</text>
					<view class="modal-close" @click="closeModal" aria-label="关闭">
						<text class="modal-close-icon">×</text>
					</view>
				</view>
				<view class="modal-body">
					<view class="form-item">
						<text class="form-label">账户名称</text>
						<input
							class="form-input"
							v-model="formData.name"
							placeholder="例如：支付宝"
							maxlength="20"
						/>
					</view>
					<view class="form-item">
						<text class="form-label">账户类型</text>
						<picker
							:range="accountTypes"
							:value="accountTypeIndex"
							@change="onAccountTypeChange"
						>
							<view class="picker-value">
								<text>{{ formData.type ? getAccountTypeName(formData.type) : '请选择' }}</text>
								<image src="/static/icon/icon-arrow-right.svg" class="picker-chevron" />
							</view>
						</picker>
					</view>
					<view class="form-item">
						<text class="form-label">设为默认账户</text>
						<switch
							:checked="formData.is_default === 1"
							@change="onDefaultChange"
							color="#07c160"
						/>
					</view>
				</view>
				<view class="modal-footer">
					<view class="btn cancel-btn" @click="closeModal">
						<text>取消</text>
					</view>
					<view class="btn confirm-btn" @click="saveAccount">
						<text>保存</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 底部导航 -->
		<view class="tabbar">
			<view class="tab-item" @click="goToIndex">
				<text>首页</text>
			</view>
			<view class="tab-item" @click="goToRecords">
				<text>账单</text>
			</view>
			<view class="tab-item add-tab" @click="goToAdd">
				<text class="add-tab-icon">+</text>
			</view>
			<view class="tab-item" @click="goToStats">
				<text>分析</text>
			</view>
			<view class="tab-item active" @click="goToMy">
				<text>我的</text>
			</view>
		</view>
	</view>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useAccountStore } from '@/store/account'
import { useBillStore } from '@/store/bill'

export default {
	setup() {
		const accountStore = useAccountStore()
		const billStore = useBillStore()

		const showAddModal = ref(false)
		const editingAccount = ref(null)
		const accountTypeIndex = ref(0)

		// 状态栏高度：env() 在小程序/低版 webview 不可靠，用 JS 读出来
		const statusBarH = ref(20)
		try {
			// 优先用新 API（消除 wx.getSystemInfoSync 废弃告警），旧基础库兜底
			const info = (uni.getWindowInfo && uni.getWindowInfo()) || uni.getSystemInfoSync()
			statusBarH.value = (info.statusBarHeight || 20) + (info.safeAreaInsets?.top || 0)
		} catch (e) {}

		const formData = ref({
			name: '',
			type: 'cash',
			is_default: 0
		})

		const accountTypes = ['现金', '支付宝', '微信', '银行卡']

		onMounted(() => {
			accountStore.loadAccounts()
			// 确保账单已加载，删除提示中的"关联账单数"才准确
			if (!billStore.records || billStore.records.length === 0) {
				billStore.loadRecords()
			}
		})

		const accounts = computed(() => accountStore.allAccounts)

		const getAccountIcon = (type) => {
			const icons = {
				cash: 'wallet',
				alipay: 'card',
				wechat: 'wallet',
				bankcard: 'card'
			}
			return icons[type] || 'wallet'
		}

		const getAccountIconPath = (type) => {
			const iconName = getAccountIcon(type)
			return `/static/icon/icon-${iconName}.svg`
		}

		const getAccountColor = (type) => {
			const colors = {
				cash: '#07c160',
				alipay: '#1677ff',
				wechat: '#07c160',
				bankcard: '#722ed1'
			}
			return colors[type] || '#999'
		}

		const getAccountTypeName = (type) => {
			const names = {
				cash: '现金',
				alipay: '支付宝',
				wechat: '微信',
				bankcard: '银行卡'
			}
			return names[type] || type
		}

		const onAccountTypeChange = (e) => {
			const types = ['cash', 'alipay', 'wechat', 'bankcard']
			accountTypeIndex.value = e.detail.value
			formData.value.type = types[e.detail.value]
		}

		const onDefaultChange = (e) => {
			formData.value.is_default = e.detail.value ? 1 : 0
		}

		const editAccount = (account) => {
			editingAccount.value = account
			formData.value = {
				name: account.name,
				type: account.type,
				is_default: account.is_default
			}
			const types = ['cash', 'alipay', 'wechat', 'bankcard']
			accountTypeIndex.value = types.indexOf(account.type)
		}

		const deleteAccount = (account) => {
			const relatedCount = billStore.records.filter(r => r.account_code === account.code).length
			const content = relatedCount > 0
				? `确定要删除账户"${account.name}"吗？\n该账户下有 ${relatedCount} 条账单记录，删除后这些账单将失去账户关联。`
				: `确定要删除账户"${account.name}"吗？`
			uni.showModal({
				title: '确认删除',
				content,
				confirmText: '删除',
				confirmColor: '#dd524d',
				success: (res) => {
					if (res.confirm) {
						const success = accountStore.deleteAccount(account.code)
						if (success) {
							uni.showToast({ title: '已删除', icon: 'success' })
						} else {
							uni.showToast({ title: '默认账户无法删除', icon: 'none' })
						}
					}
				}
			})
		}

		const closeModal = () => {
			showAddModal.value = false
			editingAccount.value = null
			formData.value = { name: '', type: 'cash', is_default: 0 }
			accountTypeIndex.value = 0
		}

		const saveAccount = () => {
			if (!formData.value.name.trim()) {
				uni.showToast({ title: '请输入账户名称', icon: 'none' })
				return
			}
			if (formData.value.name.length > 20) {
				uni.showToast({ title: '名称不能超过20字符', icon: 'none' })
				return
			}

			if (editingAccount.value) {
				accountStore.updateAccount(editingAccount.value.code, {
					name: formData.value.name,
					type: formData.value.type,
					is_default: formData.value.is_default
				})
				if (formData.value.is_default) {
					accountStore.setDefaultAccount(editingAccount.value.code)
				}
				uni.showToast({ title: '已更新', icon: 'success' })
			} else {
				const types = ['cash', 'alipay', 'wechat', 'bankcard']
				const newCode = `account_${Date.now()}`
				accountStore.addAccount({
					code: newCode,
					name: formData.value.name,
					type: formData.value.type,
					is_default: formData.value.is_default
				})
				if (formData.value.is_default) {
					accountStore.setDefaultAccount(newCode)
				}
				uni.showToast({ title: '已添加', icon: 'success' })
			}
			closeModal()
		}

		const goToIndex = () => {
			uni.reLaunch({ url: '/pages/index/index' })
		}

		const goToRecords = () => {
			uni.reLaunch({ url: '/pages/records/records' })
		}

		const goToAdd = () => {
			uni.reLaunch({ url: '/pages/add/add' })
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
				uni.navigateBack({ delta: 1 })
			} else {
				uni.reLaunch({ url: '/pages/my/my' })
			}
		}

		return {
			statusBarH,
			accounts,
			showAddModal,
			editingAccount,
			formData,
			accountTypes,
			accountTypeIndex,
			getAccountIcon,
			getAccountIconPath,
			getAccountColor,
			getAccountTypeName,
			onAccountTypeChange,
			onDefaultChange,
			editAccount,
			deleteAccount,
			closeModal,
			saveAccount,
			goToIndex,
			goToRecords,
			goToAdd,
			goToStats,
			goToMy,
			goBack
		}
	}
}
</script>

<style scoped>
.account-page {
	min-height: 100vh;
	background: transparent;
	padding-bottom: 120rpx;
}

/* 状态栏占位：固定顶部，明确占用摄像头/刘海区域 */
.status-bar-placeholder {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	width: 100%;
	background-color: #ffffff;
	z-index: 99;
}

/* 页面标题栏：粘性吸顶，被状态栏占位保护，下方滚动时内容不会冲到摄像头下 */
.page-header {
	position: sticky;
	top: 0;
	z-index: 100;
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: 0 16rpx;
	background-color: #ffffff;
	border-bottom: 1rpx solid #f0f0f0;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.header-btn {
	width: 72rpx;
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background-color 0.15s ease-out;
}

.header-btn:active {
	background-color: #F0EBE3;
}

.header-btn.placeholder {
	background: transparent;
	pointer-events: none;
}

.header-btn-icon {
	width: 44rpx;
	height: 44rpx;
}

.header-title {
	flex: 1;
	text-align: center;
	font-size: 36rpx;
	font-weight: 600;
	color: #333333;
}

.account-list {
	padding: 20rpx;
}

.account-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background-color: #ffffff;
	border-radius: 12rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
}

.account-info {
	display: flex;
	align-items: center;
}

.account-icon {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 20rpx;
}

.account-icon-img {
	width: 48rpx;
	height: 48rpx;
}

.account-detail {
	display: flex;
	flex-direction: column;
}

.account-name {
	font-size: 36rpx;
	color: #333333;
	font-weight: 500;
}

.account-type {
	font-size: 28rpx;
	color: #666666;
	margin-top: 8rpx;
}

.account-actions {
	display: flex;
	align-items: center;
}

.default-badge {
	font-size: 24rpx;
	color: #07c160;
	padding: 4rpx 14rpx;
	background-color: #EAF6EE;
	border: 1rpx solid #07c160;
	border-radius: 20rpx;
	margin-right: 16rpx;
	line-height: 1.4;
}

.action-btn {
	font-size: 30rpx;
	color: #666666;
	padding: 20rpx 22rpx;
	min-height: 72rpx;
	min-width: 96rpx;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	border-radius: 12rpx;
	transition: background-color 0.15s ease-out;
}

.action-btn:active {
	background-color: #F0EBE3;
}

.delete-btn {
	color: #dd524d;
}

.delete-btn:active {
	background-color: #FDEBE7;
}

/* 空状态 */
.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 160rpx 40rpx;
}

.empty-text {
	font-size: 34rpx;
	color: #999999;
	margin-bottom: 12rpx;
}

.empty-hint {
	font-size: 28rpx;
	color: #BBBBBB;
}

/* Picker 下拉箭头指示 */
.picker-chevron {
	width: 28rpx;
	height: 28rpx;
	opacity: 0.5;
	transform: rotate(90deg);
}

.add-account-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: #ffffff;
	margin: 20rpx;
	padding: 24rpx;
	border-radius: 12rpx;
	border: 2rpx dashed #f0f0f0;
}

.add-icon {
	font-size: 58rpx;
	color: #07c160;
	margin-right: 12rpx;
}

.add-text {
	font-size: 32rpx;
	color: #07c160;
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
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
}

.modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 30rpx;
	border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
	font-size: 38rpx;
	font-weight: bold;
	color: #333333;
}

.modal-close {
	width: 88rpx;
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background-color 0.15s ease-out;
}

.modal-close:active {
	background-color: #F0EBE3;
}

.modal-close-icon {
	font-size: 48rpx;
	color: #999999;
	line-height: 1;
	font-weight: 300;
}

.modal-body {
	padding: 30rpx;
}

.form-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.form-item:last-child {
	border-bottom: none;
}

.form-label {
	font-size: 32rpx;
	color: #333333;
}

.form-input {
	flex: 1;
	text-align: right;
	font-size: 34rpx;
	color: #666666;
}

.picker-value {
	font-size: 34rpx;
	color: #666666;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 12rpx;
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

.confirm-btn {
	color: #07c160;
}

/* Tabbar */
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
.tab-item .tab-icon {
	transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.tab-item.active .tab-icon {
	transform: scale(1.2);
}

</style>