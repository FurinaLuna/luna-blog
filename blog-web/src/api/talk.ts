import { get, post } from './http'
import type { LikeResult, PageParams, Paginated, Talk } from './types'

export function getTalks(params: PageParams = {}): Promise<Paginated<Talk>> {
  return get<Paginated<Talk>>('/talks', { page: params.page, pageSize: params.pageSize })
}

export function likeTalk(id: number): Promise<LikeResult> {
  return post<LikeResult>(`/talks/${id}/like`)
}
