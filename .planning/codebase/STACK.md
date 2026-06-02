# Technology Stack

**Analysis Date:** 2026-05-11

## Framework & Platform

**Primary Framework:**
- UniApp 3.x - Cross-platform mini-program framework (WeChat, Alipay, Baidu, Toutiao)
- Vue 3 - Progressive JavaScript framework for UI
- vueVersion: 3 (per manifest.json)

**State Management:**
- Pinia - Official Vue 3 state management library
  - Used in: store/bill.js, store/category.js, store/account.js, store/budget.js, store/sync.js

## Languages

**Primary:**
- JavaScript (ES6+) - Main application code
- Vue 3 Composition API - Component logic
- SCSS - Styling with uni.scss for theme variables

**Platform-Specific:**
- WeChat Mini-Program API - wx.login(), wx.checkSession(), wx.getUserProfile()
- UniCloud API - uniCloud.callFunction() for cloud functions

## Build & Development

**Development Server:**
- Vite (detected via unpackage/dist/cache/.vite/)
- HBuilderX - Primary IDE for UniApp development

**Build Output:**
- Target platforms: mp-weixin (WeChat Mini-Program)
- Output directory: unpackage/dist/dev/mp-weixin/

**Configuration Files:**
- manifest.json - App configuration (appid, permissions, module settings)
- pages.json - Page routing and global styles
- uni.scss - UniApp built-in SCSS variables
- No package.json at project root (managed by HBuilderX/UniCloud)

## Dependencies (Bundled)

**Core:**
- uni-app - Framework core
- pinia - State management
- vue - UI framework

**Charting:**
- uCharts (likely, based on chart components)

**Storage:**
- LocalStorage via uni.getStorageSync() / uni.setStorageSync() - Simulated persistence

## Key Utilities

**Storage Layer:**
- utils/storage.js - getStorage(), setStorage(), removeStorage(), clearStorage()
- utils/db.js - Database operations wrapper
- utils/schema.js - Data schema definitions

**Authentication:**
- utils/auth.js - WeChat login, session management
- cloudfunctions/login/ - WeChat code exchange via wx-server-sdk

**Data Sync:**
- store/sync.js - Cloud sync store with syncToCloud(), pullFromCloud()
- cloudfunctions/sync-data/ - Incremental sync via wx-server-sdk

**Initialization:**
- utils/init-data.js - Default categories, accounts setup
- utils/export.js - Data export functionality

## SCSS Variables & Theming

**Theme Colors (from uni.scss):**
- primary: #007aff
- success: #4cd964
- warning: #f0ad4e
- error: #dd524d

**Typography:**
- sm: 12px, base: 14px, lg: 16px

**Spacing:**
- row-sm: 5px, row-base: 10px, row-lg: 15px

**Border Radius:**
- sm: 2px, base: 3px, lg: 6px

## Platform Configuration

**WeChat Mini-Program (mp-weixin):**
- appid: "YOUR_WECHAT_APPID" (placeholder in manifest.json)
- urlCheck: false
- usingComponents: true
- Permissions: Camera, Location, Storage, Network states

**Android Permissions (in manifest.json):**
- Network state, WiFi state, Phone state, Camera, Storage, Vibrate, Wake lock

## Architecture Notes

**Storage Key Convention (per CLAUDE.md):**
- ssj_records (plural)
- ssj_categories (plural)
- ssj_accounts (plural)
- ssj_budgets (plural)
- ssj_users (plural)

**Record Type Convention (per CLAUDE.md):**
- type=1 = expense
- type=2 = income

---

*Stack analysis: 2026-05-11*
