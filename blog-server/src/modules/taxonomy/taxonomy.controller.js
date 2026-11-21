import { z } from 'zod'
import { ok } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import * as service from './taxonomy.service.js'

const categorySchema = z.object({
  name: z.string().trim().min(1, '分类名称不能为空').max(30, '分类名称最多 30 个字符'),
  slug: z.string().trim().max(60).optional(),
  description: z.string().trim().max(200).optional(),
  sort: z.coerce.number().int().min(0).max(9999).optional(),
})

const tagSchema = z.object({
  name: z.string().trim().min(1, '标签名称不能为空').max(20, '标签名称最多 20 个字符'),
  slug: z.string().trim().max(60).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, '颜色格式必须是 #RRGGBB')
    .optional(),
})

/** GET /api/categories */
export async function handleCategories(ctx) {
  ok(ctx, await service.listCategories())
}

/** GET /api/tags */
export async function handleTags(ctx) {
  ok(ctx, await service.listTags())
}

/** POST /api/admin/categories */
export async function handleCreateCategory(ctx) {
  ok(ctx, await service.createCategory(parseInput(categorySchema, ctx.request.body)), '分类已创建')
}

/** PUT /api/admin/categories/:id */
export async function handleUpdateCategory(ctx) {
  ok(ctx, await service.updateCategory(parseId(ctx.params.id), parseInput(categorySchema, ctx.request.body)), '分类已更新')
}

/** DELETE /api/admin/categories/:id */
export async function handleDeleteCategory(ctx) {
  await service.deleteCategory(parseId(ctx.params.id))
  ok(ctx, null, '分类已删除')
}

/** POST /api/admin/tags */
export async function handleCreateTag(ctx) {
  ok(ctx, await service.createTag(parseInput(tagSchema, ctx.request.body)), '标签已创建')
}

/** PUT /api/admin/tags/:id */
export async function handleUpdateTag(ctx) {
  ok(ctx, await service.updateTag(parseId(ctx.params.id), parseInput(tagSchema, ctx.request.body)), '标签已更新')
}

/** DELETE /api/admin/tags/:id */
export async function handleDeleteTag(ctx) {
  await service.deleteTag(parseId(ctx.params.id))
  ok(ctx, null, '标签已删除')
}
