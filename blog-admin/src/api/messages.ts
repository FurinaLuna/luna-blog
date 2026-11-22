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

export type MessageBatchAction = 'approve' | 'reject' | 'delete'

export interface MessageBatchResult {
  affected: number
  requested: number
}

/** 批量通过 / 拒绝 / 删除留言 */
export function batchMessages(ids: number[], action: MessageBatchAction): Promise<MessageBatchResult> {
  return http.post<MessageBatchResult>('/admin/messages/batch', { ids, action })
}
