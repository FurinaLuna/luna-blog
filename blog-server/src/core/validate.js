import { z } from 'zod'
import { badRequest } from './errors.js'

/**
 * 用 zod 校验入参，失败时抛出 400 并附带字段级 details。
 * @template {z.ZodType} T
 * @param {T} schema
 * @param {unknown} input
 * @returns {z.infer<T>}
 */
export function parseInput(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(body)',
      message: issue.message,
    }))
    throw badRequest(details[0]?.message ?? '请求参数有误', details)
  }
  return result.data
}

/** 常用校验片段 */
export const v = {
  id: z.coerce.number().int().positive(),
  /** 允许空字符串的可选字符串 */
  text: (max, message) => z.string().trim().max(max, message ?? `长度不能超过 ${max} 个字符`),
  required: (max, message) => z.string().trim().min(1, message ?? '不能为空').max(max),
  optionalUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => value === '' || /^https?:\/\/.+/i.test(value), '必须是 http(s) 开头的链接')
    .default(''),
  email: z.string().trim().toLowerCase().email('邮箱格式不正确').max(100),
}

/**
 * 解析 id 路径参数。
 * @param {string} raw
 */
export function parseId(raw) {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw badRequest('无效的资源 ID')
  return id
}
