import { adminAuth } from '../../middleware/auth.js'
import * as controller from './notification.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerNotificationRoutes(router) {
  router.get('/api/admin/notifications', adminAuth, controller.handleList)
  router.get('/api/admin/notifications/unread-count', adminAuth, controller.handleUnreadCount)
  router.post('/api/admin/notifications/read-all', adminAuth, controller.handleReadAll)
  router.post('/api/admin/notifications/batch-delete', adminAuth, controller.handleBatchDelete)
  router.post('/api/admin/notifications/clear', adminAuth, controller.handleClear)
  router.patch('/api/admin/notifications/:id/read', adminAuth, controller.handleRead)
  router.delete('/api/admin/notifications/:id', adminAuth, controller.handleDelete)
}
