import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'

const router = express.Router()

// 获取增量数据
router.get('/', verifyToken, async (req, res) => {
  try {
    const { last_sync_time = 0 } = req.query
    const openid = req.user.openid

    const [records] = await pool.execute(
      'SELECT * FROM records WHERE openid = ? AND update_time > ? ORDER BY update_time ASC',
      [openid, last_sync_time]
    )
    const [categories] = await pool.execute(
      'SELECT * FROM categories WHERE openid = ? ORDER BY sort ASC',
      [openid]
    )
    const [accounts] = await pool.execute(
      'SELECT * FROM accounts WHERE openid = ? ORDER BY sort ASC',
      [openid]
    )
    const [budgets] = await pool.execute(
      'SELECT * FROM budgets WHERE openid = ? ORDER BY year_month ASC',
      [openid]
    )

    res.json({
      success: true,
      data: {
        records,
        categories,
        accounts,
        budgets,
        server_time: Date.now()
      }
    })
  } catch (err) {
    console.error('Sync get error:', err)
    res.status(500).json({ error: 'Sync failed' })
  }
})

// 上传数据合并
router.post('/', verifyToken, async (req, res) => {
  try {
    const openid = req.user.openid
    const { records = [], categories = [], accounts = [], budgets = [] } = req.body
    const now = Date.now()

    // 合并 records (按 (openid,id) 更新或插入，以 update_time 为准)
    for (const record of records) {
      const [existing] = await pool.execute(
        'SELECT update_time FROM records WHERE openid = ? AND id = ?',
        [openid, record.id]
      )
      if (existing.length === 0) {
        await pool.execute(
          `INSERT INTO records (id, openid, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [record.id, openid, record.type, record.amount, record.category_code, record.category_name, record.account_code, record.remark, record.record_date, record.create_time, record.update_time]
        )
      } else if (existing[0].update_time < record.update_time) {
        await pool.execute(
          `UPDATE records SET type=?, amount=?, category_code=?, category_name=?, account_code=?, remark=?, record_date=?, update_time=?, sync_status=1
           WHERE openid=? AND id=?`,
          [record.type, record.amount, record.category_code, record.category_name, record.account_code, record.remark, record.record_date, record.update_time, openid, record.id]
        )
      }
    }

    // 合并 categories
    for (const cat of categories) {
      await pool.execute(
        `INSERT INTO categories (id, openid, code, name, icon, color, type, sort, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color), sort=VALUES(sort)`,
        [cat.id, openid, cat.code, cat.name, cat.icon, cat.color, cat.type, cat.sort, cat.is_default]
      )
    }

    // 合并 accounts
    for (const acc of accounts) {
      await pool.execute(
        `INSERT INTO accounts (id, openid, code, name, type, balance, sort, is_default, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), balance=VALUES(balance), sort=VALUES(sort)`,
        [acc.id, openid, acc.code, acc.name, acc.type, acc.balance, acc.sort, acc.is_default, acc.create_time, acc.update_time]
      )
    }

    // 合并 budgets
    for (const bud of budgets) {
      await pool.execute(
        `INSERT INTO budgets (id, openid, year_month, total_budget, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE total_budget=VALUES(total_budget), update_time=VALUES(update_time)`,
        [bud.id, openid, bud.year_month, bud.total_budget, bud.create_time, bud.update_time]
      )
    }

    res.json({ success: true, server_time: now })
  } catch (err) {
    console.error('Sync post error:', err)
    res.status(500).json({ error: 'Sync failed' })
  }
})

export default router