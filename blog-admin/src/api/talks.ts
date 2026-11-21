import { http } from './http'
import type { PageQuery, PageResult, Talk, TalkPayload } from './types'

/** 说说列表（公开接口，分页） */
export function getTalks(params: PageQuery): Promise<PageResult<Talk>> {
  return http.get<PageResult<Talk>>('/talks', { params })
}

export function createTalk(payload: TalkPayload): Promise<Talk> {
  return http.post<Talk>('/admin/talks', payload)
}

export function updateTalk(id: number, payload: TalkPayload): Promise<Talk> {
  return http.put<Talk>(`/admin/talks/${id}`, payload)
}

export function deleteTalk(id: number): Promise<void> {
  return http.delete<void>(`/admin/talks/${id}`)
}
