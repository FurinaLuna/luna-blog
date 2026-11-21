import { http } from './http'
import type { SiteConfig } from './types'

/** 站点配置（公开接口，返回扁平配置对象） */
export function getSiteConfig(): Promise<SiteConfig> {
  return http.get<SiteConfig>('/site-config')
}

/** 保存站点配置（按 key 合并，可只提交变更分组） */
export function updateSiteConfig(payload: Partial<SiteConfig>): Promise<SiteConfig> {
  return http.put<SiteConfig>('/admin/site-config', payload)
}
