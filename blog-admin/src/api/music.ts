import { http } from './http'

/** 歌曲（站内歌单） */
export interface Music {
  id: number
  title: string
  artist: string
  album: string
  cover: string
  url: string
  lrc: string
  sort: number
  enabled: boolean
}

export interface MusicPayload {
  title: string
  artist?: string
  album?: string
  cover?: string
  url: string
  lrc?: string
  sort?: number
  enabled?: boolean
}

/** 后台歌单（含停用项） */
export function getAdminMusic(): Promise<Music[]> {
  return http.get<Music[]>('/admin/music')
}

export function createMusic(payload: MusicPayload): Promise<Music> {
  return http.post<Music>('/admin/music', payload)
}

export function updateMusic(id: number, payload: MusicPayload): Promise<Music> {
  return http.put<Music>(`/admin/music/${id}`, payload)
}

export function reorderMusic(items: Array<{ id: number; sort: number }>): Promise<Music[]> {
  return http.put<Music[]>('/admin/music/reorder', { items })
}

export function deleteMusic(id: number): Promise<void> {
  return http.delete<void>(`/admin/music/${id}`)
}
