import { ok } from '../../core/response.js'
import * as service from './dashboard.service.js'

/**
 * GET /api/admin/dashboard
 */
export async function handleOverview(ctx) {
  const dashboard = await service.getDashboard()

  ok(ctx, dashboard)
}
