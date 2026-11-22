import { z } from 'zod'
import { ok } from '../../core/response.js'
import { parseInput } from '../../core/validate.js'
import { clientIp } from '../../core/text.js'
import { assertRateLimit } from '../../core/rate-limit.js'
import { getVisitStats, recordVisit } from './visit.service.js'

const visitSchema = z.object({
  path: z.string().trim().max(255).optional(),
  referer: z.string().trim().max(255).optional(),
})

/** POST /api/visit —— 前台每次路由切换上报一次，用于统计总访问量 / 总访客数 */
export async function handleVisit(ctx) {
  const body = parseInput(visitSchema, ctx.request.body ?? {})
  const ip = clientIp(ctx)

  /** 同一 IP 每分钟最多 60 次，足够真浏览，挡住脚本刷量 */
  assertRateLimit(`visit:${ip}`, {
    windowMs: 60 * 1000,
    max: 60,
    message: '访问太频繁了，稍后再试',
  })

  await recordVisit({
    ip,
    path: body.path ?? '',
    userAgent: ctx.get('user-agent'),
    referer: body.referer ?? ctx.get('referer'),
  })

  /** 顺带把最新统计回给前端，页脚无需再发一次请求 */
  const visit = await getVisitStats()
  ctx.status = 201
  ok(ctx, { recorded: true, visit })
}
