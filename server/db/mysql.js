import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

// 启动期校验：缺关键配置直接 fail-fast，不等第一次请求才报错
const REQUIRED_ENV = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET']
const missing = REQUIRED_ENV.filter(k => !process.env[k] || process.env[k].trim() === '')
if (missing.length) {
  console.error('Missing required env vars:', missing.join(', '))
  process.exit(1)
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
})

export default pool
