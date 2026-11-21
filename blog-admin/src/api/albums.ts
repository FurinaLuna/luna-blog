import { http } from './http'
import type { Album, AlbumDetail, AlbumPayload, Photo, PhotoPayload } from './types'

/** 相册列表（公开接口） */
export function getAlbums(): Promise<Album[]> {
  return http.get<Album[]>('/albums')
}

/** 相册详情（含照片） */
export function getAlbum(id: number): Promise<AlbumDetail> {
  return http.get<AlbumDetail>(`/albums/${id}`)
}

export function createAlbum(payload: AlbumPayload): Promise<Album> {
  return http.post<Album>('/admin/albums', payload)
}

export function updateAlbum(id: number, payload: AlbumPayload): Promise<Album> {
  return http.put<Album>(`/admin/albums/${id}`, payload)
}

export function deleteAlbum(id: number): Promise<void> {
  return http.delete<void>(`/admin/albums/${id}`)
}

/** 批量新增照片：一次提交多张已上传的图片 URL */
export function addAlbumPhotos(id: number, photos: PhotoPayload[]): Promise<Photo[]> {
  return http.post<Photo[]>(`/admin/albums/${id}/photos`, { photos })
}

export function updatePhoto(id: number, payload: Partial<PhotoPayload>): Promise<Photo> {
  return http.put<Photo>(`/admin/photos/${id}`, payload)
}

export function deletePhoto(id: number): Promise<void> {
  return http.delete<void>(`/admin/photos/${id}`)
}
