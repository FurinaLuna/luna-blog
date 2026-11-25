import { z } from 'zod'
import { ok } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import * as service from './music.service.js'

const musicWriteSchema = z.object({
  title: z.string().trim().min(1, '歌曲名不能为空').max(150, '歌曲名最多 150 个字符'),
  artist: z.string().trim().max(120).optional(),
  album: z.string().trim().max(120).optional(),
  cover: z.string().trim().max(500).optional(),
  url: z
    .string()
    .trim()
    .min(1, '音频地址不能为空')
    .max(500, '音频地址最多 500 个字符')
    .refine((value) => /^(https?:\/\/|\/uploads\/)/i.test(value), '音频地址必须是 http(s) 链接或 /uploads/ 路径'),
  lrc: z.string().trim().max(500).optional(),
  sort: z.coerce.number().int().min(0).max(9999).optional(),
  enabled: z.boolean().optional(),
})

const reorderSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.coerce.number().int().positive(),
        sort: z.coerce.number().int().min(0).max(9999),
      }),
    )
    .max(500),
})

/** GET /api/music —— 前台歌单（启用的） */
export async function handleList(ctx) {
  ok(ctx, await service.listMusic())
}

/** GET /api/admin/music —— 后台歌单（含停用） */
export async function handleAdminList(ctx) {
  ok(ctx, await service.listAdminMusic())
}

/** POST /api/admin/music */
export async function handleCreate(ctx) {
  const payload = parseInput(musicWriteSchema, ctx.request.body)
  ok(ctx, await service.createMusic(payload), '歌曲已添加')
}

/** PUT /api/admin/music/:id */
export async function handleUpdate(ctx) {
  const id = parseId(ctx.params.id)
  const payload = parseInput(musicWriteSchema, ctx.request.body)
  ok(ctx, await service.updateMusic(id, payload), '歌曲已更新')
}

/** PUT /api/admin/music/reorder */
export async function handleReorder(ctx) {
  const payload = parseInput(reorderSchema, ctx.request.body)
  ok(ctx, await service.reorderMusic(payload.items), '排序已保存')
}

/** DELETE /api/admin/music/:id */
export async function handleDelete(ctx) {
  await service.deleteMusic(parseId(ctx.params.id))
  ok(ctx, null, '歌曲已删除')
}
