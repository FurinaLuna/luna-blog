import { ZodError } from 'zod'
import { AppError } from '../core/errors.js'
import { config } from '../config/index.js'

/**
 * 把任意异常规整为 AppError（含 Sequelize 校验/唯一约束错误）。
 * @param {unknown} error
 */
function normalize(error) {
  if (error instanceof AppError) return error

  if (error instanceof ZodError) {
    const details = error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: issue.message,
    }))
    return new AppError(400, details[0]?.message ?? '请求参数有误', { details })
  }

  const name = error instanceof Error ? error.name : ''
  if (name === 'SequelizeUniqueConstraintError') {
    return new AppError(409, '数据已存在，请勿重复提交')
  }
  if (name === 'SequelizeValidationError') {
    const message =
      error instanceof Error && 'errors' in error
        ? /** @type {{ errors: Array<{ message: string }> }} */ (error).errors[0]?.message
        : undefined
    return new AppError(400, message ?? '数据校验未通过')
  }
  if (name === 'SequelizeForeignKeyConstraintError') {
    return new AppError(400, '关联数据不存在或仍被引用')
  }
  if (name === 'SequelizeConnectionError' || name === 'SequelizeConnectionRefusedError') {
    return new AppError(503, '数据库连接失败，请稍后再试')
  }

  // multer：文件过大 / 类型不符（fileFilter 抛出的普通 Error）
  if (name === 'MulterError') {
    const code = error instanceof Error && 'code' in error ? String(error.code) : ''
    return new AppError(code === 'LIMIT_FILE_SIZE' ? 413 : 400, code === 'LIMIT_FILE_SIZE' ? '文件超过大小限制' : '文件上传失败，请检查文件后重试')
  }
  if (error instanceof Error && (error.message.startsWith('不支持的文件类型') || error.message.startsWith('Unexpected field'))) {
    return new AppError(400, error.message === 'Unexpected field' ? '上传字段名必须为 file' : error.message)
  }

  return new AppError(500, config.isProd ? '服务器开小差了，请稍后再试' : (error instanceof Error ? error.message : '服务器内部错误'))
}

/** 统一错误处理中间件（最外层） */
export function errorHandler() {
  return async (ctx, next) => {
    try {
      await next()
      if (ctx.status === 404 && ctx.body === undefined) {
        ctx.status = 404
        ctx.body = { code: 404, message: '接口不存在' }
      }
    } catch (error) {
      const appError = normalize(error)
      ctx.status = appError.status
      ctx.body = {
        code: appError.status,
        message: appError.message,
        ...(appError.details ? { details: appError.details } : {}),
        ...(appError.data ? { data: appError.data } : {}),
      }
      if (appError.status >= 500) {
        console.error('[server error]', ctx.method, ctx.path, error)
      }
    }
  }
}
