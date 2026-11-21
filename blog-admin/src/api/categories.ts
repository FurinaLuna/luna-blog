import { http } from './http'
import type { Category, CategoryPayload } from './types'

/** 分类列表（公开接口） */
export function getCategories(): Promise<Category[]> {
  return http.get<Category[]>('/categories')
}

export function createCategory(payload: CategoryPayload): Promise<Category> {
  return http.post<Category>('/admin/categories', payload)
}

export function updateCategory(id: number, payload: CategoryPayload): Promise<Category> {
  return http.put<Category>(`/admin/categories/${id}`, payload)
}

export function deleteCategory(id: number): Promise<void> {
  return http.delete<void>(`/admin/categories/${id}`)
}
