# PRD: 随手记云端同步功能

## 1. 概述

为随手记小程序添加用户认证和云端数据同步功能，实现多设备间账单数据实时同步，并为家庭/小团队共享记账场景预留扩展。

**解决的核心问题**：
- 用户更换设备后数据丢失
- 多设备使用时数据不一致
- 家庭成员无法共享账本

---

## 2. 目标

- **G-1**: 用户一键登录微信，5秒内完成认证
- **G-2**: 登录后自动同步数据，成功率 ≥ 99%
- **G-3**: 账单数据在多设备间延迟 < 3秒
- **G-4**: 支持 CSV 和 Excel 格式导出
- **G-5**: 预留 openid 字段支持未来扩展家庭共享

---

## 3. 用户故事

### US-001: 微信一键登录
**描述**: 作为用户，我希望微信一键登录，无需注册密码。

**验收标准**:
- [ ] 未登录用户显示"点击登录"按钮
- [ ] 点击后调用 `wx.login()` 获取 code
- [ ] code 发送到云函数换取 openid，存储到 `ssj_users`
- [ ] 登录成功后显示用户 openid（短号，前8位）
- [ ] 登录状态持久化，关闭小程序重新打开无需重新登录
- [ ] Typecheck 通过

---

### US-002: 首次登录全量同步
**描述**: 作为新用户，登录后自动将云端数据拉取到本地，若云端无数据则上传本地数据。

**验收标准**:
- [ ] 调用 `syncStore.triggerFirstSync()`
- [ ] 拉取云端数据并覆盖本地（若云端有数据）
- [ ] 上传本地数据到云端（若云端无数据）
- [ ] 显示同步进度 `uni.showLoading`
- [ ] 同步完成后 `lastSyncTime` 更新
- [ ] 同步失败时弹出错误提示
- [ ] Typecheck 通过

---

### US-003: 日常增量同步
**描述**: 作为老用户，每次新增/修改/删除账单后自动同步到云端。

**验收标准**:
- [ ] `billStore.addRecord()` 后调用 `syncToCloud()`
- [ ] `billStore.updateRecord()` 后调用 `syncToCloud()`
- [ ] `billStore.deleteRecord()` 后调用 `syncToCloud()`
- [ ] 同步为异步，不阻塞用户操作
- [ ] 同步失败时数据存入 `pendingSync` 队列
- [ ] 网络恢复后自动重试待同步数据
- [ ] Typecheck 通过

---

### US-004: 冲突处理
**描述**: 当多设备同时修改同一记录，以最新 `update_time` 为准。

**验收标准**:
- [ ] 拉取云端数据时比较 `update_time`
- [ ] 本地数据 `update_time` 较新则保留本地
- [ ] 云端数据 `update_time` 较新则覆盖本地
- [ ] 合并后的数据再次上传到云端
- [ ] Typecheck 通过

---

### US-005: 数据导出 CSV
**描述**: 作为用户，我想导出账单到 CSV 文件，方便在 Excel 中分析。

**验收标准**:
- [ ] 在"我的"页面点击"数据导出"
- [ ] 弹出月份选择器，默认当前月份
- [ ] 调用 `exportToCSV()` 生成 CSV 格式
- [ ] 使用 `uni.saveFile()` 保存到本地
- [ ] 使用 `uni.openDocument()` 打开文件
- [ ] 导出成功显示文件路径
- [ ] Typecheck 通过

---

### US-006: 数据导出 Excel
**描述**: 作为用户，我想导出账单到 xlsx 文件，保留格式和公式。

**验收标准**:
- [ ] CSV 导出选项下方增加"导出 Excel"选项
- [ ] 使用 `xlsx` 库生成 .xlsx 文件
- [ ] 表头：日期、类型、分类、账户、金额、备注
- [ ] 支出显示红色，收入显示绿色
- [ ] 金额列使用数字格式，非文本
- [ ] 使用 `uni.saveFile()` + `uni.openDocument()` 打开
- [ ] Typecheck 通过

---

### US-007: 云函数 login
**描述**: 作为开发者，需要创建云函数处理微信 code 换取 openid。

**验收标准**:
- [ ] 在 `cloudfunctions/login/` 创建云函数
- [ ] 接收参数 `{ code }`
- [ ] 调用微信接口 `SnsService.code2Session`
- [ ] 返回 `{ openid, session_key, unionid }`
- [ ] 部署到微信云开发环境
- [ ] 本地调用测试通过

---

### US-008: 云函数 sync-data
**描述**: 作为开发者，需要创建云函数处理增量数据同步。

**验收标准**:
- [ ] 在 `cloudfunctions/sync-data/` 创建云函数
- [ ] 接收 `{ openid, last_sync_time }`
- [ ] 返回 `last_sync_time` 之后的所有增量数据
- [ ] 支持记录、分类、账户、预算四种数据
- [ ] 按 `update_time` 降序排列
- [ ] 部署到微信云开发环境
- [ ] 本地调用测试通过

