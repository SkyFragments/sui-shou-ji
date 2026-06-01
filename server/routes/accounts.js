import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'
import { wrap } from '../middleware/wrap.js'

const router = express.Router()

router.get('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const [rows] = await pool.execute('SELECT * FROM accounts WHERE openid = ? ORDER BY sort', [openid])
  res.json({ success: true, data: rows })
}))

router.post('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id, code, name, type, balance, sort, is_default, create_time, update_time } = req.body
  if (!id) return res.status(400).json({ error: 'id required' })
  if (!code) return res.status(400).json({ error: 'code required' })

  await pool.execute(
    `INSERT INTO accounts (id, openid, code, name, type, balance, sort, is_default, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), balance=VALUES(balance), sort=VALUES(sort), is_default=VALUES(is_default), update_time=VALUES(update_time)`,
    [id, openid, code, name, type, balance || 0, sort || 0, is_default || 0, create_time, update_time]
  )
  res.json({ success: true })
}))

router.put('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  const { name, type, balance, sort, is_default } = req.body
  const [result] = await pool.execute(
    'UPDATE accounts SET name=?, type=?, balance=?, sort=?, is_default=?, update_time=? WHERE id=? AND openid=?',
    [name, type, balance, sort, is_default, Date.now(), id, openid]
  )
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'account not found' })
  }
  res.json({ success: true })
}))

router.delete('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  await pool.execute('DELETE FROM accounts WHERE id=? AND openid=?', [id, openid])
  res.json({ success: true })
}))

export default router
