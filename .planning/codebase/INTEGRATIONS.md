# External Integrations

**Analysis Date:** 2026-05-11

## Cloud Functions (UniCloud)

**WeChat Authentication:**
- Location: cloudfunctions/login/index.js
- SDK: wx-server-sdk
- Auth method: cloud.DYNAMIC_CURRENT_ENV
- Collection: ssj_users (via cloud.database())

**Incremental Data Sync:**
- Location: cloudfunctions/sync-data/index.js
- SDK: wx-server-sdk
- Syncs collections: ssj_records, ssj_categories, ssj_accounts, ssj_budgets
- Uses update_time field for incremental sync with db.command.gt()

## WeChat Mini-Program Integration

**Authentication APIs (from utils/auth.js):**
- wx.login() - Get authorization code
- wx.checkSession() - Verify session validity
- wx.getUserProfile() - Get user info (requires desc)

**Storage Keys:**
- ssj_users - User data (openid, session_key, unionid)
- ssj_auth_token - Authentication token

## LocalStorage (Simulated Persistence)

**Storage Implementation:**
- Uses uni.getStorageSync() / uni.setStorageSync() - UniApp storage API
- Wrapper utilities in utils/storage.js

**Storage Keys:**
- ssj_records - Bill records array
- ssj_categories - Categories array
- ssj_accounts - Accounts array
- ssj_budgets - Budgets array
- ssj_sync_status - Sync state metadata
- ssj_users - User authentication data

## Data Schema (per utils/schema.js)

**Record Fields:**
- id, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status

**Category Fields:**
- id, code, name, icon, color, type, sort, is_default

**Account Fields:**
- id, code, name, type, balance, sort, is_default, create_time, update_time

**Budget Fields:**
- id, year_month, total_budget, create_time, update_time

## Cloud Sync Architecture

**Sync Flow (store/sync.js):**
1. syncToCloud() - Push local data to ssj_sync collection
2. pullFromCloud() - Fetch latest from ssj_sync ordered by timestamp
3. mergeFromCloud() - Replace local storage with cloud data
4. syncPendingData() - Queue-based offline sync

**Cloud Collections:**
- ssj_sync - Main sync collection (stores records, categories, accounts, budgets)
- ssj_users - User authentication and metadata

**Offline Handling:**
- Pending sync queue stored in ssj_sync_status
- Automatic sync on network recovery

## Authentication Flow

**Primary Flow (utils/auth.js):**
1. login() calls wx.login() to get code
2. cloudLogin() calls uniCloud.callFunction('login')
3. Falls back to mockLogin() if cloud unavailable

**Session Validation:**
- checkSession() - Validates via wx.checkSession()
- isLoggedIn() - Checks for stored openid
- getStoredUser() - Retrieves from ssj_users storage

## Chart Components

**Components Used:**
- components/pie-chart/ - Pie chart visualization
- components/line-chart/ - Line chart visualization
- components/ring-chart/ - Ring chart visualization
- Library likely: uCharts (common in UniApp)

## No External API Dependencies

**Not Used:**
- No third-party auth providers (WeChat native only)
- No external databases (UniCloud/LocalStorage only)
- No analytics services
- No payment gateways

## Required Environment Variables

**WeChat App ID:**
- Configured in manifest.json -> mp-weixin.appid
- Current placeholder: "YOUR_WECHAT_APPID"

**UniCloud Space:**
- Configured via HBuilderX IDE
- Cloud functions use DYNAMIC_CURRENT_ENV

---

*Integration audit: 2026-05-11*
