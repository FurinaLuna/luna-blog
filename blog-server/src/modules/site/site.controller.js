import { ok } from '../../core/response.js'
import { parseInput } from '../../core/validate.js'
import { getSiteConfig, getSiteStats, siteConfigSchema, updateSiteConfig } from './site-config.service.js'

/** GET /api/site-config */
export async function handleGetConfig(ctx) {
  ok(ctx, await getSiteConfig())
}

/** PUT /api/admin/site-config */
export async function handleUpdateConfig(ctx) {
  // 只接受白名单 key，未声明的字段会被 zod 丢弃
  const patch = parseInput(siteConfigSchema.partial(), ctx.request.body ?? {})
  ok(ctx, await updateSiteConfig(patch), '站点配置已保存')
}

/** GET /api/site-stats */
export async function handleStats(ctx) {
  ok(ctx, await getSiteStats())
}
