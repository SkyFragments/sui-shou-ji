# Coding Conventions

**Analysis Date:** 2026/05/11

## Naming Patterns

### Files
- **JavaScript modules:** `camelCase.js` (e.g., `db.js`, `storage.js`, `auth.js`)
- **Vue components:** `kebab-case.vue` (e.g., `category-picker.vue`, `amount-keyboard.vue`)
- **Store files:** `camelCase.js` (e.g., `bill.js`, `category.js`, `account.js`)
- **Directories:** `kebab-case` for components, `camelCase` for stores/utils

### Functions and Variables
- **Functions:** `camelCase` (e.g., `loadCategories`, `addRecord`, `getCategoryByCode`)
- **Variables:** `camelCase` (e.g., `recordType`, `selectedCategoryCode`, `accountIndex`)
- **Constants (code constants):** `UPPER_SNAKE_CASE` (e.g., `EXPENSE_CATEGORY_CODES`, `DEFAULT_EXPENSE_CATEGORIES`)
- **Storage keys:** `ssj_` prefix + plural form (e.g., `ssj_records`, `ssj_categories`, `ssj_accounts`, `ssj_budgets`)

### Types and Interfaces
- **Not used:** Project is plain JavaScript/Vue2, no TypeScript interfaces defined

## Code Style

### Formatting
- **Indent:** 2 spaces for Vue templates, no enforced formatting for JS
- **Quotes:** Single quotes for strings in JS; double quotes in Vue templates
- **Semicolons:** Used in JavaScript files

### Linting/Formatting Tools
- **Prettier:** Active via hook for `.js`/`.vue` files
- **No ESLint config detected**

### Import Organization
```
1. Vue/UniApp built-in imports (e.g., 'uni', '@dcloudio/uni-app')
2. Pinia imports (e.g., 'pinia', 'vue')
3. Project store imports (e.g., '@/store/bill')
4. Project utils imports (e.g., '@/utils/storage', '@/utils/schema')
5. Component imports (e.g., '@/components/category-picker/category-picker.vue')
```

### Path Aliases
- `@/` maps to project root (e.g., `@/store/bill`, `@/utils/db`)

## Vue Component Patterns

### Structure (Options API with Composition)
```javascript
export default {
  name: 'ComponentName',
  components: { /* child components */ },
  props: { /* reactive inputs */ },
  emits: ['update:modelValue', 'select'],
  setup(props, { emit }) {
    // Store usage
    const billStore = useBillStore()

    // Reactive state
    const state = ref(initialValue)

    // Computed properties
    const computedValue = computed(() => { ... })

    // Methods
    const methodName = () => { ... }

    // Lifecycle
    onLoad((options) => { ... })

    return { /* expose to template */ }
  }
}
```

### Component Organization
1. Template section with scoped styles
2. Script section with imports, component definition, setup function
3. Style section with `scoped` attribute

## State Management (Pinia)

### Store Pattern
```javascript
import { defineStore } from 'pinia'
import { getStorage, setStorage } from '@/utils/storage'

const STORAGE_KEY = 'ssj_xxx'

export const useXxxStore = defineStore('xxx', {
  state: () => ({
    items: []
  }),

  getters: {
    allItems: (state) => state.items,
    getItemById: (state) => (id) => state.items.find(i => i.id === id)
  },

  actions: {
    loadItems() {
      const data = getStorage(STORAGE_KEY)
      this.items = data || []
      return this.items
    },

    addItem(item) {
      const now = Date.now()
      const newItem = {
        id: now.toString(),
        ...item,
        create_time: now,
        update_time: now
      }
      this.items.push(newItem)
      this.saveItems()
      return newItem
    },

    saveItems() {
      setStorage(STORAGE_KEY, this.items)
    }
  }
})
```

### Store Files
- `store/bill.js` - 账单记录管理 (records)
- `store/category.js` - 分类管理 (categories)
- `store/account.js` - 账户管理 (accounts)
- `store/budget.js` - 预算管理 (budgets)
- `store/sync.js` - 云端同步

