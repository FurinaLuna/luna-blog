import * as controller from './visit.controller.js'

/**
 * @param {import('@koa/router')} router
 */
export function registerVisitRoutes(router) {
  router.post('/api/visit', controller.handleVisit)
}
