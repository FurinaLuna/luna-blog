import { adminAuth } from '../../middleware/auth.js'
import * as controller from './notification.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerNotificationRoutes(router) {
  router.get('/api/admin/notifications', adminAuth, controller.handleList)
  router.get('/api/admin/notifications/unread-count', adminAuth, controller.handleUnreadCount)
  router.patch('/api/admin/notifications/:id/read', adminAuth, controller.handleRead)
  router.post('/api/admin/notifications/read-all', adminAuth, controller.handleReadAll)
}
