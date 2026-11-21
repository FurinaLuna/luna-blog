import { adminAuth } from '../../middleware/auth.js'
import * as controller from './site.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerSiteRoutes(router) {
  router.get('/api/site-config', controller.handleGetConfig)
  router.get('/api/site-stats', controller.handleStats)
  router.put('/api/admin/site-config', adminAuth, controller.handleUpdateConfig)
}
