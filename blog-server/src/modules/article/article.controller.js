import { z } from 'zod'
import { ok, pageData } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import { resolvePaging } from '../../core/pagination.js'
import { clientIp } from '../../core/text.js'
import * as service from './article.service.js'

const listQuerySchema = z.object({
  categoryId: z.coerce.number().int().positive().optional(),
  tagId: z.coerce.number().int().positive().optional(),
  keyword: z.string().trim().max(60).optional(),
  sort: z.enum(['latest', 'popular']).optional(),
})

const articleWriteSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(100, '标题最多 100 个字符'),
  summary: z.string().trim().max(200, '摘要最多 200 个字符').optional(),
  content: z.string().min(1, '正文不能为空'),
  cover: z.string().trim().max(500).optional(),
  categoryId: z.coerce.number().int().positive().nullable().optional(),
  tagIds: z.array(z.coerce.number().int().positive()).max(8, '最多选择 8 个标签').optional(),
  status: z.enum(['draft', 'published']).optional(),
  isRecommend: z.boolean().optional(),
  isTop: z.boolean().optional(),
  readingTime: z.coerce.number().int().min(0).max(600).optional(),
})

const flagsSchema = z.object({
  isRecommend: z.boolean().optional(),
  isTop: z.boolean().optional(),
  status: z.enum(['draft', 'published']).optional(),
})

const adminListQuerySchema = z.object({
  status: z.enum(['draft', 'published']).optional(),
  keyword: z.string().trim().max(60).optional(),
  categoryId: z.coerce.number().int().positive().optional(),
})

/** GET /api/articles */
export async function handleList(ctx) {
  const filters = parseInput(listQuerySchema, ctx.query)
  const paging = resolvePaging(ctx.query)
  const { list, total } = await service.listArticles({ ...filters, ...paging })
  ok(ctx, pageData(list, total, paging))
}

/** GET /api/articles/recommend */
export async function handleRecommend(ctx) {
  const limit = Math.min(Number(ctx.query.limit) || 6, 12)
  ok(ctx, await service.listRecommended(limit))
}

/** GET /api/articles/archives */
export async function handleArchives(ctx) {
  ok(ctx, await service.listArchives())
}

/** GET /api/articles/:id */
export async function handleDetail(ctx) {
  ok(ctx, await service.getArticleDetail(parseId(ctx.params.id), clientIp(ctx)))
}

/** POST /api/articles/:id/like */
export async function handleLike(ctx) {
  ok(ctx, await service.likeArticle(parseId(ctx.params.id), clientIp(ctx)), '点赞成功')
}

/** GET /api/admin/articles */
export async function handleAdminList(ctx) {
  const filters = parseInput(adminListQuerySchema, ctx.query)
  const paging = resolvePaging(ctx.query)
  const { list, total } = await service.listAdminArticles({ ...filters, ...paging })
  ok(ctx, pageData(list, total, paging))
}

/** GET /api/admin/articles/:id */
export async function handleAdminDetail(ctx) {
  ok(ctx, await service.getAdminArticle(parseId(ctx.params.id)))
}

/** POST /api/admin/articles */
export async function handleCreate(ctx) {
  const payload = parseInput(articleWriteSchema, ctx.request.body)
  ok(ctx, await service.createArticle(payload), '文章已保存')
}

/** PUT /api/admin/articles/:id */
export async function handleUpdate(ctx) {
  const payload = parseInput(articleWriteSchema, ctx.request.body)
  ok(ctx, await service.updateArticle(parseId(ctx.params.id), payload), '文章已更新')
}

/** PATCH /api/admin/articles/:id/flags */
export async function handleFlags(ctx) {
  const payload = parseInput(flagsSchema, ctx.request.body)
  ok(ctx, await service.updateArticleFlags(parseId(ctx.params.id), payload), '状态已更新')
}

/** DELETE /api/admin/articles/:id */
export async function handleDelete(ctx) {
  await service.deleteArticle(parseId(ctx.params.id))
  ok(ctx, null, '文章已删除')
}
