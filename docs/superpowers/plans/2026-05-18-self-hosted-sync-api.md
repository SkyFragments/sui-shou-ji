# 自建服务器同步 API 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将微信小程序云同步从 uniCloud 迁移到自建 Node.js + Express + MySQL 服务器

**Architecture:** 小程序前端通过 REST API 与自建服务器通信，服务器管理 MySQL 数据库存储用户数据，使用 JWT token 进行认证

**Tech Stack:** Node.js, Express, mysql2, jsonwebtoken, axios

---

## 文件结构

```
server/
├── package.json           # 依赖管理
├── index.js               # 服务器入口
├── routes/
│   ├── auth.js            # 认证路由 (login)
│   ├── sync.js            # 同步路由 (get/sync)
│   ├── records.js         # 账单 CRUD
│   ├── categories.js      # 分类 CRUD
│   ├── accounts.js        # 账户 CRUD
│   └── budgets.js         # 预算 CRUD
├── middleware/
│   └── auth.js            # JWT 验证中间件
└── db/
    └── init.sql           # 数据库初始化 SQL

小程序端修改:
├── utils/api.js           # 新建: API 请求工具
├── utils/auth.js          # 修改: 替换 cloudLogin
├── store/sync.js          # 修改: 替换 uniCloud 调用
├── store/bill.js          # 修改: syncToCloud
├── store/category.js      # 修改: syncToCloud
├── store/account.js       # 修改: syncToCloud
└── store/budget.js        # 修改: syncToCloud
```

---

## Task 1: 服务器项目初始化

**Files:**
- Create: `server/package.json`
- Create: `server/index.js`
- Create: `server/.env.example`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "suishouji-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node index.js",
    "dev": "node --watch index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "jsonwebtoken": "^9.0.2",
    "axios": "^1.6.2",
    "dotenv": "^16.3.1"
  }
}
```

- [ ] **Step 2: 创建 .env.example**

```
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=suishouji
JWT_SECRET=your_jwt_secret_here
WECHAT_APPID=your_wechat_appid
WECHAT_SECRET=your_wechat_secret
```

- [ ] **Step 3: 创建服务器入口 index.js**

```js
import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import syncRoutes from './routes/sync.js'
import recordsRoutes from './routes/records.js'
import categoriesRoutes from './routes/categories.js'
import accountsRoutes from './routes/accounts.js'
import budgetsRoutes from './routes/budgets.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.use(express.json())

