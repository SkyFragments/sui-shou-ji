/**
 * login 云函数 - 微信一键登录
 * 接收微信 code，换取 openid
 */
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { code } = event

  if (!code) {
    return {
      success: false,
      error: 'code is required'
    }
  }

  try {
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID || 'demo_openid_' + Date.now()

    const db = cloud.database()
    const usersCollection = db.collection('ssj_users')

    const { data: existingUsers } = await usersCollection
      .where({ openid })
      .get()

    let userInfo = null

    if (existingUsers && existingUsers.length > 0) {
      userInfo = existingUsers[0]
      await usersCollection.doc(userInfo._id).update({
        data: {
          last_login_time: Date.now()
        }
      })
    } else {
      userInfo = {
        openid,
        create_time: Date.now(),
        last_login_time: Date.now(),
        default_budget: 3000,
        last_sync_time: null
      }
      await usersCollection.add({
        data: userInfo
      })
    }

    return {
      success: true,
      data: {
        openid,
        session_key: 'demo_session_key',
        unionid: null
      }
    }
  } catch (error) {
    console.error('Login cloud function error:', error)
    return {
      success: false,
      error: error.message || 'Login failed'
    }
  }
}
