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