// 路由
app.use('/api/auth', authRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/records', recordsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/accounts', accountsRoutes)
app.use('/api/budgets', budgetsRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

- [ ] **Step 4: 提交**

```bash
git add server/package.json server/index.js server/.env.example
git commit -m "feat: init server project structure"
```

---

## Task 2: 数据库初始化 SQL

**Files:**
- Create: `server/db/init.sql`
- Create: `server/db/mysql.js`

- [ ] **Step 1: 创建 init.sql**

```sql
CREATE DATABASE IF NOT EXISTS suishouji DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE suishouji;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openid VARCHAR(64) UNIQUE NOT NULL,
  token VARCHAR(256),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS records (
  id VARCHAR(32) PRIMARY KEY,
  openid VARCHAR(64) NOT NULL,
  type INT NOT NULL COMMENT '1=支出 2=收入',
  amount DECIMAL(10,2) NOT NULL,
  category_code VARCHAR(16) NOT NULL,
  category_name VARCHAR(32),
  account_code VARCHAR(16) NOT NULL,
  remark TEXT,
  record_date DATE NOT NULL,
  create_time BIGINT NOT NULL,
  update_time BIGINT NOT NULL,
  sync_status INT DEFAULT 0,
  INDEX idx_openid (openid),
  INDEX idx_record_date (record_date),
  INDEX idx_update_time (update_time)
);

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(32) PRIMARY KEY,
  openid VARCHAR(64) NOT NULL,
  code VARCHAR(16) NOT NULL,
  name VARCHAR(32) NOT NULL,
  icon VARCHAR(8),
  color VARCHAR(16),
  type INT NOT NULL COMMENT '1=支出 2=收入',
  sort INT DEFAULT 0,
  is_default INT DEFAULT 0,
  UNIQUE INDEX idx_openid_code (openid, code),
  INDEX idx_openid (openid)
);

CREATE TABLE IF NOT EXISTS accounts (
  id VARCHAR(32) PRIMARY KEY,
  openid VARCHAR(64) NOT NULL,
  code VARCHAR(16) NOT NULL,
  name VARCHAR(32) NOT NULL,
  type VARCHAR(16),
  balance DECIMAL(10,2) DEFAULT 0,
  sort INT DEFAULT 0,
  is_default INT DEFAULT 0,
  create_time BIGINT,
  update_time BIGINT,
  UNIQUE INDEX idx_openid_code (openid, code),
  INDEX idx_openid (openid)
);

CREATE TABLE IF NOT EXISTS budgets (
  id VARCHAR(32) PRIMARY KEY,
  openid VARCHAR(64) NOT NULL,
  year_month VARCHAR(7) NOT NULL,
  total_budget DECIMAL(10,2) NOT NULL,
  create_time BIGINT,
  update_time BIGINT,
  UNIQUE INDEX idx_openid_month (openid, year_month),
  INDEX idx_openid (openid)
);
```

- [ ] **Step 2: 创建 mysql.js 连接池**

```js
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'suishouji',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export default pool
```

- [ ] **Step 3: 提交**

```bash
git add server/db/init.sql server/db/mysql.js
git commit -m "feat: add database schema and connection pool"
```

---

## Task 3: 认证中间件和路由

**Files:**
- Create: `server/middleware/auth.js`
- Create: `server/routes/auth.js`

- [ ] **Step 1: 创建 auth 中间件**

```js
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

dotenv.config()

export function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.substring(7)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

- [ ] **Step 2: 创建 auth 路由**

```js
import express from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import pool from '../db/mysql.js'

dotenv.config()

const router = express.Router()

// 微信 code 换 openid，发放 JWT
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ error: 'code required' })
    }

    // 调用微信接口获取 openid
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    const wxRes = await axios.get(wxUrl)
    const { openid, session_key, unionid } = wxRes.data

    if (!openid) {
      return res.status(400).json({ error: 'Invalid code' })
    }

    // 查找或创建用户
    const [rows] = await pool.execute('SELECT * FROM users WHERE openid = ?', [openid])
    let userId
    if (rows.length === 0) {
      const [insertResult] = await pool.execute('INSERT INTO users (openid) VALUES (?)', [openid])
      userId = insertResult.insertId
    } else {
      userId = rows[0].id
    }

    // 生成 JWT
    const token = jwt.sign({ openid, userId }, process.env.JWT_SECRET, { expiresIn: '30d' })

    // 更新用户 token
    await pool.execute('UPDATE users SET token = ? WHERE id = ?', [token, userId])

    res.json({ success: true, token, openid })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router
