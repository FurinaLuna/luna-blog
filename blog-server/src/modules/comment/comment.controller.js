import { z } from 'zod'
import { ok, pageData } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import { resolvePaging } from '../../core/pagination.js'
import { clientIp } from '../../core/text.js'
import * as service from './comment.service.js'

const listQuerySchema = z.object({
  targetType: z.enum(['article', 'talk']).default('article'),
  targetId: z.coerce.number().int().positive(),
})

const createSchema = z
  .object({
    targetType: z.enum(['article', 'talk']),
    articleId: z.coerce.number().int().positive().optional(),
    talkId: z.coerce.number().int().positive().optional(),
    parentId: z.coerce.number().int().positive().optional(),
    nickname: z.string().trim().min(1, '请输入昵称').max(20, '昵称最多 20 个字符'),
    email: z.string().trim().toLowerCase().email('请输入正确的邮箱').max(100),
    website: z
      .string()
      .trim()
      .max(200)
      .refine((value) => value === '' || /^https?:\/\/.+/i.test(value), '网站地址必须是 http(s) 开头')
      .optional()
      .default(''),
    content: z.string().trim().min(2, '评论内容至少 2 个字').max(500, '评论内容最多 500 个字'),
  })
  .refine(
    (data) => (data.targetType === 'article' ? Boolean(data.articleId) : Boolean(data.talkId)),
    { message: '缺少评论目标', path: ['targetId'] },
  )

const reviewSchema = z.object({ status: z.enum(['approved', 'rejected']) })
const replySchema = z.object({ content: z.string().trim().min(1, '回复内容不能为空').max(500, '回复最多 500 个字符') })
const adminListQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  targetType: z.enum(['article', 'talk']).optional(),
  keyword: z.string().trim().max(60).optional(),
})

/** GET /api/comments */
export async function handleList(ctx) {
  const { targetType, targetId } = parseInput(listQuerySchema, ctx.query)
  const paging = resolvePaging(ctx.query)
  const { list, total } = await service.listComments({ targetType, targetId, ...paging })
  ok(ctx, pageData(list, total, paging))
}

/** POST /api/comments —— 访客免登录提交，是否审核取决于站点配置 */
export async function handleCreate(ctx) {
  const input = parseInput(createSchema, ctx.request.body)
  const meta = { ip: clientIp(ctx), userAgent: ctx.get('user-agent') ?? '' }
  const result = await service.createVisitorComment(input, meta)
  ok(ctx, result, result.status === 'approved' ? '评论已发布' : '评论已提交，审核通过后展示')
}

/** POST /api/comments/:id/like */
export async function handleLike(ctx) {
  ok(ctx, await service.likeComment(parseId(ctx.params.id), clientIp(ctx)), '点赞成功')
}

/** GET /api/admin/comments */
export async function handleAdminList(ctx) {
  const filters = parseInput(adminListQuerySchema, ctx.query)
  const paging = resolvePaging(ctx.query)
  const { list, total } = await service.listAdminComments({ ...filters, ...paging })
  ok(ctx, pageData(list, total, paging))
}

/** PATCH /api/admin/comments/:id/review */
export async function handleReview(ctx) {
  const { status } = parseInput(reviewSchema, ctx.request.body)
  ok(ctx, await service.reviewComment(parseId(ctx.params.id), status), status === 'approved' ? '已通过审核' : '已拒绝')
}

/** POST /api/admin/comments/:id/reply */
export async function handleReply(ctx) {
  const { content } = parseInput(replySchema, ctx.request.body)
  const admin = ctx.state.admin
  ok(ctx, await service.replyAsAdmin(parseId(ctx.params.id), content, admin), '回复成功')
}

/** DELETE /api/admin/comments/:id */
export async function handleDelete(ctx) {
  await service.deleteComment(parseId(ctx.params.id))
  ok(ctx, null, '评论已删除')
}

const batchSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, '请选择要操作的评论').max(200, '一次最多 200 条'),
  action: z.enum(['approve', 'reject', 'delete']),
})

/** POST /api/admin/comments/batch —— 批量通过 / 拒绝 / 删除 */
export async function handleBatch(ctx) {
  const { ids, action } = parseInput(batchSchema, ctx.request.body)
  const result = await service.batchComments(ids, action)
  const label = action === 'approve' ? '已通过' : action === 'reject' ? '已拒绝' : '已删除'
  ok(ctx, result, `${label} ${result.affected} 条评论`)
}
