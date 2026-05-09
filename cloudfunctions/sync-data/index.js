/**
 * sync-data 云函数 - 增量数据同步
 * 接收 openid 和 last_sync_time，返回增量数据
 */
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { openid, last_sync_time } = event

  if (!openid) {
    return {
      success: false,
      error: 'openid is required'
    }
  }

  try {
    const db = cloud.database()
    const now = Date.now()

    // 准备查询条件
    const syncCondition = {
      openid,
      update_time: db.command.gt(last_sync_time || 0)
    }

    // 并行查询所有集合的增量数据
    const [recordsRes, categoriesRes, accountsRes, budgetsRes] = await Promise.all([
      db.collection('ssj_records').where(syncCondition).orderBy('update_time', 'desc').get(),
      db.collection('ssj_categories').where(syncCondition).orderBy('update_time', 'desc').get(),
      db.collection('ssj_accounts').where(syncCondition).orderBy('update_time', 'desc').get(),
      db.collection('ssj_budgets').where(syncCondition).orderBy('update_time', 'desc').get()
    ])

    return {
      success: true,
      data: {
        records: recordsRes.data || [],
        categories: categoriesRes.data || [],
        accounts: accountsRes.data || [],
        budgets: budgetsRes.data || [],
        server_time: now
      }
    }
  } catch (error) {
    console.error('Sync-data cloud function error:', error)
    return {
      success: false,
      error: error.message || 'Sync failed'
    }
  }
}
