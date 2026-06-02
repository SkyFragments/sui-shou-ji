/**
 * Template Store - 首页快捷记账模板管理
 * 随手记 - 个人记账小程序
 *
 * 数据形状参见 utils/schema.js TEMPLATE_COLUMNS
 * 本地持久化 + 云同步：本地立即写盘，云端失败入 pendingSync 重试
 *
 * 循环依赖说明：
 *   sync.js 顶层 import useTemplateStore；本文件也顶层 import useSyncStore
 *   Pinia 的 defineStore 返回 hook 函数（非实例），ESM 加载只解析函数引用，
 *   实例化发生在 useFoo() 调用瞬间，cycle 在「函数引用层面」无害
 *   与 category/account/budget store 现行模式一致
 *
 *   早期尝试动态 import('@/store/sync') 在小程序构建里 @/ 别名不解析 →
 *   useSyncStore 为 undefined 触发 TypeError，故回退顶层 import
 */

import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'
import { generateId } from '@/utils/db'
import { TABLE_NAMES, HOME_TEMPLATE_VISIBLE_LIMIT } from '@/utils/schema'
import { initTemplates } from '@/utils/init-data'
import { postTemplate, putTemplate, deleteTemplate, upsertByPutPost } from '@/utils/api'
import { useSyncStore } from '@/store/sync'

const STORAGE_KEY = TABLE_NAMES.TEMPLATE

export const useTemplateStore = defineStore('template', {
  state: () => ({
    templates: []
  }),

  getters: {
    // 全量模板（按 sort 升序）
    allTemplates(state) {
      return [...state.templates].sort((a, b) => (a.sort || 0) - (b.sort || 0))
    },

    // 首页可见模板（按 sort 升序，取前 N 个）
    visibleTemplates() {
      return this.allTemplates.slice(0, HOME_TEMPLATE_VISIBLE_LIMIT)
    },

    // 当前最大 sort 值（新增模板时排到末尾）
    maxSort(state) {
      if (state.templates.length === 0) return 0
      return state.templates.reduce((max, t) => Math.max(max, t.sort || 0), 0)
    },

    // 按 id 获取
    getTemplateById: (state) => (id) => {
      return state.templates.find(t => t.id === id) || null
    }
  },

  actions: {
    // 加载模板：仅 storage 键缺失时注入默认；空数组视为用户主动清空，不再回填
    loadTemplates() {
      const data = getStorage(STORAGE_KEY)
      if (data === null || data === undefined) {
        // 首次进入：注入默认
        this.templates = initTemplates().map(t => ({ ...t, id: t.id || generateId() }))
        this.saveTemplates()
      } else {
        // 旧数据迁移：补 id / type 字段；空数组保持空（用户已全删）
        this.templates = data.map(t => ({
          ...t,
          id: t.id || generateId(),
          type: t.type || 1
        }))
      }
      return this.templates
    },

    // 新增模板（自动排到末尾）
    addTemplate(template) {
      const now = Date.now()
      const newTemplate = {
        id: generateId(),
        name: template.name || '未命名',
        amount: Number(template.amount) || 0,
        type: template.type || 1,
        category_code: template.category_code || '',
        icon: template.icon || 'box',
        color: template.color || '#999999',
        sort: template.sort != null ? template.sort : this.maxSort + 1,
        is_default: 0,
        create_time: now,
        update_time: now
      }
      this.templates.push(newTemplate)
      this.saveTemplates()

      // 云同步：失败入 pendingSync 重试（syncTemplate 不内部 catch，让 .catch 真正触发）
      this.syncTemplate(newTemplate).catch(() => {
        useSyncStore().addPendingSync('template_upsert', newTemplate)
      })

      return newTemplate
    },

    // 更新模板
    updateTemplate(id, updates) {
      const index = this.templates.findIndex(t => t.id === id)
      if (index === -1) return null
      this.templates[index] = {
        ...this.templates[index],
        ...updates,
        amount: updates.amount != null ? Number(updates.amount) : this.templates[index].amount,
        update_time: Date.now()
      }
      this.saveTemplates()

      const updated = this.templates[index]
      this.syncTemplate(updated).catch(() => {
        useSyncStore().addPendingSync('template_upsert', updated)
      })

      return updated
    },

    // 删除模板（硬删，不区分默认/自定义）
    deleteTemplate(id) {
      const before = this.templates.length
      const removed = this.templates.find(t => t.id === id)
      this.templates = this.templates.filter(t => t.id !== id)
      if (this.templates.length === before) return false
      this.saveTemplates()

      // 云同步删除
      if (removed) {
        this.syncDeleteFromCloud(removed.id).catch(() => {
          useSyncStore().addPendingSync('template_delete', { id: removed.id, ...removed })
        })
      }

      return true
    },

    // 上移模板（与上一个交换 sort）
    moveUp(id) {
      const sorted = this.allTemplates
      const idx = sorted.findIndex(t => t.id === id)
      if (idx <= 0) return false
      const cur = sorted[idx]
      const prev = sorted[idx - 1]
      this.updateTemplate(cur.id, { sort: prev.sort })
      this.updateTemplate(prev.id, { sort: cur.sort })
      return true
    },

    // 下移模板
    moveDown(id) {
      const sorted = this.allTemplates
      const idx = sorted.findIndex(t => t.id === id)
      if (idx === -1 || idx >= sorted.length - 1) return false
      const cur = sorted[idx]
      const next = sorted[idx + 1]
      this.updateTemplate(cur.id, { sort: next.sort })
      this.updateTemplate(next.id, { sort: cur.sort })
      return true
    },

    // 重置为默认模板（同步删除所有云端模板 + 重新上传默认）
    // 注意：本操作有副作用，但保留原契约
    resetTemplates() {
      const oldIds = this.templates.map(t => t.id)
      // 重置时给默认模板填上 Date.now()，确保推到云端后是「最新」覆盖
      const now = Date.now()
      this.templates = initTemplates().map(t => ({
        ...t,
        id: t.id || generateId(),
        create_time: now,
        update_time: now
      }))
      this.saveTemplates()

      const sync = useSyncStore()
      // 删除旧云端模板，失败入队
      for (const id of oldIds) {
        this.syncDeleteFromCloud(id).catch(() => {
          sync.addPendingSync('template_delete', { id })
        })
      }
      // 重新上传默认模板
      this.syncToCloud().catch((e) => {
        console.warn('[template] reset → syncToCloud 失败：', e)
      })
    },

    // 写盘
    saveTemplates() {
      setStorage(STORAGE_KEY, this.templates)
    },

    // 同步单个模板到云端（PUT→POST 兜底）
    // 关键：不 try/catch 吞异常，让 Promise reject 真正传播到调用方的 .catch
    async syncTemplate(template) {
      await upsertByPutPost(putTemplate, postTemplate, template)
      return { success: true }
    },

    // 删除单个云端模板
    // 同上：不 catch，让调用方的 .catch 能挂到 addPendingSync
    async syncDeleteFromCloud(id) {
      await deleteTemplate(id)
      return { success: true }
    },

    // 全量同步（被 syncStore.syncToCloud 并发触发）
    // 此方法内部需要兜底：失败的模板**单独**入 pendingSync，不让整体失败拖累其他配置类
    async syncToCloud() {
      let allOk = true
      const sync = useSyncStore()
      for (const tpl of this.templates) {
        try {
          await this.syncTemplate(tpl)
        } catch (e) {
          allOk = false
          // 失败者入 pendingSync，下次网络恢复时重试
          sync.addPendingSync('template_upsert', tpl)
        }
      }
      return { success: allOk }
    }
  }
})
