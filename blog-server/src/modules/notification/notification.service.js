import { Notification } from '../../db/models/index.js'

/**
 * 写入一条后台通知。
 * @param {{ type: 'comment'|'message'|'friendlink'|'system', title: string, content?: string, targetType?: string, targetId?: number|null }} input
 */
export function createNotification(input) {
  return Notification.create({
    type: input.type,
    title: input.title,
    content: input.content ?? '',
    targetType: input.targetType ?? '',
    targetId: input.targetId ?? null,
  })
}

/**
 * @param {{ limit: number, offset: number, unreadOnly?: boolean }} params
 */
export async function listNotifications({ limit, offset, unreadOnly = false }) {
  const { count, rows } = await Notification.findAndCountAll({
    where: unreadOnly ? { isRead: false } : {},
    order: [['id', 'DESC']],
    limit,
    offset,
  })
  return {
    list: rows.map((row) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      content: row.content,
      isRead: row.isRead,
      targetType: row.targetType,
      targetId: row.targetId,
      createdAt: row.createdAt,
    })),
    total: count,
  }
}

/** 未读数 */
export function countUnread() {
  return Notification.count({ where: { isRead: false } })
}

/**
 * 标记单条已读
 * @param {number} id
 */
export async function markRead(id) {
  await Notification.update({ isRead: true }, { where: { id } })
}

/** 全部标记已读 */
export function markAllRead() {
  return Notification.update({ isRead: true }, { where: { isRead: false } })
}

/**
 * 批量删除通知；action='read' 时改为删除全部已读通知。
 * @param {number[]} ids
 */
export async function deleteNotifications(ids) {
  const affected = await Notification.destroy({ where: { id: ids } })
  return { affected, requested: ids.length }
}

/** 清空已读通知 */
export async function clearReadNotifications() {
  const affected = await Notification.destroy({ where: { isRead: true } })
  return { affected }
}

/** 清空全部通知 */
export async function clearAllNotifications() {
  const affected = await Notification.destroy({ where: {} })
  return { affected }
}
