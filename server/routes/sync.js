import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'
import { wrap } from '../middleware/wrap.js'

const router = express.Router()

// 增量拉取条数上限，避免单次响应过大
const SYNC_PAGE_SIZE = 1000

// 获取增量数据
router.get('/', verifyToken, wrap(async (req, res) => {
  const { last_sync_time = 0 } = req.query
  const openid = req.user.openid
  const syncTime = Number(last_sync_time) || 0

  // records 走 update_time 增量 + 限定条数
  const [records] = await pool.execute(
    'SELECT * FROM records WHERE openid = ? AND update_time > ? ORDER BY update_time ASC LIMIT ?',
    [openid, syncTime, SYNC_PAGE_SIZE]
  )
  // categories/accounts/budgets 整表返回（量小）；后续可加 update_time 增量
  const [categories] = await pool.execute(
    'SELECT * FROM categories WHERE openid = ? ORDER BY type, sort',
    [openid]
  )
  const [accounts] = await pool.execute(
    'SELECT * FROM accounts WHERE openid = ? ORDER BY sort',
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
      server_time: Date.now(),
      // 告知客户端是否还有更多增量记录待拉（records 达到上限就分页）
      has_more: records.length >= SYNC_PAGE_SIZE
    }
  })
}))

// 上传数据合并
router.post('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { records = [], categories = [], accounts = [], budgets = [] } = req.body
  const now = Date.now()

  // 用事务包裹所有写，部分失败回滚，避免半同步状态
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 合并 records (按 (openid,id) 更新或插入，以 update_time 为准)
    // 服务端记录比客户端新 → 拒绝写入，告知客户端冲突，事务回滚避免半同步
    for (const record of records) {
      const [existing] = await conn.execute(
        'SELECT update_time FROM records WHERE openid = ? AND id = ?',
        [openid, record.id]
      )
      if (existing.length === 0) {
        await conn.execute(
          `INSERT INTO records (id, openid, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [record.id, openid, record.type, record.amount, record.category_code, record.category_name, record.account_code, record.remark, record.record_date, record.create_time, record.update_time]
        )
      } else if (existing[0].update_time < record.update_time) {
        await conn.execute(
          `UPDATE records SET type=?, amount=?, category_code=?, category_name=?, account_code=?, remark=?, record_date=?, update_time=?, sync_status=1
           WHERE openid=? AND id=?`,
          [record.type, record.amount, record.category_code, record.category_name, record.account_code, record.remark, record.record_date, record.update_time, openid, record.id]
        )
      } else {
        // 服务端记录更新，拒绝写入，触发客户端冲突处理
        throw Object.assign(new Error('record conflict: server has newer version'), { code: 'CONFLICT', id: record.id, serverUpdateTime: existing[0].update_time, clientUpdateTime: record.update_time })
      }
    }

    // 合并 categories — 用 executemany 一次性写，N 条记录 1 次往返
    if (categories.length > 0) {
      const catRows = categories.map(cat => [
        cat.id, openid, cat.code, cat.name, cat.icon, cat.color, cat.type,
        cat.sort || 0, cat.is_default || 0, cat.create_time || now, cat.update_time || now
      ])
      await conn.query(
        `INSERT INTO categories (id, openid, code, name, icon, color, type, sort, is_default, create_time, update_time)
         VALUES ?
         ON DUPLICATE KEY UPDATE name=VALUES(name), icon=VALUES(icon), color=VALUES(color), sort=VALUES(sort), update_time=VALUES(update_time)`,
        [catRows]
      )
    }

    // 合并 accounts — executemany 批量
    if (accounts.length > 0) {
      const accRows = accounts.map(acc => [
        acc.id, openid, acc.code, acc.name, acc.type, acc.balance || 0, acc.sort || 0,
        acc.is_default || 0, acc.create_time, acc.update_time
      ])
      await conn.query(
        `INSERT INTO accounts (id, openid, code, name, type, balance, sort, is_default, create_time, update_time)
         VALUES ?
         ON DUPLICATE KEY UPDATE name=VALUES(name), type=VALUES(type), balance=VALUES(balance), sort=VALUES(sort), is_default=VALUES(is_default), update_time=VALUES(update_time)`,
        [accRows]
      )
    }

    // 合并 budgets — executemany 批量
    if (budgets.length > 0) {
      const budRows = budgets.map(bud => [
        bud.id, openid, bud.year_month, bud.total_budget, bud.create_time, bud.update_time
      ])
      await conn.query(
        `INSERT INTO budgets (id, openid, year_month, total_budget, create_time, update_time)
         VALUES ?
         ON DUPLICATE KEY UPDATE total_budget=VALUES(total_budget), update_time=VALUES(update_time)`,
        [budRows]
      )
    }

    await conn.commit()
    res.json({ success: true, server_time: now })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}))

export default router
