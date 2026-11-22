import { get, post } from './http'
import type { SiteConfig, SiteStats } from './types'

/** 站点配置：后台静默加载，失败不打扰用户 */
export interface VisitReport {
  recorded: boolean
  visit: { pv: number; uv: number }
}

export function getSiteConfig(options?: { silent?: boolean }): Promise<SiteConfig> {
  return get<SiteConfig>('/site-config', undefined, options)
}

export function getSiteStats(options?: { silent?: boolean }): Promise<SiteStats> {
  return get<SiteStats>('/site-stats', undefined, options)
}

/** 上报一次页面浏览（统计总访问量 / 总访客数），失败静默不影响浏览 */
export function recordVisit(path: string): Promise<VisitReport> {
  return post<VisitReport>(
    '/visit',
    { path, referer: typeof document === 'undefined' ? '' : document.referrer },
    { silent: true },
  )
}
