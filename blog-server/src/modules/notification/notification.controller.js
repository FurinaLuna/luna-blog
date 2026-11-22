import { z } from 'zod'
import { ok, pageData } from '../../core/response.js'
import { parseId, parseInput } from '../../core/validate.js'
import { resolvePaging } from '../../core/pagination.js'
import * as service from './notification.service.js'

/** GET /api/admin/notifications */
export async function handleList(ctx) {
  const paging = resolvePaging(ctx.query)
  const unreadOnly = String(ctx.query.unreadOnly) === 'true'
  const { list, total } = await service.listNotifications({ ...paging, unreadOnly })
  ok(ctx, pageData(list, total, paging))
}

/** GET /api/admin/notifications/unread-count */
export async function handleUnreadCount(ctx) {
  ok(ctx, { count: await service.countUnread() })
}

/** PATCH /api/admin/notifications/:id/read */
export async function handleRead(ctx) {
  await service.markRead(parseId(ctx.params.id))
  ok(ctx, null, '已标记为已读')
}

/** POST /api/admin/notifications/read-all */
export async function handleReadAll(ctx) {
  await service.markAllRead()
  ok(ctx, null, '全部已读')
}

const batchSchema = z.object({
  ids: z.array(z.coerce.number().int().positive()).min(1, '请选择要删除的通知').max(200, '一次最多 200 条'),
})

/** POST /api/admin/notifications/batch-delete —— 删除勾选的通知 */
export async function handleBatchDelete(ctx) {
  const { ids } = parseInput(batchSchema, ctx.request.body)
  const result = await service.deleteNotifications(ids)
  ok(ctx, result, `已删除 ${result.affected} 条通知`)
}

/** DELETE /api/admin/notifications/:id */
export async function handleDelete(ctx) {
  await service.deleteNotifications([parseId(ctx.params.id)])
  ok(ctx, null, '通知已删除')
}

const clearSchema = z.object({
  scope: z.enum(['read', 'all']).default('read'),
})

/** POST /api/admin/notifications/clear —— 清空已读 / 清空全部 */
export async function handleClear(ctx) {
  const { scope } = parseInput(clearSchema, ctx.request.body ?? {})
  const result = scope === 'all' ? await service.clearAllNotifications() : await service.clearReadNotifications()
  ok(ctx, result, scope === 'all' ? `已清空全部 ${result.affected} 条通知` : `已清空 ${result.affected} 条已读通知`)
}
