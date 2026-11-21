import { adminAuth } from '../../middleware/auth.js'
import { handleUpload, singleFile } from './upload.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerUploadRoutes(router) {
  router.post('/api/admin/upload', adminAuth, singleFile, handleUpload)
}
