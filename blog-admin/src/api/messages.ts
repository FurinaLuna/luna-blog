import { http } from './http'
import type { MessageItem, MessageQuery, PageResult, ReviewStatus } from './types'

export function getAdminMessages(params: MessageQuery): Promise<PageResult<MessageItem>> {
  return http.get<PageResult<MessageItem>>('/admin/messages', { params })
}

export function reviewMessage(id: number, status: ReviewStatus): Promise<MessageItem> {
  return http.patch<MessageItem>(`/admin/messages/${id}/review`, { status })
}

export function deleteMessage(id: number): Promise<void> {
  return http.delete<void>(`/admin/messages/${id}`)
}
