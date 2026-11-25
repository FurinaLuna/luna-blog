import { adminAuth } from '../../middleware/auth.js'
import * as controller from './music.controller.js'

/**
 * 音乐歌单路由。前台读启用列表，后台增删改与排序。
 * @param {import('@koa/router')} router
 */
export function registerMusicRoutes(router) {
  router.get('/api/music', controller.handleList)

  router.get('/api/admin/music', adminAuth, controller.handleAdminList)
  router.post('/api/admin/music', adminAuth, controller.handleCreate)
  router.put('/api/admin/music/reorder', adminAuth, controller.handleReorder)
  router.put('/api/admin/music/:id', adminAuth, controller.handleUpdate)
  router.delete('/api/admin/music/:id', adminAuth, controller.handleDelete)
}
