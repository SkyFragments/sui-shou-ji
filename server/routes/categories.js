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