import { get, post } from './http'
import type { FriendLink, FriendLinkPayload } from './types'

export function getFriendLinks(): Promise<FriendLink[]> {
  return get<FriendLink[]>('/friend-links')
}

/** 友链申请（提交后待审核） */
export function applyFriendLink(payload: FriendLinkPayload): Promise<{ id: number; status: string }> {
  return post<{ id: number; status: string }>('/friend-links', payload)
}
