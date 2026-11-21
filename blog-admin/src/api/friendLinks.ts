import { http } from './http'
import type { FriendLink, FriendLinkPayload, ReviewStatus } from './types'

/** 全部友链（含待审核） */
export function getAdminFriendLinks(): Promise<FriendLink[]> {
  return http.get<FriendLink[]>('/admin/friend-links')
}

export function reviewFriendLink(id: number, status: ReviewStatus): Promise<FriendLink> {
  return http.patch<FriendLink>(`/admin/friend-links/${id}/review`, { status })
}

export function updateFriendLink(id: number, payload: FriendLinkPayload): Promise<FriendLink> {
  return http.put<FriendLink>(`/admin/friend-links/${id}`, payload)
}

export function deleteFriendLink(id: number): Promise<void> {
  return http.delete<void>(`/admin/friend-links/${id}`)
}

/**
 * 后台新增友链：走管理接口，默认直接通过审核，不受访客限频影响。
 */
export function createFriendLink(payload: FriendLinkPayload): Promise<FriendLink> {
  return http.post<FriendLink>('/admin/friend-links', payload)
}
