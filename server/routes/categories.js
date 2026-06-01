import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'
import { wrap } from '../middleware/wrap.js'

const router = express.Router()

router.get('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const [rows] = await pool.execute('SELECT * FROM categories WHERE openid = ? ORDER BY type, sort', [openid])
  res.json({ success: true, data: rows })
}))

router.post('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id, code, name, icon, color, type, sort, is_default, create_time, update_time } = req.body
  if (!id) return res.status(400).json({ error: 'id required' })
  if (!code) return res.status(400).json({ error: 'code required' })
  if (type !== 1 && type !== 2) return res.status(400).json({ error: 'type must be 1 or 2' })
  const now = Date.now()

  await pool.execute(
    `INSERT INTO categories (id, openid, code, name, icon, color, type, sort, is_default, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color), sort=VALUES(sort), is_default=VALUES(is_default), update_time=VALUES(update_time)`,
    [id, openid, code, name, icon, color, type, sort || 0, is_default || 0, create_time || now, update_time || now]
  )
  res.json({ success: true })
}))

router.put('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  const { name, icon, color, sort, is_default } = req.body
  await pool.execute(
    'UPDATE categories SET name=?, icon=?, color=?, sort=?, is_default=? WHERE id=? AND openid=?',
    [name, icon, color, sort, is_default, id, openid]
  )
  res.json({ success: true })
}))

router.delete('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  await pool.execute('DELETE FROM categories WHERE id=? AND openid=?', [id, openid])
  res.json({ success: true })
}))

export default router
