import { adminAuth } from '../../middleware/auth.js'
import * as controller from './friend-link.controller.js'

/**
 * 友情链接相关路由。
 * @param {import('@koa/router')} router
 */
export function registerFriendLinkRoutes(router) {
  // 公开接口（访客申请无需登录，限频 + 审核见 service）
  router.get('/api/friend-links', controller.handleList)
  router.post('/api/friend-links', controller.handleApply)

  // 管理接口
  router.get('/api/admin/friend-links', adminAuth, controller.handleAdminList)
  router.patch('/api/admin/friend-links/:id/review', adminAuth, controller.handleReview)
  router.put('/api/admin/friend-links/:id', adminAuth, controller.handleUpdate)
  router.delete('/api/admin/friend-links/:id', adminAuth, controller.handleDelete)
}
