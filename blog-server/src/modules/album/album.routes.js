import { adminAuth } from '../../middleware/auth.js'
import * as controller from './album.controller.js'

/**
 * 相册与照片相关路由。
 * @param {import('@koa/router')} router
 */
export function registerAlbumRoutes(router) {
  // 公开接口
  router.get('/api/albums', controller.handleList)
  router.get('/api/albums/:id', controller.handleDetail)

  // 管理接口
  router.post('/api/admin/albums', adminAuth, controller.handleCreate)
  router.put('/api/admin/albums/:id', adminAuth, controller.handleUpdate)
  router.delete('/api/admin/albums/:id', adminAuth, controller.handleDelete)
  router.post('/api/admin/albums/:id/photos', adminAuth, controller.handleAddPhotos)
  router.put('/api/admin/photos/:id', adminAuth, controller.handleUpdatePhoto)
  router.delete('/api/admin/photos/:id', adminAuth, controller.handleDeletePhoto)
}
