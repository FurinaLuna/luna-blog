import { get } from './http'
import type { SiteConfig, SiteStats } from './types'

/** 站点配置：后台静默加载，失败不打扰用户 */
export function getSiteConfig(options?: { silent?: boolean }): Promise<SiteConfig> {
  return get<SiteConfig>('/site-config', undefined, options)
}

export function getSiteStats(options?: { silent?: boolean }): Promise<SiteStats> {
  return get<SiteStats>('/site-stats', undefined, options)
}
