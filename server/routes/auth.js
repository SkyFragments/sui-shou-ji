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

    // 调用微信接口获取 openid
    const wxUrl = `https://api.weixin.qq.com/sns/jscode2session?appid=${process.env.WECHAT_APPID}&secret=${process.env.WECHAT_SECRET}&js_code=${code}&grant_type=authorization_code`
    const wxRes = await axios.get(wxUrl)
    const { openid, session_key, unionid } = wxRes.data

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

    res.json({ success: true, token, openid })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: 'Login failed' })
  }
})

export default router