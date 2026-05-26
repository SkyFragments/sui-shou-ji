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