import { http } from './http'
import type { Comment, CommentQuery, PageResult, ReviewStatus } from './types'

export function getAdminComments(params: CommentQuery): Promise<PageResult<Comment>> {
  return http.get<PageResult<Comment>>('/admin/comments', { params })
}

export function reviewComment(id: number, status: ReviewStatus): Promise<Comment> {
  return http.patch<Comment>(`/admin/comments/${id}/review`, { status })
}

export function replyComment(id: number, content: string): Promise<Comment> {
  return http.post<Comment>(`/admin/comments/${id}/reply`, { content })
}

export function deleteComment(id: number): Promise<void> {
  return http.delete<void>(`/admin/comments/${id}`)
}

export type BatchAction = 'approve' | 'reject' | 'delete'

export interface BatchResult {
  affected: number
  requested: number
}

/** 批量通过 / 拒绝 / 删除评论 */
export function batchComments(ids: number[], action: BatchAction): Promise<BatchResult> {
  return http.post<BatchResult>('/admin/comments/batch', { ids, action })
}
