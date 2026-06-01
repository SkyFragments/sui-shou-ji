import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'
import { wrap } from '../middleware/wrap.js'

const router = express.Router()

router.get('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const [rows] = await pool.execute('SELECT * FROM budgets WHERE openid = ? ORDER BY year_month DESC', [openid])
  res.json({ success: true, data: rows })
}))

router.post('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id, year_month, total_budget, create_time, update_time } = req.body
  if (!id) return res.status(400).json({ error: 'id required' })
  if (!year_month || !/^\d{4}-\d{2}$/.test(year_month)) {
    return res.status(400).json({ error: 'year_month must be YYYY-MM' })
  }
  if (typeof total_budget !== 'number' || total_budget < 0) {
    return res.status(400).json({ error: 'total_budget must be a non-negative number' })
  }

  await pool.execute(
    `INSERT INTO budgets (id, openid, year_month, total_budget, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE total_budget=VALUES(total_budget), update_time=VALUES(update_time)`,
    [id, openid, year_month, total_budget, create_time, update_time]
  )
  res.json({ success: true })
}))

router.put('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  const { total_budget, update_time } = req.body
  const [result] = await pool.execute(
    'UPDATE budgets SET total_budget=?, update_time=? WHERE id=? AND openid=?',
    [total_budget, update_time || Date.now(), id, openid]
  )
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'budget not found' })
  }
  res.json({ success: true })
}))

router.delete('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  await pool.execute('DELETE FROM budgets WHERE id=? AND openid=?', [id, openid])
  res.json({ success: true })
}))

export default router