## Storage Patterns

### Storage Key Convention (CRITICAL)
All storage keys MUST use plural form:
- `ssj_records` (NOT `ssj_record`)
- `ssj_categories` (NOT `ssj_category`)
- `ssj_accounts` (NOT `ssj_account`)
- `ssj_budgets` (NOT `ssj_budget`)
- `ssj_users`

### Storage Utility (`utils/storage.js`)
```javascript
import { getStorage, setStorage } from '@/utils/storage'

// Usage
const data = getStorage(STORAGE_KEY)
setStorage(STORAGE_KEY, newData)
```

## Field Naming Conventions

All field names must match `utils/schema.js`:

### Record Fields
- `id` - string, unique identifier
- `type` - number (1=支出/expense, 2=收入/income)
- `amount` - number, monetary amount
- `category_code` - string, category identifier
- `category_name` - string, category display name
- `account_code` - string, account identifier
- `remark` - string, optional note
- `record_date` - string, date in YYYY-MM-DD format
- `create_time` - number, timestamp
- `update_time` - number, timestamp
- `sync_status` - number (0=unsynced, 1=synced)

### Category Fields
- `id` - string
- `code` - string, category code
- `name` - string, display name
- `icon` - string, emoji icon
- `color` - string, hex color
- `type` - number (1=expense, 2=income)
- `sort` - number, display order
- `is_default` - number (1=default, 0=custom)

### Account Fields
- `id` - string
- `code` - string, account code
- `name` - string, display name
- `type` - string (cash, alipay, wechat, bankcard)
- `balance` - number
- `sort` - number
- `is_default` - number

## Error Handling Patterns

### Store Actions
```javascript
// Validation with early return
addRecord(record) {
  if (!record.amount) {
    return null
  }
  // proceed
}

// Try-catch for async operations
async syncToCloud(openid) {
  try {
    const { getCloudDb } = await import('@/utils/db')
    const db = getCloudDb()
    if (!db) return { offline: true }
    // operation
    return { success: true }
  } catch (e) {
    console.error('Sync failed:', e)
    return { success: false, error: e }
  }
}
```

### Page-Level Error Handling
```javascript
const onSave = async () => {
  try {
    // validate
    if (!amount.value) {
      uni.showToast({ title: '请输入金额', icon: 'none' })
      return
    }
    // save
    await billStore.addRecord(data)
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (error) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}
```

## Navigation Patterns

### Tab Bar Main Pages
- Use `uni.reLaunch` for main navigation (preserves tabbar state)
```javascript
uni.reLaunch({ url: '/pages/index/index' })
uni.reLaunch({ url: '/pages/records/records' })
```

### Sub-Pages / Edit Pages
- Use `uni.navigateTo` for secondary pages
```javascript
uni.navigateTo({ url: '/pages/add/add?recordId=xxx' })
```

### Page Parameters
- Edit mode passed via `?recordId=xxx` URL parameter
- `onLoad((options) => { ... })` to receive parameters

## Comment Style

### File Header Block
```javascript
/**
 * Category Store - 分类管理
 * 随手记 - 个人记账小程序
 */
```

### Section Comments
```javascript
// ========== Record 表操作 ==========
// 存储键名
// 默认支出分类
```

## Anti-Patterns Observed

### Console.warn in Production
Found in `store/category.js` line 124 and `store/account.js` line 105:
```javascript
console.warn('Cannot delete default category')
console.warn('Cannot delete default account')
```
These should be replaced with proper error handling or removed.

### Mutations in Getters
Getters in stores are documented as state accessors but some compute new arrays inline:
```javascript
expenseCategories(state) {
  return state.categories.filter(c => c.type === 1).sort((a, b) => a.sort - b.sort)
}
```
This is actually safe (returns new array), but the pattern is not consistent across all getters.

---

*Convention analysis: 2026/05/11*
