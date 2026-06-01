import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'
import { wrap } from '../middleware/wrap.js'

const router = express.Router()

// 单次拉取上限，避免大账号单次响应过大撑爆内存
const MAX_PAGE_SIZE = 500
const DEFAULT_PAGE_SIZE = 100

router.get('/', verifyToken, wrap(async (req, res) => {
  const { start_date, end_date, page, page_size } = req.query
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

  // 分页：page 从 1 开始，page_size 上限 MAX_PAGE_SIZE；下限 1 防止负数/0/NaN 触发 SQL 报错
  const size = Math.max(1, Math.min(Number(page_size) || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE))
  const pageNum = Math.max(1, Number(page) || 1)
  const offset = (pageNum - 1) * size
  query += ' LIMIT ? OFFSET ?'
  params.push(size, offset)

  const [rows] = await pool.execute(query, params)
  res.json({ success: true, data: rows, page: { size, offset, count: rows.length } })
}))

router.post('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time } = req.body
  if (!id) {
    return res.status(400).json({ error: 'id required' })
  }
  // 基础字段校验：避免脏数据进库
  if (type !== 1 && type !== 2) {
    return res.status(400).json({ error: 'type must be 1 (支出) or 2 (收入)' })
  }
  if (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount)) {
    return res.status(400).json({ error: 'amount must be a positive number' })
  }
  if (!record_date || !/^\d{4}-\d{2}-\d{2}$/.test(record_date)) {
    return res.status(400).json({ error: 'record_date must be YYYY-MM-DD' })
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
}))

router.put('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  const { type, amount, category_code, category_name, account_code, remark, record_date, update_time } = req.body

  if (type !== undefined && type !== 1 && type !== 2) {
    return res.status(400).json({ error: 'type must be 1 or 2' })
  }
  if (amount !== undefined && (typeof amount !== 'number' || amount <= 0 || !Number.isFinite(amount))) {
    return res.status(400).json({ error: 'amount must be a positive number' })
  }

  // 部分更新：只覆盖 req.body 里实际存在的字段，未提供的字段保持原值
  // 否则 mysql2 把 undefined 绑成 NULL，会把 NOT NULL 列清空
  const [result] = await pool.execute(
    `UPDATE records SET
       type          = COALESCE(?, type),
       amount        = COALESCE(?, amount),
       category_code = COALESCE(?, category_code),
       category_name = COALESCE(?, category_name),
       account_code  = COALESCE(?, account_code),
       remark        = COALESCE(?, remark),
       record_date   = COALESCE(?, record_date),
       update_time   = ?,
       sync_status   = 1
     WHERE id=? AND openid=?`,
    [type, amount, category_code, category_name, account_code, remark, record_date, update_time || Date.now(), id, openid]
  )
  if (result.affectedRows === 0) {
    return res.status(404).json({ error: 'record not found' })
  }
  res.json({ success: true })
}))

router.delete('/:id', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { id } = req.params
  await pool.execute('DELETE FROM records WHERE id=? AND openid=?', [id, openid])
  res.json({ success: true })
}))

export default router