import { z } from 'zod'
import { ok, pageData } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import { resolvePaging } from '../../core/pagination.js'
import { clientIp } from '../../core/text.js'
import * as service from './message.service.js'

const createSchema = z.object({
  nickname: z
    .string()
    .trim()
    .min(1, '昵称不能为空')
    .max(20, '昵称最多 20 个字符'),
  content: z
    .string()
    .trim()
    .min(1, '留言内容不能为空')
    .max(200, '留言内容最多 200 个字符'),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, '颜色格式不正确')
    .optional(),
})

const adminListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected'], { message: '审核状态不正确' }).optional(),
})

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected'], { message: '审核状态不正确' }),
})

/**
 * GET /api/messages
 */
export async function handleList(ctx) {
  const paging = resolvePaging(ctx.query)
  const { list, total } = await service.listApprovedMessages(paging)

  ok(ctx, pageData(list, total, paging))
}

/**
 * POST /api/messages
 */
export async function handleCreate(ctx) {
  const payload = parseInput(createSchema, ctx.request.body)
  const result = await service.createMessage(payload, clientIp(ctx))

  ok(ctx, result, '留言已提交，审核通过后展示')
}

/**
 * POST /api/messages/:id/like
 */
export async function handleLike(ctx) {
  const result = await service.likeMessage(parseId(ctx.params.id), clientIp(ctx))

  ok(ctx, result, '点赞成功')
}

/**
 * GET /api/admin/messages
 */
export async function handleAdminList(ctx) {
  const paging = resolvePaging(ctx.query)
  const { status } = parseInput(adminListQuerySchema, ctx.query)
  const { list, total } = await service.listAdminMessages({ status, ...paging })

  ok(ctx, pageData(list, total, paging))
}

/**
 * PATCH /api/admin/messages/:id/review
 */
export async function handleReview(ctx) {
  const id = parseId(ctx.params.id)
  const { status } = parseInput(reviewSchema, ctx.request.body)
  const message = await service.reviewMessage(id, status)

  ok(ctx, message, status === 'approved' ? '留言已通过审核' : '留言已拒绝')
}

/**
 * DELETE /api/admin/messages/:id
 */
export async function handleDelete(ctx) {
  await service.deleteMessage(parseId(ctx.params.id))

  ok(ctx, null, '留言已删除')
}
