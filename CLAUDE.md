# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

随手记 (SuiShouJi) - 个人记账小程序，基于 UniApp + Vue3 + Pinia构建，使用 LocalStorage 模拟数据持久化。

## Storage Key Convention

**所有存储键必须使用复数形式：**
- `ssj_records` (NOT `ssj_record`)
- `ssj_categories` (NOT `ssj_category`)
- `ssj_accounts` (NOT `ssj_account`)
- `ssj_budgets` (NOT `ssj_budget`)
- `ssj_users` (NOT `ssj_user`)

修改 `utils/db.js`、`utils/init-data.js`、`utils/schema.js` 中的 TABLE_NAMES 和 `store/sync.js` 中的 mergeFromCloud 时必须遵循此规范。

## Field Naming

所有字段名必须与 `utils/schema.js` 中定义一致：
- **record**: id, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status
- **category**: id, code, name, icon, color, type, sort, is_default
- **account**: id, code, name, type, balance, sort, is_default, create_time, update_time
- **budget**: id, year_month, total_budget, create_time, update_time

## Architecture

### Stores (Pinia)
- `store/bill.js` - 账单记录管理
- `store/category.js` - 分类管理
- `store/account.js` - 账户管理
- `store/budget.js` - 预算管理
- `store/sync.js` - 云端同步（使用 `setStorage`/`getStorage` 工具函数）

### Pages
每个页面都包含自定义底部导航栏(tabbar)，通过 `uni.reLaunch` 实现页面跳转。编辑模式通过URL参数 `?recordId=xxx` 传递。

### Components
- `components/category-picker/` - 分类选择器
- `components/amount-keyboard/` - 金额键盘
- `components/pie-chart/` - 饼图
- `components/line-chart/` - 折线图
- `components/ring-chart/` - 环形图

## Navigation Pattern

- 底部导航主要页面: 使用 `uni.reLaunch`
- 子页面/编辑页面: 使用 `uni.navigateTo`
- 首页快捷记账: 使用 `uni.navigateTo` 带 `?recordId` 参数

## Key Patterns

1. **预算存储**: `store/budget.js` 内部存储 `{year_month, total_budget, update_time}` 对象，但 `getBudget()` 返回 `total_budget` 数值
2. **分类类型**: `type=1` 表示支出，`type=2` 表示收入
3. **账单类型**: `type=1` 表示支出，`type=2` 表示收入