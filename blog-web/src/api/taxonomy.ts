import { get } from './http'
import type { Category, Tag } from './types'

export function getCategories(options?: { silent?: boolean }): Promise<Category[]> {
  return get<Category[]>('/categories', undefined, options)
}

export function getTags(options?: { silent?: boolean }): Promise<Tag[]> {
  return get<Tag[]>('/tags', undefined, options)
}
