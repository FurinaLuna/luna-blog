import { ok, pageData } from '../../core/response.js'
import { parseId } from '../../core/validate.js'
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
