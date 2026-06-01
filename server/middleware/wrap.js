/**
 * async route handler 包装器
 * 把 handler reject 转 next(err)，让统一 500 兜底能跑到
 *
 * 用法: router.get('/foo', verifyToken, wrap(async (req, res) => { ... }))
 */
export const wrap = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
