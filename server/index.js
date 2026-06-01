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

// 简易 CORS：H5 端跨域会需要；小程序不强制。生产建议换成按 origin 白名单
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*')
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization')
  if (req.method === 'OPTIONS') return res.sendStatus(204)
  next()
})

// JSON body 限 256KB，避免恶意大包打爆内存
app.use(express.json({ limit: '256kb' }))

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

// 统一错误兜底：把未捕获的异常映射成 500，不泄漏 stack
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
