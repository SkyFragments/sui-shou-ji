<!-- refreshed: 2026-05-11 -->
# Architecture

**Analysis Date:** 2026-05-11

## System Overview



## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| Bill Store | CRUD for records, statistics | store/bill.js |
| Category Store | Category management (expense/income) | store/category.js |
| Account Store | Account management (cash, alipay, etc.) | store/account.js |
| Budget Store | Monthly budget tracking | store/budget.js |
| Sync Store | Cloud sync status and operations | store/sync.js |
| Category Picker | Category selection UI | components/category-picker/category-picker.vue |
| Amount Keyboard | Custom numeric input | components/amount-keyboard/amount-keyboard.vue |
| login cloud function | WeChat auth, openid retrieval | cloudfunctions/login/index.js |
| sync-data cloud function | Incremental data sync | cloudfunctions/sync-data/index.js |

## Pattern Overview

**Overall:** UniApp + Vue3 Composition API + Pinia + LocalStorage simulation

**Key Characteristics:**
- Vue3 Composition API with setup() in pages
- Pinia stores with defineStore for state management
- LocalStorage via uni.setStorageSync/uni.getStorageSync for persistence
- Cloud Functions for WeChat authentication and cloud sync
- Custom bottom tabbar on each page (not using UniApp built-in tabbar)

## Layers

**Pages Layer:**
- Purpose: UI screens and user interactions
- Location: pages/*/
- Contains: 8 main pages (index, add, records, stats, budget, category, account, my)
- Depends on: Pinia stores, Vue components
- Used by: UniApp routing (navigateTo, reLaunch)

**Components Layer:**
- Purpose: Reusable UI building blocks
- Location: components/*/
- Contains: 7 components
- Depends on: Pinia stores for data
- Used by: Pages

**Stores Layer (Pinia):**
- Purpose: Centralized state management and business logic
- Location: store/*.js
- Contains: bill, category, account, budget, sync stores
- Depends on: utils (storage.js, schema.js)
- Used by: Pages and Components
- Persistence: Sync state to LocalStorage via storage.js

**Utils Layer:**
- Purpose: Data access, schema definitions, authentication
- Location: utils/*.js
- Contains: db.js (CRUD), storage.js, schema.js, auth.js
- Depends on: UniApp APIs
- Used by: Stores, Pages

**Cloud Functions Layer:**
- Purpose: Server-side operations (auth, sync)
- Location: cloudfunctions/*/
- Contains: login, sync-data
- Depends on: wx-server-sdk
- Used by: auth.js, sync store

## Data Flow

### Add Record Flow
1. User fills form and clicks save in pages/add/add.vue
2. store/bill.js addRecord() creates new record object
3. utils/storage.js setStorage() persists via uni.setStorageSync
4. Returns to page with success toast

### Authentication Flow
1. User triggers login (implicit on first access or explicit in my page)
2. auth.js login() calls wx.login() to get code
3. auth.js cloudLogin() calls login cloud function with code
4. Cloud function returns openid, stored in LocalStorage
5. Falls back to mockLogin() if cloud unavailable

### Cloud Sync Flow
1. User triggers sync (after login, or manual)
2. store/sync.js pullFromCloud() calls db.js getCloudDb()
3. db.js pullFromCloud() queries ssj_records collection
4. Cloud function returns incremental changes
5. store/sync.js mergeFromCloud() updates LocalStorage

## Key Abstractions

**Storage Abstraction (storage.js):**
- getStorage(key), setStorage(key, value)
- Synchronous wrapper around uni.getStorageSync/uni.setStorageSync

**Database Abstraction (db.js):**
- getRecords(), insertRecord(), getCategories(), getBudgets()
- Module-level functions with synchronous LocalStorage

**Store Pattern (Pinia):**
- defineStore(name, { state, getters, actions })
- Files: store/bill.js, store/category.js, store/account.js, store/budget.js, store/sync.js

**Cloud Function Wrapper (auth.js):**
- Promise-based with fallback to mock
- Files: utils/auth.js

## Entry Points

**App Launch:** App.vue or main.js (implicit via UniApp)
**Add Record Page:** pages/add/add.vue - Edit mode via ?recordId=xxx query param
**Sync Trigger:** store/sync.js triggerFirstSync() - Called after successful login

## Architectural Constraints

- No server-side rendering: Pure client-side mini-program
- LocalStorage simulation: Uses LocalStorage instead of real database
- Cloud functions: WeChat cloud functions for auth and sync
- No built-in tabbar: Custom tabbar implementation on each page
- Synchronous storage: All storage operations are synchronous

## Anti-Patterns

### Cloud Function Fallback Silently Masks Errors
What happens: auth.js cloudLogin() catches errors and falls back to mock without clear user feedback
Do this instead: Show offline mode indicator when cloud unavailable

### Store Actions Outside defineStore Block
What happens: store/bill.js has syncToCloudAfterAdd and syncFromCloud outside defineStore block
Do this instead: Move these into actions block within defineStore

### Duplicate Storage Key Constants
What happens: Storage keys defined in store/bill.js (ssj_records) and utils/schema.js (TABLE_NAMES)
Do this instead: Import from single source (utils/schema.js)

## Error Handling

**Strategy:** Try-catch with toast notifications and console warnings

**Patterns:**
- Storage errors: try-catch with console.error
- User-facing errors: uni.showToast()
- Cloud sync errors: Marked as offline, queued for later sync

## Cross-Cutting Concerns

**Logging:** console.error for errors, console.warn for warnings
**Validation:** Client-side validation before save
**Authentication:** WeChat openid-based, stored in ssj_users LocalStorage key

---

*Architecture analysis: 2026-05-11*
