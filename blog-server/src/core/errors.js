/**
 * 业务异常：统一携带 HTTP 状态码与可直接展示的中文文案。
 */
export class AppError extends Error {
  /**
   * @param {number} status HTTP 状态码
   * @param {string} message 面向用户的中文提示
   * @param {{ details?: Array<{field: string, message: string}>, data?: Record<string, unknown>, cause?: unknown }} [options]
   */
  constructor(status, message, options = {}) {
    super(message)
    this.name = 'AppError'
    this.status = status
    this.details = options.details
    this.data = options.data
    if (options.cause instanceof Error) this.cause = options.cause
    Error.captureStackTrace?.(this, AppError)
  }
}

export const badRequest = (message = '请求参数有误', details) => new AppError(400, message, { details })
export const unauthorized = (message = '请先登录') => new AppError(401, message)
export const forbidden = (message = '没有权限执行该操作', data) => new AppError(403, message, { data })
export const notFound = (message = '资源不存在') => new AppError(404, message)
export const conflict = (message = '数据冲突') => new AppError(409, message)
export const payloadTooLarge = (message = '文件超过大小限制') => new AppError(413, message)
export const tooManyRequests = (message = '操作太频繁，请稍后再试') => new AppError(429, message)
export const passwordChangeRequired = () =>
  new AppError(403, '首次登录请先修改初始密码', {
    data: { reason: 'PASSWORD_CHANGE_REQUIRED', message: '首次登录请先修改初始密码' },
  })
