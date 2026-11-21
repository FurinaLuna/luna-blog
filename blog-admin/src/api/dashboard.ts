import { http } from './http'
import type { DashboardData } from './types'

/** 仪表盘统计、最近文章与 7 天趋势 */
export function getDashboard(): Promise<DashboardData> {
  return http.get<DashboardData>('/admin/dashboard')
}
