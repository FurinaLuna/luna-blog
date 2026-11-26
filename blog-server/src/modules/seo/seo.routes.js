import Router from '@koa/router'
import { Article } from '../../db/models/index.js'
import { config } from '../../config/index.js'

/**
 * robots.txt / sitemap.xml —— 不在 /api 下，与 /rss.xml 一样挂在根路径。
 * 纯 CSR 站点至少先让搜索引擎拿到 URL 清单与 canonical 目标。
 */
export const seoRouter = new Router()

/** 前台静态页（与 blog-web 路由一一对应，首页用空串） */
const STATIC_PATHS = [
  '',
  '/archives',
  '/categories',
  '/tags',
  '/albums',
  '/talks',
  '/resources',
  '/friends',
  '/message',
  '/about',
]

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const iso = (date) => (date ? new Date(date).toISOString() : new Date().toISOString())

seoRouter.get('/robots.txt', (ctx) => {
  ctx.type = 'text/plain; charset=utf-8'
  ctx.set('Cache-Control', 'public, max-age=3600')
  ctx.body = ['User-agent: *', 'Disallow: /admin/', 'Allow: /', '', `Sitemap: ${config.siteUrl}/sitemap.xml`, ''].join('\n')
})

seoRouter.get('/sitemap.xml', async (ctx) => {
  const articles = await Article.findAll({
    where: { status: 'published' },
    attributes: ['id', 'updatedAt', 'publishedAt'],
    order: [
      ['isTop', 'DESC'],
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: 5000,
  })

  const urls = [
    ...STATIC_PATHS.map((path) => ({
      loc: `${config.siteUrl}${path}`,
      lastmod: null,
      changefreq: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? '1.0' : '0.6',
    })),
    ...articles.map((article) => ({
      loc: `${config.siteUrl}/article/${article.id}`,
      lastmod: iso(article.updatedAt ?? article.publishedAt),
      changefreq: 'monthly',
      priority: '0.8',
    })),
  ]

  const body = urls
    .map((url) => {
      const lines = [`    <loc>${esc(url.loc)}</loc>`]
      if (url.lastmod) lines.push(`    <lastmod>${esc(url.lastmod)}</lastmod>`)
      lines.push(`    <changefreq>${url.changefreq}</changefreq>`)
      lines.push(`    <priority>${url.priority}</priority>`)
      return `  <url>\n${lines.join('\n')}\n  </url>`
    })
    .join('\n')

  ctx.type = 'application/xml; charset=utf-8'
  ctx.set('Cache-Control', 'public, max-age=3600')
  ctx.body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`
})
