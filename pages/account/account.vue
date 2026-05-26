/**
 * 账户管理页面
 * 查看、添加、编辑、删除账户
 */
<template>
	<view class="account-page">
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
								{{ formData.type ? getAccountTypeName(formData.type) : '请选择' }}
							</view>
						</picker>
					</view>
					<view class="form-item">
						<text class="form-label">设为默认账户</text>
						<switch
							:checked="formData.is_default === 1"
							@change="onDefaultChange"
							color="var(--color-primary)"
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

export default {
	setup() {
		const accountStore = useAccountStore()

		const showAddModal = ref(false)
		const editingAccount = ref(null)
		const accountTypeIndex = ref(0)

		const formData = ref({
			name: '',
			type: 'cash',
			is_default: 0
		})

		const accountTypes = ['现金', '支付宝', '微信', '银行卡']

		onMounted(() => {
			accountStore.loadAccounts()
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
				cash: 'var(--color-primary)',
				alipay: '#1677ff',
				wechat: 'var(--color-primary)',
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
			uni.showModal({
				title: '确认删除',
				content: `确定要删除账户"${account.name}"吗？`,
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

		return {
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
			goToMy
		}
	}
}
</script>

<style scoped>
.account-page {
	min-height: 100vh;
	background-color: var(--color-background);
	padding-bottom: 120rpx;
}

.account-list {
	padding: 20rpx;
}

.account-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	background-color: var(--color-surface);
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
	font-size: 30rpx;
	color: var(--color-text-primary);
	font-weight: 500;
}

.account-type {
	font-size: 24rpx;
	color: var(--color-text-secondary);
	margin-top: 8rpx;
}

.account-actions {
	display: flex;
	align-items: center;
}

.default-badge {
	font-size: 22rpx;
	color: var(--color-primary);
	padding: 4rpx 12rpx;
	border: 1rpx solid var(--color-primary);
	border-radius: 20rpx;
	margin-right: 16rpx;
}

.action-btn {
	font-size: 26rpx;
	color: var(--color-text-secondary);
	padding: 8rpx 16rpx;
}

.delete-btn {
	color: var(--color-danger);
}

.add-account-btn {
	display: flex;
	align-items: center;
	justify-content: center;
	background-color: var(--color-surface);
	margin: 20rpx;
	padding: 24rpx;
	border-radius: 12rpx;
	border: 2rpx dashed var(--color-border);
}

.add-icon {
	font-size: 48rpx;
	color: var(--color-primary);
	margin-right: 12rpx;
}

.add-text {
	font-size: 28rpx;
	color: var(--color-primary);
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
	background-color: var(--color-surface);
	border-radius: 16rpx;
	overflow: hidden;
}

.modal-header {
	padding: 30rpx;
	border-bottom: 1rpx solid var(--color-border);
}

.modal-title {
	font-size: 32rpx;
	font-weight: bold;
	color: var(--color-text-primary);
}

.modal-body {
	padding: 30rpx;
}

.form-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx 0;
	border-bottom: 1rpx solid var(--color-border);
}

.form-item:last-child {
	border-bottom: none;
}

.form-label {
	font-size: 28rpx;
	color: var(--color-text-primary);
}

.form-input {
	flex: 1;
	text-align: right;
	font-size: 28rpx;
	color: var(--color-text-secondary);
}

.picker-value {
	font-size: 28rpx;
	color: var(--color-text-secondary);
}

.modal-footer {
	display: flex;
	border-top: 1rpx solid var(--color-border);
}

.btn {
	flex: 1;
	text-align: center;
	padding: 30rpx;
	font-size: 28rpx;
}

.cancel-btn {
	color: var(--color-text-secondary);
	border-right: 1rpx solid var(--color-border);
}

.confirm-btn {
	color: var(--color-primary);
}

/* Tabbar */
.tabbar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	height: 100rpx;
	background-color: var(--color-surface);
	display: flex;
	align-items: center;
	justify-content: space-around;
	border-top: 1rpx solid var(--color-border);
	padding-bottom: env(safe-area-inset-bottom);
}

.tab-item {
	flex: 1;
	text-align: center;
	font-size: 22rpx;
	color: var(--color-text-secondary);
}

.tab-item.active {
	color: var(--color-primary);
}

.add-tab {
	display: flex;
	align-items: center;
	justify-content: center;
}

.add-tab-icon {
	font-size: 56rpx;
	color: var(--color-primary);
}
</style>