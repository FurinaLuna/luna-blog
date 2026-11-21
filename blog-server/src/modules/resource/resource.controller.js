import { z } from 'zod'
import { ok } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import * as service from './resource.service.js'

const resourceWriteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '资源名称不能为空')
    .max(100, '资源名称最多 100 个字符'),
  url: z
    .string()
    .trim()
    .min(1, '资源地址不能为空')
    .max(500, '资源地址最多 500 个字符')
    .refine((value) => /^https?:\/\//i.test(value), '资源地址必须以 http(s):// 开头'),
  description: z.string().trim().max(255, '资源描述最多 255 个字符').optional(),
  icon: z.string().trim().max(500, '资源图标最多 500 个字符').optional(),
  category: z.string().trim().max(50, '资源分类最多 50 个字符').optional(),
  sort: z.coerce.number().int().min(0).max(9999).optional(),
})

/**
 * GET /api/resources
 */
export async function handleList(ctx) {
  const resources = await service.listResources()

  ok(ctx, resources)
}

/**
 * POST /api/admin/resources
 */
export async function handleCreate(ctx) {
  const payload = parseInput(resourceWriteSchema, ctx.request.body)
  const resource = await service.createResource(payload)

  ok(ctx, resource, '资源已创建')
}

/**
 * PUT /api/admin/resources/:id
 */
export async function handleUpdate(ctx) {
  const id = parseId(ctx.params.id)
  const payload = parseInput(resourceWriteSchema, ctx.request.body)
  const resource = await service.updateResource(id, payload)

  ok(ctx, resource, '资源已更新')
}

/**
 * DELETE /api/admin/resources/:id
 */
export async function handleDelete(ctx) {
  await service.deleteResource(parseId(ctx.params.id))

  ok(ctx, null, '资源已删除')
}
