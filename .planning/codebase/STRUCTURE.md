<!-- refreshed: 2026-05-11 -->
# Codebase Structure

**Analysis Date:** 2026-05-11

## Directory Layout

SuiShouJi/
- pages/ - Page components (8 pages): index, add, records, stats, budget, category, account, my
- components/ - Reusable Vue components: category-picker, amount-keyboard, pie-chart, line-chart, ring-chart, bill-item, stat-card
- store/ - Pinia stores: bill.js, category.js, account.js, budget.js, sync.js, index.js
- utils/ - Utility functions: storage.js, db.js, schema.js, auth.js, export.js, init-data.js
- cloudfunctions/ - Cloud functions: login/index.js, sync-data/index.js
- common/ - Shared styles: style.scss, flex.scss
- static/ - Static assets: tabbar/ icons
- App.vue - App entry component
- main.js - Application entry point
- unpackage/ - Build output (generated)

## Directory Purposes

**pages/:** Main application screens. 8 page directories with .vue files.
Key: index/index.vue, add/add.vue, records/records.vue

**components/:** Reusable UI components. 7 component directories.
Key: category-picker/category-picker.vue, amount-keyboard/amount-keyboard.vue

**store/:** Pinia state management. 5 store files plus index aggregator.
Key: bill.js, category.js, account.js, budget.js, sync.js

**utils/:** Shared utility functions. 6 utility files.
Key: storage.js (getStorage/setStorage), db.js (CRUD), schema.js (constants)

**cloudfunctions/:** Server-side cloud functions for auth and sync.
Key: login/index.js, sync-data/index.js

**common/:** Shared SCSS styles.
Key: style.scss (colors, fonts, spacing), flex.scss (layout utilities)

**static/:** Static assets like tabbar icons.

## Key File Locations

**Entry Points:**
- App.vue - App root component
- main.js - Application bootstrap

**Configuration:**
- utils/schema.js - Storage key constants and field definitions

**Core Logic:**
- store/bill.js - Record CRUD and statistics
- store/category.js - Category management
- store/account.js - Account management
- store/budget.js - Budget tracking
- store/sync.js - Cloud synchronization

**Testing:** Not detected (no test framework configured)

## Naming Conventions

**Files:**
- Pages: PascalCase.vue (add.vue)
- Components: PascalCase.vue
- Stores: camelCase.js
- Utils: camelCase.js
- Cloud functions: camelCase/index.js

**Functions/Variables:**
- Store state: camelCase (records, lastSyncTime)
- Store actions: camelCase (loadRecords, addRecord)
- Store getters: camelCase (todayRecords, currentBudget)
- Utils: camelCase (getStorage, syncRecordToCloud)

**Constants:**
- Storage keys: ssj_ prefix (ssj_records, ssj_categories)
- Category codes: UPPER_SNAKE_CASE (FOOD, TRANSPORT)
- Table names: UPPER_SNAKE_CASE (RECORD, CATEGORY)

## Where to Add New Code

**New Page:** pages/<feature>/<feature>.vue
**New Component:** components/<component-name>/<component-name>.vue
**New Store:** store/<name>.js, export from store/index.js
**New Utility:** utils/<name>.js with named exports
**New Cloud Function:** cloudfunctions/<name>/index.js

## Page Organization

Each page is self-contained with:
- Single .vue file (template, script, styles)
- Custom bottom tabbar (not using UniApp tabbar system)

### Navigation Pattern

Main tabbar pages - use reLaunch:
- uni.reLaunch({ url: /pages/index/index })
- uni.reLaunch({ url: /pages/records/records })

Sub-pages/Editor - use navigateTo:
- uni.navigateTo({ url: /pages/add/add })

Edit mode - pass recordId via query:
- uni.navigateTo({ url: /pages/add/add?recordId=${record.id} })

## Store Organization

| Store | State | Key Getters | Key Actions |
|-------|-------|------------|-------------|
| bill | records[] | todayRecords, todayExpense | loadRecords, addRecord, updateRecord |
| category | categories[] | expenseCategories, getCategoryByCode | loadCategories, addCategory |
| account | accounts[] | allAccounts, defaultAccount | loadAccounts, addAccount, updateBalance |
| budget | budgets{} | currentBudget, usageRatio | loadBudgets, setBudget |
| sync | syncStatus, pendingSync[] | isSyncing, isSynced | syncToCloud, pullFromCloud |

## Storage Key Convention

All storage keys use plural form with ssj_ prefix:
- ssj_records - Bill records (store/bill.js)
- ssj_categories - Categories (store/category.js)
- ssj_accounts - Accounts (store/account.js)
- ssj_budgets - Budgets (store/budget.js)
- ssj_users - User info (utils/auth.js)
- ssj_sync_status - Sync state (store/sync.js)

## Field Naming (from utils/schema.js)

**record:** id, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status

**category:** id, code, name, icon, color, type, sort, is_default

**account:** id, code, name, type, balance, sort, is_default, create_time, update_time

**budget:** id, year_month, total_budget, create_time, update_time

---

*Structure analysis: 2026-05-11*
