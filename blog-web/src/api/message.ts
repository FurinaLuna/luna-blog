import { get, post } from './http'
import type { LikeResult, Message, MessagePayload, PageParams, Paginated } from './types'

export function getMessages(
  params: PageParams = {},
  options?: { silent?: boolean },
): Promise<Paginated<Message>> {
  return get<Paginated<Message>>(
    '/messages',
    { page: params.page, pageSize: params.pageSize },
    options,
  )
}

/** 留言（提交后待审核） */
export function createMessage(payload: MessagePayload): Promise<{ id: number; status: string }> {
  return post<{ id: number; status: string }>('/messages', payload)
}

export function likeMessage(id: number): Promise<LikeResult> {
  return post<LikeResult>(`/messages/${id}/like`)
}
