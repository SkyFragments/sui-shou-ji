import express from 'express'
import pool from '../db/mysql.js'
import { verifyToken } from '../middleware/auth.js'
import { wrap } from '../middleware/wrap.js'

const router = express.Router()

// 增量拉取条数上限，避免单次响应过大
const SYNC_PAGE_SIZE = 1000

// 获取增量数据
router.get('/', verifyToken, wrap(async (req, res) => {
  const { last_sync_time = 0, last_id = '' } = req.query
  const openid = req.user.openid
  const syncTime = Number(last_sync_time) || 0

  // 复合游标 (update_time, id) + `>=` 处理同 ms 写多条的边界情况
  // 单字段 update_time 配合 `>` 会漏掉 update_time 完全相同的记录
  let records
  if (last_id) {
    ;[records] = await pool.execute(
      `SELECT * FROM records
       WHERE openid = ?
         AND (update_time > ? OR (update_time = ? AND id > ?))
       ORDER BY update_time ASC, id ASC
       LIMIT ?`,
      [openid, syncTime, syncTime, last_id, SYNC_PAGE_SIZE]
    )
  } else {
    ;[records] = await pool.execute(
      'SELECT * FROM records WHERE openid = ? AND update_time >= ? ORDER BY update_time ASC, id ASC LIMIT ?',
      [openid, syncTime, SYNC_PAGE_SIZE]
    )
  }

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

  // 告诉客户端下一轮的游标；满页说明还有更多
  const lastRecord = records[records.length - 1]
  res.json({
    success: true,
    data: {
      records,
      categories,
      accounts,
      budgets,
      server_time: Date.now(),
      // 告知客户端是否还有更多增量记录待拉（records 达到上限就分页）
      has_more: records.length >= SYNC_PAGE_SIZE,
      next_cursor: lastRecord ? { last_sync_time: lastRecord.update_time, last_id: lastRecord.id } : null
    }
  })
}))

// 上传数据合并
router.post('/', verifyToken, wrap(async (req, res) => {
  const openid = req.user.openid
  const { records = [], categories = [], accounts = [], budgets = [] } = req.body
  const now = Date.now()

  // 收集冲突而不是抛出：部分成功 + 冲突清单让客户端能局部重试/合并
  const conflicts = []

  // 用事务包裹所有写，部分失败回滚，避免半同步状态
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()

    // 合并 records — executemany，N 条 1 次往返
    // 服务端记录比客户端新 → 写入 conflicts 数组，不阻断本批其余写入
    // 新老统一走 INSERT...ON DUPLICATE KEY UPDATE，由 JS 预筛掉老于服务端的项
    if (records.length > 0) {
      // 先批量查服务端现状；FOR UPDATE 锁住这些行，防 TOCTOU 竞态
      // 没有锁的话，并发连接在我们 SELECT 后 INSERT 前提交了更新的 update_time，
      // 我们的 INSERT...ON DUPLICATE KEY UPDATE 会用旧值覆盖新值
      const ids = records.map(r => r.id)
      const placeholders = ids.map(() => '?').join(',')
      const [existingRows] = await conn.query(
        `SELECT id, update_time FROM records WHERE openid = ? AND id IN (${placeholders}) FOR UPDATE`,
        [openid, ...ids]
      )
      const existingMap = new Map(existingRows.map(r => [r.id, r.update_time]))

      const toUpsert = []
      for (const record of records) {
        const serverTime = existingMap.get(record.id)
        // 严格 > 而非 >=：同 ms 的幂等重试应当真正落到 upsert（无变化即可）
        // 老于服务端的才视为冲突
        if (serverTime !== undefined && serverTime > record.update_time) {
          // 服务端更新：交给客户端从 conflicts 重拉重并
          conflicts.push({ id: record.id, serverUpdateTime: serverTime, clientUpdateTime: record.update_time })
          continue
        }
        toUpsert.push(record)
      }

      if (toUpsert.length > 0) {
        const rows = toUpsert.map(r => [
          r.id, openid, r.type, r.amount, r.category_code, r.category_name, r.account_code,
          r.remark, r.record_date, r.create_time, r.update_time, 1
        ])
        await conn.query(
          `INSERT INTO records (id, openid, type, amount, category_code, category_name, account_code, remark, record_date, create_time, update_time, sync_status)
           VALUES ?
           ON DUPLICATE KEY UPDATE
             type=VALUES(type), amount=VALUES(amount), category_code=VALUES(category_code),
             category_name=VALUES(category_name), account_code=VALUES(account_code),
             remark=VALUES(remark), record_date=VALUES(record_date),
             update_time=VALUES(update_time), sync_status=1`,
          [rows]
        )
      }
    }

    // 合并 categories — executemany
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

    // 合并 accounts — executemany
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

    // 合并 budgets — executemany
    // 唯一键 (openid, year_month) 在 ON DUPLICATE KEY UPDATE 下被同表覆盖，自然支持跨设备合并
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
    res.json({ success: true, server_time: now, conflicts })
  } catch (err) {
    await conn.rollback()
    throw err
  } finally {
    conn.release()
  }
}))

export default router
