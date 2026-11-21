import { adminAuth } from '../../middleware/auth.js'
import * as controller from './taxonomy.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerTaxonomyRoutes(router) {
  router.get('/api/categories', controller.handleCategories)
  router.get('/api/tags', controller.handleTags)

  router.post('/api/admin/categories', adminAuth, controller.handleCreateCategory)
  router.put('/api/admin/categories/:id', adminAuth, controller.handleUpdateCategory)
  router.delete('/api/admin/categories/:id', adminAuth, controller.handleDeleteCategory)

  router.post('/api/admin/tags', adminAuth, controller.handleCreateTag)
  router.put('/api/admin/tags/:id', adminAuth, controller.handleUpdateTag)
  router.delete('/api/admin/tags/:id', adminAuth, controller.handleDeleteTag)
}
