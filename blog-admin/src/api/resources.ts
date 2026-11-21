import { http } from './http'
import type { Resource, ResourcePayload } from './types'

/** 资源导航列表（公开接口） */
export function getResources(): Promise<Resource[]> {
  return http.get<Resource[]>('/resources')
}

export function createResource(payload: ResourcePayload): Promise<Resource> {
  return http.post<Resource>('/admin/resources', payload)
}

export function updateResource(id: number, payload: ResourcePayload): Promise<Resource> {
  return http.put<Resource>(`/admin/resources/${id}`, payload)
}

export function deleteResource(id: number): Promise<void> {
  return http.delete<void>(`/admin/resources/${id}`)
}
