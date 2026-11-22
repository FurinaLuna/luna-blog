import { adminAuth } from '../../middleware/auth.js'
import * as controller from './message.controller.js'

/**
 * 留言板相关路由。
 * @param {import('@koa/router')} router
 */
export function registerMessageRoutes(router) {
  // 公开接口（访客留言无需登录，限频 + 审核见 service）
  router.get('/api/messages', controller.handleList)
  router.post('/api/messages', controller.handleCreate)
  router.post('/api/messages/:id/like', controller.handleLike)

  // 管理接口
  router.get('/api/admin/messages', adminAuth, controller.handleAdminList)
  router.post('/api/admin/messages/batch', adminAuth, controller.handleBatch)
  router.patch('/api/admin/messages/:id/review', adminAuth, controller.handleReview)
  router.delete('/api/admin/messages/:id', adminAuth, controller.handleDelete)
}
