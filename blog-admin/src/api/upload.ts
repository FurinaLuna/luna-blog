import { http } from './http'
import type { UploadResult } from './types'

/** 上传单个文件，返回可直接使用的 URL（相对路径） */
export function uploadFile(file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
  const form = new FormData()
  form.append('file', file)

  return http.post<UploadResult>('/admin/upload', form, {
    timeout: 60000,
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress(event) {
      if (!onProgress || !event.total) return
      onProgress(Math.round((event.loaded / event.total) * 100))
    },
  })
}
