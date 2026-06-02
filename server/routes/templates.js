import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'
import { wrap } from '../middleware/wrap.js'

const router = express.Router()

// 列表
router.get('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const [rows] = await pool.execute(
    'SELECT * FROM templates WHERE openid = ? ORDER BY sort ASC',
    [openid]
  )
  res.json({ success: true, data: rows })
}))

// 新增/upsert：客户端 PUT→POST 兜底走这里
router.post('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const {
    id, name, amount, type, category_code,
    icon, color, sort, is_default, create_time, update_time
  } = req.body

  if (!id) return res.status(400).json({ error: 'id required' })
  if (!name) return res.status(400).json({ error: 'name required' })
  if (type !== 1 && type !== 2) return res.status(400).json({ error: 'type must be 1 or 2' })
  if (amount == null || isNaN(Number(amount))) return res.status(400).json({ error: 'amount required' })
  if (!category_code) return res.status(400).json({ error: 'category_code required' })
  const now = Date.now()

  await pool.execute(
    `INSERT INTO templates (id, openid, name, amount, type, category_code, icon, color, sort, is_default, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name=VALUES(name), amount=VALUES(amount), type=VALUES(type),
       category_code=VALUES(category_code), icon=VALUES(icon), color=VALUES(color),
       sort=VALUES(sort), is_default=VALUES(is_default), update_time=VALUES(update_time)`,
    [
      id, openid, name, Number(amount), type, category_code,
      icon || null, color || null, sort || 0, is_default || 0,
      create_time || now, update_time || now
    ]
  )
  res.json({ success: true })
}))

// 更新（PUT→POST 回退依赖：affectedRows=0 返 404）
router.put('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  const { name, amount, type, category_code, icon, color, sort, is_default } = req.body
  const [result] = await pool.execute(
    `UPDATE templates
       SET name=?, amount=?, type=?, category_code=?, icon=?, color=?, sort=?, is_default=?, update_time=?
     WHERE id=? AND openid=?`,
    [
      name, Number(amount), type, category_code,
      icon || null, color || null, sort || 0, is_default || 0,
      Date.now(), id, openid
    ]
  )
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'template not found' })
  }
  res.json({ success: true })
}))

// 删除
router.delete('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  await pool.execute('DELETE FROM templates WHERE id=? AND openid=?', [id, openid])
  res.json({ success: true })
}))

export default router
