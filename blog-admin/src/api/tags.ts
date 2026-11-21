import { http } from './http'
import type { Tag, TagPayload } from './types'

/** 标签列表（公开接口） */
export function getTags(): Promise<Tag[]> {
  return http.get<Tag[]>('/tags')
}

export function createTag(payload: TagPayload): Promise<Tag> {
  return http.post<Tag>('/admin/tags', payload)
}

export function updateTag(id: number, payload: TagPayload): Promise<Tag> {
  return http.put<Tag>(`/admin/tags/${id}`, payload)
}

export function deleteTag(id: number): Promise<void> {
  return http.delete<void>(`/admin/tags/${id}`)
}
