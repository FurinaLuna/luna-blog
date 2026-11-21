import Router from '@koa/router'
import { buildRssXml } from './rss.service.js'

/** RSS 不在 /api 下，单独挂在根路径 */
export const rssRouter = new Router()

rssRouter.get('/rss.xml', async (ctx) => {
  ctx.type = 'application/rss+xml; charset=utf-8'
  ctx.body = await buildRssXml()
})
