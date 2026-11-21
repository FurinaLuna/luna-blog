import { get, post } from './http'
import type {
  Comment,
  CommentCreated,
  CommentPayload,
  CommentQuery,
  LikeResult,
  Paginated,
} from './types'

/** 评论列表：顶层分页，replies 内嵌（最多 50 条） */
export function getComments(params: CommentQuery, options?: { silent?: boolean }): Promise<Paginated<Comment>> {
  return get<Paginated<Comment>>(
    '/comments',
    {
      targetType: params.targetType,
      targetId: params.targetId,
      page: params.page,
      pageSize: params.pageSize,
    },
    options,
  )
}

/** 发表评论（访客免登录，提交后待审核） */
export function createComment(payload: CommentPayload): Promise<CommentCreated> {
  return post<CommentCreated>('/comments', payload)
}

/** 评论点赞 */
export function likeComment(id: number): Promise<LikeResult> {
  return post<LikeResult>(`/comments/${id}/like`)
}
