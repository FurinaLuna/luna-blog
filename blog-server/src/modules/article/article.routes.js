import { adminAuth } from '../../middleware/auth.js'
import * as controller from './article.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerArticleRoutes(router) {
  router.get('/api/articles', controller.handleList)
  router.get('/api/articles/recommend', controller.handleRecommend)
  router.get('/api/articles/archives', controller.handleArchives)
  router.get('/api/articles/:id', controller.handleDetail)
  router.post('/api/articles/:id/like', controller.handleLike)

  router.get('/api/admin/articles', adminAuth, controller.handleAdminList)
  router.get('/api/admin/articles/:id', adminAuth, controller.handleAdminDetail)
  router.post('/api/admin/articles', adminAuth, controller.handleCreate)
  router.put('/api/admin/articles/:id', adminAuth, controller.handleUpdate)
  router.patch('/api/admin/articles/:id/flags', adminAuth, controller.handleFlags)
  router.delete('/api/admin/articles/:id', adminAuth, controller.handleDelete)
}