```

- [ ] **Step 3: 提交**

```bash
git add server/middleware/auth.js server/routes/auth.js
git commit -m "feat: add JWT auth middleware and login route"
```

---

## Task 4: 同步路由

**Files:**
- Create: `server/routes/sync.js`

- [ ] **Step 1: 创建 sync 路由**

```js
import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// 获取增量数据
router.get('/', verifyToken, async (req, res) => {
  try {
    const { last_sync_time = 0 } = req.query
    const openid = req.user.openid

    const [records] = await pool.execute(
      'SELECT * FROM records WHERE openid = ? AND update_time > ? ORDER BY update_time ASC',
      [openid, last_sync_time]
    )
    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE openid = ? ORDER BY sort ASC',
      [openid]
    )
    const [accounts] = await pool.execute(
      'SELECT * FROM accounts WHERE openid = ? ORDER BY sort ASC',
      [openid]
    )
    const [budgets] = await pool.execute(
      'SELECT * FROM budgets WHERE openid = ? ORDER BY year_month ASC',
      [openid]
    )

    res.json({
      success: true,
      data: {
        records,
        categories,
        accounts,
        budgets,
        server_time: Date.now()
      }
    })
  } catch (err) {
    console.error('Sync get error:', err)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// 上传数据合并
router.post('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { records = [], categories = [], accounts = [], budgets = [] } = req.body
    const now = Date.now()

    // 合并 records (按 id 更新或插入，以 update_time 为准)
    for (const record of records) {
      const [existing] = await pool.execute('SELECT update_time FROM records WHERE id = ?', [record.id])
      if (existing.length === 0) {
        await pool.execute(
          `INSERT INTO records (id, openid, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [record.id, openid, record.type, record.amount, record.category_code, record.category_name, record.account_code, record.remark, record.record_date, record.create_time, record.update_time]
        )
      } else if (existing[0].update_time < record.update_time) {
        await pool.execute(
          `UPDATE records SET type=?, amount=?, category_code=?, category_name=?, account_code=?, remark=?, record_date=?, update_time=?, sync_status=1
           WHERE id=?`,
          [record.type, record.amount, record.category_code, record.category_name, record.account_code, record.remark, record.record_date, record.update_time, record.id]
        )
      }
    }

    // 合并 categories
    for (const cat of categories) {
      await pool.execute(
        `INSERT INTO categories (id, openid, code, name, icon, color, type, sort, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color), sort=VALUES(sort)`,
        [cat.id, openid, cat.code, cat.name, cat.icon, cat.color, cat.type, cat.sort, cat.is_default]
      )
    }

    // 合并 accounts
    for (const acc of accounts) {
      await pool.execute(
        `INSERT INTO accounts (id, openid, code, name, type, balance, sort, is_default, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), balance=VALUES(balance), sort=VALUES(sort)`,
        [acc.id, openid, acc.code, acc.name, acc.type, acc.balance, acc.sort, acc.is_default, acc.create_time, acc.update_time]
      )
    }

    // 合并 budgets
    for (const bud of budgets) {
      await pool.execute(
        `INSERT INTO budgets (id, openid, year_month, total_budget, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE total_budget=VALUES(total_budget), update_time=VALUES(update_time)`,
        [bud.id, openid, bud.year_month, bud.total_budget, bud.create_time, bud.update_time]
      )
    }

    res.json({ success: true, server_time: now })
  } catch (err) {
    console.error('Sync post error:', err)
    res.status(500).json({ error: 'Sync failed' })
  }
})

export default router
```

- [ ] **Step 2: 提交**

```bash
git add server/routes/sync.js
git commit -m "feat: add sync routes for bidirectional data sync"
```

---

## Task 5: CRUD 路由

**Files:**
- Create: `server/routes/records.js`
- Create: `server/routes/categories.js`
- Create: `server/routes/accounts.js`
- Create: `server/routes/budgets.js`

- [ ] **Step 1: 创建 records.js**

```js
import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const { start_date, end_date } = req.query
    const openid = req.user.openid
    let query = 'SELECT * FROM records WHERE openid = ?'
    const params = [openid]

    if (start_date) {
      query += ' AND record_date >= ?'
      params.push(start_date)
    }
    if (end_date) {
      query += ' AND record_date <= ?'
      params.push(end_date)
    }
    query += ' ORDER BY record_date DESC, create_time DESC'

    const [rows] = await pool.execute(query, params)
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ error: 'Query failed' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time } = req.body
    const now = Date.now()

    await pool.execute(
      `INSERT INTO records (id, openid, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
       ON DUPLICATE KEY UPDATE type=VALUES(type), amount=VALUES(amount), category_code=VALUES(category_code), category_name=VALUES(category_name), account_code=VALUES(account_code), remark=VALUES(remark), record_date=VALUES(record_date), update_time=VALUES(update_time), sync_status=1`,
      [id, openid, type, amount, category_code, category_name, account_code, remark, record_date, create_time || now, update_time || now]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Insert failed' })
  }
})

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    const { type, amount, category_code, category_name, account_code, remark, record_date, update_time } = req.body

    await pool.execute(
      `UPDATE records SET type=?, amount=?, category_code=?, category_name=?, account_code=?, remark=?, record_date=?, update_time=?, sync_status=1
       WHERE id=? AND openid=?`,
      [type, amount, category_code, category_name, account_code, remark, record_date, update_time || Date.now(), id, openid]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Update failed' })
  }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    await pool.execute('DELETE FROM records WHERE id=? AND openid=?', [id, openid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' })
  }
})

export default router
```

- [ ] **Step 2: 创建 categories.js**

```js
import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const [rows] = await pool.execute('SELECT * FROM categories WHERE openid = ? ORDER BY type, sort', [openid])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ error: 'Query failed' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id, code, name, icon, color, type, sort, is_default } = req.body
    await pool.execute(
      `INSERT INTO categories (id, openid, code, name, icon, color, type, sort, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color), sort=VALUES(sort), is_default=VALUES(is_default)`,
      [id, openid, code, name, icon, color, type, sort, is_default]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Insert failed' })
  }
})

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    const { name, icon, color, sort, is_default } = req.body
    await pool.execute('UPDATE categories SET name=?, icon=?, color=?, sort=?, is_default=? WHERE id=? AND openid=?', [name, icon, color, sort, is_default, id, openid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Update failed' })
  }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    await pool.execute('DELETE FROM categories WHERE id=? AND openid=?', [id, openid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' })
  }
})

export default router
```

- [ ] **Step 3: 创建 accounts.js**

```js
import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const [rows] = await pool.execute('SELECT * FROM accounts WHERE openid = ? ORDER BY sort', [openid])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ error: 'Query failed' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id, code, name, type, balance, sort, is_default, create_time, update_time } = req.body
    await pool.execute(
      `INSERT INTO accounts (id, openid, code, name, type, balance, sort, is_default, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), balance=VALUES(balance), sort=VALUES(sort), is_default=VALUES(is_default), update_time=VALUES(update_time)`,
      [id, openid, code, name, type, balance, sort, is_default, create_time, update_time]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Insert failed' })
  }
})

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    const { name, type, balance, sort, is_default } = req.body
    await pool.execute('UPDATE accounts SET name=?, type=?, balance=?, sort=?, is_default=?, update_time=? WHERE id=? AND openid=?', [name, type, balance, sort, is_default, Date.now(), id, openid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Update failed' })
  }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    await pool.execute('DELETE FROM accounts WHERE id=? AND openid=?', [id, openid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' })
  }
})

export default router
```

- [ ] **Step 4: 创建 budgets.js**

```js
import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

router.get('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const [rows] = await pool.execute('SELECT * FROM budgets WHERE openid = ? ORDER BY year_month DESC', [openid])
    res.json({ success: true, data: rows })
  } catch (err) {
    res.status(500).json({ error: 'Query failed' })
  }
})

router.post('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id, year_month, total_budget, create_time, update_time } = req.body
    await pool.execute(
      `INSERT INTO budgets (id, openid, year_month, total_budget, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE total_budget=VALUES(total_budget), update_time=VALUES(update_time)`,
      [id, openid, year_month, total_budget, create_time, update_time]
    )
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Insert failed' })
  }
})

router.put('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    const { total_budget, update_time } = req.body
    await pool.execute('UPDATE budgets SET total_budget=?, update_time=? WHERE id=? AND openid=?', [total_budget, update_time || Date.now(), id, openid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Update failed' })
  }
})

router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { id } = req.params
    await pool.execute('DELETE FROM budgets WHERE id=? AND openid=?', [id, openid])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' })
  }
})

export default router
```

- [ ] **Step 5: 提交**

```bash
git add server/routes/records.js server/routes/categories.js server/routes/accounts.js server/routes/budgets.js
git commit -m "feat: add CRUD routes for all entities"
```

---

## Task 6: 小程序端 API 工具

**Files:**
- Create: `utils/api.js`

- [ ] **Step 1: 创建 utils/api.js**

```js
/**
 * API 请求工具
 * 替换 uniCloud 调用
 */

const API_BASE = 'https://your-domain.com/api' // TODO: 替换为实际域名

const STORAGE_KEY_TOKEN = 'ssj_auth_token'

/**
 * 获取存储的 token
 */
function getToken() {
  return uni.getStorageSync(STORAGE_KEY_TOKEN)
}

/**
 * 请求封装
 */
async function request(url, method = 'GET', data = null) {
  const token = getToken()
  const header = {
    'Content-Type': 'application/json'
  }
  if (token) {
    header['Authorization'] = `Bearer ${token}`
  }

  try {
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: API_BASE + url,
        method,
        data,
        header,
        success: (res) => {
          if (res.statusCode === 401) {
            uni.removeStorageSync(STORAGE_KEY_TOKEN)
            reject(new Error('Unauthorized'))
          } else {
            resolve(res.data)
          }
        },
        fail: (err) => reject(err)
      })
    })
    return res
  } catch (err) {
    console.error('API request failed:', err)
    throw err
  }
}

// Auth
export async function login(code) {
  return request('/auth/login', 'POST', { code })
}

// Sync
export async function getSyncData(lastSyncTime = 0) {
  return request(`/sync?last_sync_time=${lastSyncTime}`)
}

export async function postSyncData(data) {
  return request('/sync', 'POST', data)
}

// Records
export async function getRecords(startDate, endDate) {
  let url = '/records'
  const params = []
  if (startDate) params.push(`start_date=${startDate}`)
  if (endDate) params.push(`end_date=${endDate}`)
  if (params.length) url += '?' + params.join('&')
  return request(url)
}

export async function postRecord(record) {
  return request('/records', 'POST', record)
}

export async function putRecord(id, data) {
  return request(`/records/${id}`, 'PUT', data)
}

export async function deleteRecord(id) {
  return request(`/records/${id}`, 'DELETE')
}

// Categories
export async function getCategories() {
  return request('/categories')
}

export async function postCategory(category) {
  return request('/categories', 'POST', category)
}

export async function putCategory(id, data) {
  return request(`/categories/${id}`, 'PUT', data)
}

export async function deleteCategory(id) {
  return request(`/categories/${id}`, 'DELETE')
}

// Accounts
export async function getAccounts() {
  return request('/accounts')
}

export async function postAccount(account) {
  return request('/accounts', 'POST', account)
}

export async function putAccount(id, data) {
  return request(`/accounts/${id}`, 'PUT', data)
}

export async function deleteAccount(id) {
  return request(`/accounts/${id}`, 'DELETE')
}

// Budgets
export async function getBudgets() {
  return request('/budgets')
}

export async function postBudget(budget) {
  return request('/budgets', 'POST', budget)
}

export async function putBudget(id, data) {
  return request(`/budgets/${id}`, 'PUT', data)
}

export async function deleteBudget(id) {
  return request(`/budgets/${id}`, 'DELETE')
}
```

- [ ] **Step 2: 提交**

```bash
git add utils/api.js
git commit -m "feat: add API request utility for self-hosted backend"
```

---

## Task 7: 小程序端 Auth 修改

**Files:**
- Modify: `utils/auth.js`

- [ ] **Step 1: 修改 utils/auth.js - 替换 cloudLogin 为 API 调用**

```js
import { login as apiLogin } from './api'

// ... 原有代码保留，修改 cloudLogin 函数：

export async function cloudLogin(code) {
  try {
    const res = await apiLogin(code)
    if (res.token) {
      uni.setStorageSync(STORAGE_KEY_TOKEN, res.token)
    }
    const userData = {
      openid: res.openid,
      create_time: Date.now()
    }
    uni.setStorageSync(STORAGE_KEY_USER, userData)
    return { openid: res.openid }
  } catch (e) {
    console.error('cloudLogin failed:', e)
    throw e
  }
}

// 修改 getStoredUser - 兼容无 openid 的老用户
export function getStoredUser() {
  try {
    const userStr = uni.getStorageSync(STORAGE_KEY_USER)
    return userStr ? JSON.parse(userStr) : null
  } catch (e) {
    return null
  }
}
```

- [ ] **Step 2: 提交**

```bash
git add utils/auth.js
git commit -m "feat: replace cloudLogin with API call to self-hosted backend"
```

---

## Task 8: 小程序端 Store 修改

**Files:**
- Modify: `store/sync.js`
- Modify: `store/bill.js`
- Modify: `store/category.js`
- Modify: `store/account.js`
- Modify: `store/budget.js`

- [ ] **Step 1: 修改 store/sync.js - 替换 uniCloud 调用**

在文件开头添加：
```js
import { getSyncData, postSyncData } from '@/utils/api'
```

修改 `pullFromCloud` 方法 (约 line 117-158) 使用 `getSyncData` 替换 `uniCloud.callFunction`

- [ ] **Step 2: 修改 store/bill.js, store/category.js, store/account.js, store/budget.js**

将 `uniCloud.callFunction` 替换为 `utils/api.js` 中对应的函数

- [ ] **Step 3: 提交**

```bash
git add store/sync.js store/bill.js store/category.js store/account.js store/budget.js
git commit -m "feat: replace uniCloud calls with REST API calls"
```

---

## Task 9: Nginx 配置

**Files:**
- Create: `server/nginx.conf.example`

- [ ] **Step 1: 创建 nginx.conf.example**

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

- [ ] **Step 2: 提交**

```bash
git add server/nginx.conf.example
git commit -m "feat: add nginx reverse proxy config example"
```

---

## 部署步骤

1. **服务器上执行 SQL 初始化**
   ```bash
   mysql -u root -p < server/db/init.sql
   ```

2. **配置环境变量**
   ```bash
   cp server/.env.example server/.env
   # 编辑 .env 填入实际值
   ```

3. **安装依赖并启动**
   ```bash
   cd server
   npm install
   npm start
   ```

4. **配置 Nginx** (参考 nginx.conf.example)

5. **修改小程序 utils/api.js 中的 API_BASE 为实际域名**

6. **上传部署小程序**