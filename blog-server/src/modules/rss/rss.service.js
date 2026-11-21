import { Article } from '../../db/models/index.js'
import { config } from '../../config/index.js'
import { excerpt } from '../../core/text.js'
import { getSiteConfig } from '../site/site-config.service.js'

/** XML 特殊字符转义 */
function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 生成 RSS 2.0 文档 */
export async function buildRssXml() {
  const [configData, articles] = await Promise.all([
    getSiteConfig(),
    Article.findAll({
      where: { status: 'published' },
      attributes: ['id', 'title', 'summary', 'content', 'publishedAt', 'createdAt'],
      order: [['publishedAt', 'DESC'], ['id', 'DESC']],
      limit: 20,
    }),
  ])

  const siteUrl = config.siteUrl
  const now = new Date().toUTCString()

  const items = articles
    .map((article) => {
      const url = `${siteUrl}/article/${article.id}`
      const description = article.summary || excerpt(article.content, 200)
      return [
        '    <item>',
        `      <title>${escapeXml(article.title)}</title>`,
        `      <link>${escapeXml(url)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(url)}</guid>`,
        `      <description>${escapeXml(description)}</description>`,
        `      <pubDate>${new Date(article.publishedAt ?? article.createdAt).toUTCString()}</pubDate>`,
        '    </item>',
      ].join('\n')
    })
    .join('\n')

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(configData.siteName)}</title>`,
    `    <link>${escapeXml(siteUrl)}</link>`,
    `    <description>${escapeXml(configData.siteDescription)}</description>`,
    '    <language>zh-CN</language>',
    `    <lastBuildDate>${now}</lastBuildDate>`,
    `    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml"/>`,
    items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n')
}
