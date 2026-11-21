import { z } from 'zod'
import { ok, pageData } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import { resolvePaging } from '../../core/pagination.js'
import { clientIp } from '../../core/text.js'
import * as service from './talk.service.js'

const talkWriteSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, '说说内容不能为空')
    .max(1000, '说说内容最多 1000 个字符'),
  images: z
    .array(z.string().trim().min(1, '图片地址不能为空').max(500, '图片地址最多 500 个字符'))
    .max(20, '最多上传 20 张图片')
    .optional(),
})

/**
 * GET /api/talks
 */
export async function handleList(ctx) {
  const paging = resolvePaging(ctx.query)
  const { list, total } = await service.listTalks(paging)

  ok(ctx, pageData(list, total, paging))
}

/**
 * POST /api/talks/:id/like
 */
export async function handleLike(ctx) {
  const result = await service.likeTalk(parseId(ctx.params.id), clientIp(ctx))

  ok(ctx, result, '点赞成功')
}

/**
 * POST /api/admin/talks
 */
export async function handleCreate(ctx) {
  const payload = parseInput(talkWriteSchema, ctx.request.body)
  const talk = await service.createTalk(payload)

  ok(ctx, talk, '说说已发布')
}

/**
 * PUT /api/admin/talks/:id
 */
export async function handleUpdate(ctx) {
  const id = parseId(ctx.params.id)
  const payload = parseInput(talkWriteSchema, ctx.request.body)
  const talk = await service.updateTalk(id, payload)

  ok(ctx, talk, '说说已更新')
}

/**
 * DELETE /api/admin/talks/:id
 */
export async function handleDelete(ctx) {
  await service.deleteTalk(parseId(ctx.params.id))

  ok(ctx, null, '说说已删除')
}
