import { get } from './http'
import type { Album, AlbumDetail } from './types'

export function getAlbums(): Promise<Album[]> {
  return get<Album[]>('/albums')
}

/** 相册详情：扁平 album 字段 + photos 数组 */
export function getAlbum(id: number): Promise<AlbumDetail> {
  return get<AlbumDetail>(`/albums/${id}`)
}
