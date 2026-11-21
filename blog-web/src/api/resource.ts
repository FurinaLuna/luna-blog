import { get } from './http'
import type { Resource } from './types'

export function getResources(): Promise<Resource[]> {
  return get<Resource[]>('/resources')
}
