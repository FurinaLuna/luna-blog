import { http } from './http'
import type {
  NotificationItem,
  NotificationQuery,
  PageResult,
  UnreadCount,
} from './types'

/** 通知分页列表 */
export function getNotifications(params: NotificationQuery): Promise<PageResult<NotificationItem>> {
  return http.get<PageResult<NotificationItem>>('/admin/notifications', { params })
}

/** 未读通知数 */
export function getUnreadCount(): Promise<UnreadCount> {
  return http.get<UnreadCount>('/admin/notifications/unread-count')
}

/** 单条标记已读 */
export function markNotificationRead(id: number): Promise<void> {
  return http.patch<void>(`/admin/notifications/${id}/read`)
}

/** 全部标记已读 */
export function markAllNotificationsRead(): Promise<void> {
  return http.post<void>('/admin/notifications/read-all')
}
