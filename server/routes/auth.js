import express from 'express'
import axios from 'axios'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'
import pool from '../db/mysql.js'

dotenv.config()

const router = express.Router()

// 微信 code 换 openid，发放 JWT
router.post('/login', async (req, res) => {
  try {
    const { code } = req.body
    if (!code) {
      return res.status(400).json({ error: 'code required' })
    }

    // 缺 appid/secret 走不通，直接 500 提示运维，而不是把错误吞掉
    if (!process.env.WECHAT_APPID || !process.env.WECHAT_SECRET) {
      console.error('WECHAT_APPID / WECHAT_SECRET not configured')
      return res.status(500).json({ error: 'WeChat credentials not configured' })
    }

    // 调用微信接口获取 openid；code 必须 URL-encode 否则 '&'/'#' 等字符会截断参数
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(process.env.WECHAT_APPID)}&secret=${encodeURIComponent(process.env.WECHAT_SECRET)}&js_code=${encodeURIComponent(code)}&grant_type=authorization_code`
    const wxRes = await axios.get(wxUrl, { timeout: 5000 })
    const { openid, session_key, unionid, errcode, errmsg } = wxRes.data

    // 微信返回 errcode 表示 code 无效/过期/超限，不要一棍子当 500
    if (errcode) {
      return res.status(400).json({ error: 'Invalid code', wechatErrcode: errcode, wechatErrmsg: errmsg })
    }
    if (!openid) {
      return res.status(400).json({ error: 'Invalid code' })
    }

    // 查找或创建用户
    const [rows] = await pool.execute('SELECT * FROM users WHERE openid = ?', [openid])
    let userId
    if (rows.length === 0) {
      const [insertResult] = await pool.execute('INSERT INTO users (openid) VALUES (?)', [openid])
      userId = insertResult.insertId
    } else {
      userId = rows[0].id
    }

    // 生成 JWT
    const token = jwt.sign({ openid, userId }, process.env.JWT_SECRET, { expiresIn: '30d' })

    // 更新用户 token
    await pool.execute('UPDATE users SET token = ? WHERE id = ?', [token, userId])

    res.json({ success: true, token, openid, session_key, unionid })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router