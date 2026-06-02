import express from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.js'
import syncRoutes from './routes/sync.js'
import recordsRoutes from './routes/records.js'
import categoriesRoutes from './routes/categories.js'
import accountsRoutes from './routes/accounts.js'
import budgetsRoutes from './routes/budgets.js'
import templatesRoutes from './routes/templates.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

// CORS：Authorization 头不属于 simple header，配合通配 origin 浏览器会拒掉预检
// 显式回显请求 origin；多 origin 用逗号分隔。生产务必设置 CORS_ORIGIN
// 注意：动态 origin 必须配 Vary: Origin，否则 CDN/代理会按 URL 缓存导致跨域泄露
const CORS_ORIGIN = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
app.use((req, res, next) => {
  const reqOrigin = req.headers.origin
  if (CORS_ORIGIN.length === 0) {
    // 未配置：回显请求 origin（非 *，兼容带 Authorization 的预检）
    if (reqOrigin) {
      res.header('Access-Control-Allow-Origin', reqOrigin)
      res.header('Vary', 'Origin')
    }
  } else if (reqOrigin && CORS_ORIGIN.includes(reqOrigin)) {
    res.header('Access-Control-Allow-Origin', reqOrigin)
    res.header('Vary', 'Origin')
  }
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// JSON body 限 5MB：批量同步 1000 条记录约 300KB，给 5MB 留余量；过大可单独排查
app.use(express.json({ limit: '5mb' }))

// 路由（路由内已用 middleware/wrap.js 包装 async handler）
app.use('/api/auth', authRoutes)
app.use('/api/sync', syncRoutes)
app.use('/api/records', recordsRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/accounts', accountsRoutes)
app.use('/api/budgets', budgetsRoutes)
app.use('/api/templates', templatesRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() })
})

// 统一错误兜底：4xx 之外的 throw 都映射成 500，不泄漏 stack
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  if (res.headersSent) return next(err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
