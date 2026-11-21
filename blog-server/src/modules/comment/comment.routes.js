import { adminAuth } from '../../middleware/auth.js'
import * as controller from './comment.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerCommentRoutes(router) {
  router.get('/api/comments', controller.handleList)
  router.post('/api/comments', controller.handleCreate)
  router.post('/api/comments/:id/like', controller.handleLike)

  router.get('/api/admin/comments', adminAuth, controller.handleAdminList)
  router.patch('/api/admin/comments/:id/review', adminAuth, controller.handleReview)
  router.post('/api/admin/comments/:id/reply', adminAuth, controller.handleReply)
  router.delete('/api/admin/comments/:id', adminAuth, controller.handleDelete)
}
