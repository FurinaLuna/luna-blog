import { adminAuth } from '../../middleware/auth.js'
import * as controller from './talk.controller.js'

/**
 * 说说相关路由。
 * @param {import('@koa/router')} router
 */
export function registerTalkRoutes(router) {
  // 公开接口
  router.get('/api/talks', controller.handleList)
  router.post('/api/talks/:id/like', controller.handleLike)

  // 管理接口
  router.post('/api/admin/talks', adminAuth, controller.handleCreate)
  router.put('/api/admin/talks/:id', adminAuth, controller.handleUpdate)
  router.delete('/api/admin/talks/:id', adminAuth, controller.handleDelete)
}