---

## 4. 功能需求

### FR-1: 用户认证
- FR-1.1: `utils/auth.js` 提供 `login()` / `checkSession()` / `getStoredUser()` / `isLoggedIn()` / `logout()`
- FR-1.2: `store/sync.js` 登录成功后调用 `triggerFirstSync()`
- FR-1.3: `pages/my/my.vue` 显示已登录/未登录两种状态

### FR-2: 云端同步
- FR-2.1: `utils/db.js` 改用 `uniCloud.database()` 替代 `uni.getStorageSync`
- FR-2.2: 所有 Store 的 CRUD 操作同步到云端
- FR-2.3: 离线时数据存入 `pendingSync` 队列
- FR-2.4: 网络恢复后自动重试

### FR-3: 数据导出
- FR-3.1: `utils/export.js` 实现 `exportToExcel()` 函数
- FR-3.2: 支持选择月份范围（开始月份 - 结束月份）
- FR-3.3: 支出金额红色显示，收入金额绿色显示

### FR-4: 云函数
- FR-4.1: `cloudfunctions/login/` - 微信 code 换 openid
- FR-4.2: `cloudfunctions/sync-data/` - 增量数据同步

---

## 5. 非目标

- 不实现真实家庭共享（Phase 3 范围）
- 不实现 Web 版访问
- 不实现服务端统计聚合（客户端先行）
- 不实现推送提醒（Phase 4）

---

## 6. 技术方案

### 6.1 技术栈
- **前端**: UniApp + Vue3 + Pinia
- **后端**: 微信云开发（uniCloud）
- **数据库**: 微信云数据库
- **导出**: xlsx 库

### 6.2 数据库设计

```
集合: ssj_users
{
  _id: string,
  openid: string,
  default_budget: number,
  last_sync_time: number,
  create_time: number
}

集合: ssj_records
{
  _id: string,
  openid: string,
  id: string,
  type: number,
  amount: number,
  category_code: string,
  category_name: string,
  account_code: string,
  remark: string,
  record_date: string,
  create_time: number,
  update_time: number,
  sync_status: number
}

集合: ssj_categories / ssj_accounts / ssj_budgets
类似结构，含 openid 字段
```

### 6.3 同步策略

```
首次登录: 全量拉取 → 合并本地
日常使用: 本地优先 → 异步上报云端
冲突处理: compare update_time → 保留最新
离线队列: pendingSync[] → 网络恢复重试
```

---

## 7. 验收里程碑

### M1: 认证完成（第 1 天）
- [ ] 用户可微信登录
- [ ] openid 存储到 `ssj_users`
- [ ] "我的"页面显示登录状态

### M2: 云函数完成（第 2 天）
- [ ] `login` 云函数部署成功
- [ ] `sync-data` 云函数部署成功
- [ ] 本地调用测试通过

### M3: 同步完成（第 3-4 天）
- [ ] 新增记录自动同步
- [ ] 修改记录自动同步
- [ ] 删除记录自动同步
- [ ] 离线队列工作正常

### M4: 导出完成（第 5 天）
- [ ] CSV 导出可用
- [ ] Excel 导出可用
- [ ] 月份选择器工作正常

### M5: 集成测试通过（第 6 天）
- [ ] 设备 A 添加记录，设备 B 可见
- [ ] 多设备同时修改，取最新
- [ ] 导出文件格式正确

---

## 8. 关键文件

| 文件 | 作用 | 状态 |
|------|------|------|
| `utils/auth.js` | 鉴权工具 | 已创建 |
| `store/sync.js` | 同步管理 | 已修改 |
| `pages/my/my.vue` | 登录入口 | 已修改 |
| `manifest.json` | appid 配置 | 已修改 |
| `cloudfunctions/login/` | **新建** - 登录云函数 | 待创建 |
| `cloudfunctions/sync-data/` | **新建** - 同步云函数 | 待创建 |
| `utils/db.js` | 改用云数据库 | 待修改 |
| `utils/export.js` | 添加 Excel 导出 | 待修改 |
| `store/bill.js` | 云端 CRUD | 待修改 |
| `store/category.js` | 云端同步 | 待修改 |
| `store/account.js` | 云端同步 | 待修改 |
| `store/budget.js` | 云端同步 | 待修改 |

---

## 9. Open Questions

- Q1: 是否需要支持微信订阅消息推送同步状态？
  - 决策: 否，当前版本仅本地状态显示
- Q2: 是否需要加密存储敏感数据？
  - 决策: 否，微信云开发已加密传输
- Q3: 旧用户数据迁移方案？
  - 决策: 首次登录时自动上传本地数据