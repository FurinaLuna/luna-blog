import Router from '@koa/router'
import { Article } from '../../db/models/index.js'
import { config } from '../../config/index.js'
import { getSiteConfig } from '../site/site-config.service.js'

/**
 * robots.txt / sitemap.xml / llms.txt —— 不在 /api 下，与 /rss.xml 一样挂在根路径。
 * 纯 CSR 站点至少要给搜索引擎与 AI 爬虫提供明确的入口：
 * - robots.txt：放行常规抓取与主流 AI 爬虫（GEO 要求），只封后台
 * - sitemap.xml：全部可索引 URL + 文章封面图（image sitemap）
 * - llms.txt：给大模型看的站点摘要与文章清单
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

/** 显式放行的 AI 爬虫（GEO：让大模型读得到内容） */
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'ClaudeBot',
  'Claude-Web',
  'anthropic-ai',
  'PerplexityBot',
  'Perplexity-User',
  'Google-Extended',
  'Applebot-Extended',
  'CCBot',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'YouBot',
  'DuckAssistBot',
]

const CACHE_SECONDS = 3600

const esc = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const iso = (date) => (date ? new Date(date).toISOString() : new Date().toISOString())

/** 文章封面：库里可能是相对路径，输出成绝对 URL；非 http(s) 的忽略 */
const absoluteCover = (cover) => {
  if (!cover) return ''
  try {
    return new URL(cover, config.siteUrl).href
  } catch {
    return ''
  }
}

seoRouter.get('/robots.txt', (ctx) => {
  const lines = ['User-agent: *', 'Disallow: /admin/', 'Disallow: /api/admin/', 'Allow: /', '']
  for (const bot of AI_BOTS) {
    lines.push(`User-agent: ${bot}`, 'Disallow: /admin/', 'Disallow: /api/admin/', 'Allow: /', '')
  }
  lines.push(`Sitemap: ${config.siteUrl}/sitemap.xml`, '')
  ctx.type = 'text/plain; charset=utf-8'
  ctx.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`)
  ctx.body = lines.join('\n')
})

seoRouter.get('/sitemap.xml', async (ctx) => {
  const articles = await Article.findAll({
    where: { status: 'published' },
    attributes: ['id', 'title', 'cover', 'updatedAt', 'publishedAt'],
    order: [
      ['isTop', 'DESC'],
      ['publishedAt', 'DESC'],
      ['id', 'DESC'],
    ],
    limit: 5000,
  })

  const latest = articles.reduce((acc, article) => {
    const time = new Date(article.updatedAt ?? article.publishedAt ?? 0).getTime()
    return time > acc ? time : acc
  }, 0)

  const urls = [
    ...STATIC_PATHS.map((path) => ({
      loc: `${config.siteUrl}${path}`,
      lastmod: path === '' && latest > 0 ? iso(latest) : null,
      changefreq: path === '' ? 'daily' : 'weekly',
      priority: path === '' ? '1.0' : '0.6',
      images: [],
    })),
    ...articles.map((article) => ({
      loc: `${config.siteUrl}/article/${article.id}`,
      lastmod: iso(article.updatedAt ?? article.publishedAt),
      changefreq: 'monthly',
      priority: '0.8',
      images: [absoluteCover(article.cover)].filter(Boolean),
    })),
  ]

  const body = urls
    .map((url) => {
      const lines = [`    <loc>${esc(url.loc)}</loc>`]
      if (url.lastmod) lines.push(`    <lastmod>${esc(url.lastmod)}</lastmod>`)
      lines.push(`    <changefreq>${url.changefreq}</changefreq>`)
      lines.push(`    <priority>${url.priority}</priority>`)
      for (const image of url.images) lines.push(`    <image:image><image:loc>${esc(image)}</image:loc></image:image>`)
      return `  <url>\n${lines.join('\n')}\n  </url>`
    })
    .join('\n')

  ctx.type = 'application/xml; charset=utf-8'
  ctx.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`)
  ctx.body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${body}\n</urlset>\n`
})

/**
 * llms.txt：给大模型读的站点说明（https://llmstxt.org 约定）。
 * 只给摘要与链接，正文由爬虫按链接访问；缓存 1 小时，避免每次抓取都查库。
 */
seoRouter.get('/llms.txt', async (ctx) => {
  const [site, articles] = await Promise.all([
    getSiteConfig(),
    Article.findAll({
      where: { status: 'published' },
      attributes: ['id', 'title', 'summary', 'updatedAt', 'publishedAt'],
      order: [
        ['isTop', 'DESC'],
        ['publishedAt', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: 50,
    }),
  ])

  const siteName = site.siteName || 'Luna Blog'
  const siteDescription = site.siteDescription || '一个记录技术、生活与思考的数字花园。'
  const author = site.author || 'Luna'

  const lines = [
    `# ${siteName}`,
    '',
    `> ${siteDescription}`,
    '',
    `- 站点地址：${config.siteUrl}/`,
    `- 作者：${author}`,
    `- 更新时间：${new Date().toISOString().slice(0, 10)}`,
    `- 全量文章清单：${config.siteUrl}/sitemap.xml`,
    `- RSS 订阅：${config.siteUrl}/rss.xml`,
    `- 机器可读全文：${config.siteUrl}/md/<文章ID>（Markdown，无需执行 JS）`,
    '',
    '## 主要栏目',
    '',
    ...STATIC_PATHS.filter(Boolean).map((path) => `- ${config.siteUrl}${path}`),
    '',
    '## 最近文章',
    '',
    ...articles.map((article) => {
      const summary = String(article.summary || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 120)
      const date = iso(article.publishedAt ?? article.updatedAt).slice(0, 10)
      const tail = summary ? `：${summary}` : ''
      return `- [${article.title}](${config.siteUrl}/article/${article.id})（${date}）${tail} ｜ 全文：${config.siteUrl}/md/${article.id}`
    }),
    '',
  ]

  ctx.type = 'text/plain; charset=utf-8'
  ctx.set('Cache-Control', `public, max-age=${CACHE_SECONDS}`)
  ctx.body = lines.join('\n')
})

