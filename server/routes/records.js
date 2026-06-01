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
    if (!id) {
      return res.status(400).json({ error: 'id required' })
    }
    const now = Date.now()

    // Composite (openid, id) PK makes ON DUPLICATE KEY UPDATE tenant-safe.
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