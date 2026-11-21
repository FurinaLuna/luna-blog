import { adminAuth } from '../../middleware/auth.js'
import * as controller from './dashboard.controller.js'

/**
 * 仪表盘路由（仅管理端）。
 * @param {import('@koa/router')} router
 */
export function registerDashboardRoutes(router) {
  router.get('/api/admin/dashboard', adminAuth, controller.handleOverview)
}
