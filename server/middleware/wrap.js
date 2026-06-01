/**
 * async route handler 包装器
 * 把 handler reject 转 next(err)，让统一 500 兜底能跑到
 *
 * 用法: router.get('/foo', verifyToken, wrap(async (req, res) => { ... }))
 */
export const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // 响应已发送就不要再触发 next(err)，否则 Express 默认 handler 会抛 ERR_HTTP_HEADERS_SENT
    if (res.headersSent) {
      console.error('Async error after response sent:', err)
      return
    }
    next(err)
  })
}
