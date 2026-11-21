import { adminAuthOnly } from '../../middleware/auth.js'
import * as controller from './auth.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerAuthRoutes(router) {
  router.post('/api/auth/login', controller.handleLogin)
  router.get('/api/auth/profile', adminAuthOnly, controller.handleProfile)
  // 首登强制改密时也必须能调用，因此只校验登录态
  router.put('/api/auth/password', adminAuthOnly, controller.handleChangePassword)
}
