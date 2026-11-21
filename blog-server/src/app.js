import Koa from 'koa'
import helmet from 'koa-helmet'
import cors from '@koa/cors'
import logger from 'koa-logger'
import compress from 'koa-compress'
import bodyParser from '@koa/bodyparser'
import serve from 'koa-static'
import fs from 'node:fs'
import { config } from './config/index.js'
import { errorHandler } from './middleware/error-handler.js'
import { apiRouter, rssRouter } from './routes/index.js'
import { hitRateLimit } from './core/rate-limit.js'
import { clientIp } from './core/text.js'

export function createApp() {
  const app = new Koa()
  app.proxy = true

  app.use(errorHandler())

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginEmbedderPolicy: false,
    }),
  )

  app.use(
    cors({
      origin: (ctx) => {
        const requestOrigin = ctx.get('origin')
        if (!requestOrigin) return ''
        return config.corsOrigins.includes(requestOrigin) ? requestOrigin : ''
      },
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['Content-Length'],
      maxAge: 86400,
    }),
  )

  if (!config.isProd) app.use(logger())

  app.use(compress())

  app.use(
    bodyParser({
      enableTypes: ['json', 'form'],
      jsonLimit: '2mb',
      formLimit: '1mb',
      textLimit: '2mb',
    }),
  )

  // 静态资源：上传的图片/文件，仅接管 /uploads 前缀
  fs.mkdirSync(config.upload.dir, { recursive: true })
  const serveUploads = serve(config.upload.dir, { maxAge: 1000 * 60 * 60 * 24 * 7, hidden: false })
  const uploadPrefix = config.upload.urlPrefix
  app.use(async (ctx, next) => {
    if (!ctx.path.startsWith(`${uploadPrefix}/`)) return next()
    ctx.path = ctx.path.slice(uploadPrefix.length)
    await serveUploads(ctx, next)
  })

  // 全局兜底限频：同 IP 每分钟 300 次
  app.use(async (ctx, next) => {
    if (ctx.path.startsWith('/api/')) {
      const { allowed } = hitRateLimit(`global:${clientIp(ctx)}`, { windowMs: 60_000, max: 300 })
      if (!allowed) {
        ctx.status = 429
        ctx.body = { code: 429, message: '请求过于频繁，请稍后再试' }
        return
      }
    }
    await next()
  })

  app.use(async (ctx, next) => {
    if (ctx.path === '/health' || ctx.path === '/api/health') {
      ctx.body = { code: 0, message: 'ok', data: { status: 'up', time: new Date().toISOString() } }
      return
    }
    await next()
  })

  app.use(rssRouter.routes()).use(rssRouter.allowedMethods())
  app.use(apiRouter.routes()).use(apiRouter.allowedMethods())

  app.on('error', (error) => {
    console.error('[koa error]', error)
  })

  return app
}
