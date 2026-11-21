import { adminAuth } from '../../middleware/auth.js'
import * as controller from './resource.controller.js'

/**
 * 资源导航相关路由。
 * @param {import('@koa/router')} router
 */
export function registerResourceRoutes(router) {
  // 公开接口
  router.get('/api/resources', controller.handleList)

  // 管理接口
  router.post('/api/admin/resources', adminAuth, controller.handleCreate)
  router.put('/api/admin/resources/:id', adminAuth, controller.handleUpdate)
  router.delete('/api/admin/resources/:id', adminAuth, controller.handleDelete)
}