/**
 * /md/:id —— 机器可读的文章全文（Markdown）。
 * 纯 CSR 页面里的正文对不执行 JS 的 AI 爬虫不可见，这里直接给一份带元信息的 Markdown，
 * 与 llms.txt / sitemap.xml 相互配合，满足 GEO「内容可被读取」的要求。
 */
seoRouter.get('/md/:id', async (ctx) => {
  const id = Number(ctx.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    ctx.status = 404
    ctx.type = 'text/plain; charset=utf-8'
    ctx.body = 'Not Found'
    return
  }

  const [article, site] = await Promise.all([
    Article.findOne({
      where: { id, status: 'published' },
      attributes: ['id', 'title', 'content', 'summary', 'readingTime', 'publishedAt', 'updatedAt'],
    }),
    getSiteConfig(),
  ])

  if (!article) {
    ctx.status = 404
    ctx.type = 'text/plain; charset=utf-8'
    ctx.body = 'Not Found'
    return
  }

  const sourceUrl = `${config.siteUrl}/article/${article.id}`
  const published = iso(article.publishedAt ?? article.updatedAt).slice(0, 10)
  const updated = iso(article.updatedAt).slice(0, 10)
  const meta = [
    `- 作者：${site.author || 'Luna'}`,
    `- 发布：${published}`,
    `- 更新：${updated}`,
    `- 原文：${sourceUrl}`,
  ]
  if (article.readingTime) meta.push(`- 阅读时长：约 ${article.readingTime} 分钟`)

  ctx.type = 'text/markdown; charset=utf-8'
  ctx.set('Cache-Control', 'public, max-age=600')
  ctx.body = [
    `# ${article.title}`,
    '',
    ...meta,
    '',
    '---',
    '',
    String(article.content || article.summary || '').trim(),
    '',
  ].join('\n')
})
