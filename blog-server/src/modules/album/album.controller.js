import { z } from 'zod'
import { ok } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import * as service from './album.service.js'

const albumWriteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, '相册名称不能为空')
    .max(100, '相册名称最多 100 个字符'),
  description: z.string().trim().max(255, '相册描述最多 255 个字符').optional(),
  cover: z.string().trim().max(500, '封面地址最多 500 个字符').optional(),
  sort: z.coerce.number().int().min(0).max(9999).optional(),
})

const photoItemSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, '图片地址不能为空')
    .max(500, '图片地址最多 500 个字符'),
  title: z.string().trim().max(100, '照片标题最多 100 个字符').optional(),
  description: z.string().trim().max(255, '照片描述最多 255 个字符').optional(),
  width: z.coerce.number().int().min(0).max(50000).optional(),
  height: z.coerce.number().int().min(0).max(50000).optional(),
  sort: z.coerce.number().int().min(0).max(9999).optional(),
})

const photoBatchSchema = z.object({
  photos: z
    .array(photoItemSchema)
    .min(1, '至少提交一张照片')
    .max(50, '一次最多提交 50 张照片'),
})

// 单张 {url,...} 或批量 {photos:[...]} 二选一
const photoCreateSchema = z.union([photoBatchSchema, photoItemSchema])
const photoUpdateSchema = photoItemSchema.partial()

/**
 * GET /api/albums
 */
export async function handleList(ctx) {
  const albums = await service.listAlbums()

  ok(ctx, albums)
}

/**
 * GET /api/albums/:id
 */
export async function handleDetail(ctx) {
  const album = await service.getAlbumDetail(parseId(ctx.params.id))

  ok(ctx, album)
}

/**
 * POST /api/admin/albums
 */
export async function handleCreate(ctx) {
  const payload = parseInput(albumWriteSchema, ctx.request.body)
  const album = await service.createAlbum(payload)

  ok(ctx, album, '相册已创建')
}

/**
 * PUT /api/admin/albums/:id
 */
export async function handleUpdate(ctx) {
  const id = parseId(ctx.params.id)
  const payload = parseInput(albumWriteSchema, ctx.request.body)
  const album = await service.updateAlbum(id, payload)

  ok(ctx, album, '相册已更新')
}

/**
 * DELETE /api/admin/albums/:id
 */
export async function handleDelete(ctx) {
  await service.deleteAlbum(parseId(ctx.params.id))

  ok(ctx, null, '相册已删除')
}

/**
 * POST /api/admin/albums/:id/photos
 */
export async function handleAddPhotos(ctx) {
  const id = parseId(ctx.params.id)
  const payload = parseInput(photoCreateSchema, ctx.request.body)
  const items = Array.isArray(payload.photos) ? payload.photos : [payload]
  const photos = await service.addPhotos(id, items)

  ok(ctx, photos, '照片已添加')
}

/**
 * PUT /api/admin/photos/:id
 */
export async function handleUpdatePhoto(ctx) {
  const id = parseId(ctx.params.id)
  const payload = parseInput(photoUpdateSchema, ctx.request.body)
  const photo = await service.updatePhoto(id, payload)

  ok(ctx, photo, '照片已更新')
}

/**
 * DELETE /api/admin/photos/:id
 */
export async function handleDeletePhoto(ctx) {
  await service.deletePhoto(parseId(ctx.params.id))

  ok(ctx, null, '照片已删除')
}
