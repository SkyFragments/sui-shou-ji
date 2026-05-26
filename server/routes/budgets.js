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