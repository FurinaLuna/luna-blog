import { z } from 'zod'
import { ok } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import { clientIp } from '../../core/text.js'
import * as service from './friend-link.service.js'

const httpUrl = (fieldName) =>
  z
    .string()
    .trim()
    .min(1, `${fieldName}不能为空`)
    .max(500, `${fieldName}最多 500 个字符`)
    .refine((value) => /^https?:\/\//i.test(value), `${fieldName}必须以 http(s):// 开头`)

const applySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '站点名称不能为空')
    .max(50, '站点名称最多 50 个字符'),
  url: httpUrl('站点地址'),
  avatar: z
    .string()
    .trim()
    .max(500, '头像地址最多 500 个字符')
    .refine((value) => value === '' || /^https?:\/\//i.test(value), '头像地址必须以 http(s):// 开头')
    .optional(),
  description: z.string().trim().max(255, '站点描述最多 255 个字符').optional(),
})

const updateSchema = applySchema.extend({
  sort: z.coerce.number().int().min(0).max(9999).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
})

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected'], { message: '审核状态不正确' }),
})

const createSchema = applySchema.extend({
  sort: z.coerce.number().int().min(0).max(9999).optional(),
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
})

/**
 * GET /api/friend-links
 */
export async function handleList(ctx) {
  const friendLinks = await service.listApprovedFriendLinks()

  ok(ctx, friendLinks)
}

/**
 * POST /api/friend-links
 */
export async function handleApply(ctx) {
  const payload = parseInput(applySchema, ctx.request.body)
  const result = await service.applyFriendLink(payload, clientIp(ctx))

  ok(ctx, result, '友链申请已提交，审核通过后展示')
}

/**
 * GET /api/admin/friend-links
 */
export async function handleAdminList(ctx) {
  const friendLinks = await service.listAllFriendLinks()

  ok(ctx, friendLinks)
}

/**
 * POST /api/admin/friend-links
 * 管理员直接新增友链（默认 approved，不受访客限频影响）。
 */
export async function handleCreate(ctx) {
  const payload = parseInput(createSchema, ctx.request.body)
  const friendLink = await service.createFriendLink(payload)

  ok(ctx, friendLink, '友链已创建')
}

/**
 * PATCH /api/admin/friend-links/:id/review
 */
export async function handleReview(ctx) {
  const id = parseId(ctx.params.id)
  const { status } = parseInput(reviewSchema, ctx.request.body)
  const friendLink = await service.reviewFriendLink(id, status)

  ok(ctx, friendLink, status === 'approved' ? '友链已通过审核' : '友链已拒绝')
}

/**
 * PUT /api/admin/friend-links/:id
 */
export async function handleUpdate(ctx) {
  const id = parseId(ctx.params.id)
  const payload = parseInput(updateSchema, ctx.request.body)
  const friendLink = await service.updateFriendLink(id, payload)

  ok(ctx, friendLink, '友链已更新')
}

/**
 * DELETE /api/admin/friend-links/:id
 */
export async function handleDelete(ctx) {
  await service.deleteFriendLink(parseId(ctx.params.id))

  ok(ctx, null, '友链已删除')
}
