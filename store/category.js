/**
 * Category Store - 分类管理
 * 随手记 - 个人记账小程序
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { postCategory, putCategory, deleteCategory } from '@/utils/api'
import { useSyncStore } from '@/store/sync'
import { generateId } from '@/utils/db'
import {
  EXPENSE_CATEGORY_CODES,
  INCOME_CATEGORY_CODES
} from '@/utils/schema'

// 存储键名
const STORAGE_KEY = 'ssj_categories'

// 默认支出分类
const DEFAULT_EXPENSE_CATEGORIES = [
  { code: EXPENSE_CATEGORY_CODES.FOOD, name: '餐饮', icon: 'meal', color: '#FF6B6B', type: 1, sort: 1, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.TRANSPORT, name: '交通', icon: 'car', color: '#4ECDC4', type: 1, sort: 2, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.SHOPPING, name: '购物', icon: 'shopping', color: '#45B7D1', type: 1, sort: 3, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.ENTERTAINMENT, name: '娱乐', icon: 'movie', color: '#96CEB4', type: 1, sort: 4, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.LIVING, name: '居住', icon: 'home', color: '#DDA0DD', type: 1, sort: 5, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.MEDICAL, name: '医疗', icon: 'health', color: '#98D8C8', type: 1, sort: 6, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.EDUCATION, name: '教育', icon: 'box', color: '#F7DC6F', type: 1, sort: 7, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.COMMUNICATION, name: '通讯', icon: 'phone', color: '#85C1E9', type: 1, sort: 8, is_default: 1 },
  { code: EXPENSE_CATEGORY_CODES.OTHER, name: '其他', icon: 'box', color: '#BB8FCE', type: 1, sort: 9, is_default: 1 }
]

// 默认收入分类
const DEFAULT_INCOME_CATEGORIES = [
  { code: INCOME_CATEGORY_CODES.SALARY, name: '工资', icon: 'wallet', color: '#27AE60', type: 2, sort: 1, is_default: 1 },
  { code: INCOME_CATEGORY_CODES.SIDE_JOB, name: '副业', icon: 'gift', color: '#3498DB', type: 2, sort: 2, is_default: 1 },
  { code: INCOME_CATEGORY_CODES.INVESTMENT, name: '投资', icon: 'box', color: '#E74C3C', type: 2, sort: 3, is_default: 1 },
  { code: INCOME_CATEGORY_CODES.OTHER_INCOME, name: '其他', icon: 'box', color: '#95A5A6', type: 2, sort: 4, is_default: 1 }
]

// 初始化分类数据
function initCategories() {
  return [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES]
}

export const useCategoryStore = defineStore('category', {
  state: () => ({
    categories: []
  }),

  getters: {
    // 获取所有分类
    allCategories: (state) => state.categories,

    // 获取支出分类
    expenseCategories(state) {
      return state.categories.filter(c => c.type === 1).sort((a, b) => a.sort - b.sort)
    },

    // 获取收入分类
    incomeCategories(state) {
      return state.categories.filter(c => c.type === 2).sort((a, b) => a.sort - b.sort)
    },

    // 按编码获取分类
    getCategoryByCode: (state) => (code) => {
      return state.categories.find(c => c.code === code)
    },

    // 按类型获取分类
    getCategoriesByType: (state) => (type) => {
      return state.categories.filter(c => c.type === type).sort((a, b) => a.sort - b.sort)
    }
  },

  actions: {
    // 加载分类
    loadCategories() {
      const data = getStorage(STORAGE_KEY)
      if (!data || data.length === 0) {
        // 初始化默认分类，必须带 id 才能上行到 (openid,id) 复合主键的表
        this.categories = initCategories().map(cat => ({ ...cat, id: cat.id || generateId() }))
      } else {
        // 迁移旧数据：把 emoji 图标替换为 SVG 名称，并补 id
        const emojiToIcon = {
          '🍜': 'meal', '🚗': 'car', '🛒': 'shopping', '🎮': 'game',
          '🏠': 'home', '💊': 'health', '📚': 'box', '📱': 'phone',
          '📦': 'box', '💰': 'wallet', '💼': 'gift', '📈': 'box',
          '💵': 'box'
        }
        this.categories = data.map(cat => {
          const newCat = { ...cat }
          if (!newCat.id) newCat.id = generateId()
          if (emojiToIcon[newCat.icon]) {
            newCat.icon = emojiToIcon[newCat.icon]
          }
          return newCat
        })
      }
      this.saveCategories()
      return this.categories
    },

    // 添加分类
    addCategory(category) {
      const newCategory = {
        id: generateId(),
        code: category.code || '',
        name: category.name || '',
        icon: category.icon || 'box',
        color: category.color || '#999999',
        type: category.type || 1,
        sort: category.sort || 0,
        is_default: 0
      }
      this.categories.push(newCategory)
      this.saveCategories()

      // Sync to cloud; failure queues for retry
      this.syncCategory(newCategory).catch(() => {
        useSyncStore().addPendingSync('category_upsert', newCategory)
      })

      return newCategory
    },

    // 更新分类
    updateCategory(code, updates) {
      const index = this.categories.findIndex(c => c.code === code)
      if (index !== -1) {
        this.categories[index] = {
          ...this.categories[index],
          ...updates
        }
        this.saveCategories()

        // Sync to cloud; failure queues for retry
        this.syncCategory(this.categories[index]).catch(() => {
          useSyncStore().addPendingSync('category_upsert', this.categories[index])
        })

        return this.categories[index]
      }
      return null
    },

    // 删除分类
    deleteCategory(code) {
      const index = this.categories.findIndex(c => c.code === code)
      if (index !== -1) {
        // 检查是否为默认分类
        if (this.categories[index].is_default === 1) {
          console.warn('Cannot delete default category')
          return false
        }
        const deletedCategory = this.categories[index]
        this.categories.splice(index, 1)
        this.saveCategories()

        // Sync delete to cloud (queue on failure for retry)
        this.syncDeleteFromCloud(deletedCategory.id).catch(() => {
          useSyncStore().addPendingSync('category_delete', { id: deletedCategory.id, ...deletedCategory })
        })

        return true
      }
      return false
    },

    // 从云端删除分类
    async syncDeleteFromCloud(id) {
      try {
        await deleteCategory(id)
        return { success: true }
      } catch (e) {
        console.error('Sync delete category failed:', e)
        return { success: false, error: e }
      }
    },

    // 保存到本地存储
    saveCategories() {
      setStorage(STORAGE_KEY, this.categories)
    },

    // 重置分类为默认
    resetCategories() {
      this.categories = initCategories()
      this.saveCategories()
    },

    // 同步单个分类到云端
    async syncCategory(category) {
      // 先尝试 PUT，失败回退 POST（处理新建 vs 更新）
      const { id, ...rest } = category
      try {
        await putCategory(id, rest)
        return { success: true }
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 400)) {
          await postCategory(category)
          return { success: true }
        }
        throw e
      }
    },

    // 同步所有分类到云端
    async syncToCloud() {
      try {
        for (const cat of this.categories) {
          await this.syncCategory(cat)
        }
        return { success: true }
      } catch (e) {
        console.error('Sync categories failed:', e)
        return { success: false, error: e }
      }
    }
  }
})
