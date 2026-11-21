import { z } from 'zod'
import { Article, Category, Comment, Message, Photo, SiteConfig, Tag, Talk } from '../../db/models/index.js'

/** 站点配置缺省值（前端首屏在配置未保存时也能正常渲染） */
export const SITE_CONFIG_DEFAULTS = Object.freeze({
  siteName: 'Luna Blog',
  siteDescription: '记录代码、阅读与生活',
  siteKeywords: '博客,前端,技术,随笔',
  author: 'Luna',
  avatar: '',
  email: '',
  github: '',
  announcement: '',
  heroTitle: '在这里，记录思考的痕迹',
  heroSubtitle: '代码、阅读与生活，缓慢而坚定地生长。',
  about: '',
  footerText: '',
  icp: '',
  startDate: '2024-01-01',
  socialLinks: [],
  commentNeedReview: true,
})

const socialLinkSchema = z.object({
  name: z.string().trim().max(30),
  url: z.string().trim().max(300),
  icon: z.string().trim().max(300).default(''),
})

export const siteConfigSchema = z.object({
  siteName: z.string().trim().min(1, '站点名称不能为空').max(60).optional(),
  siteDescription: z.string().trim().max(200).optional(),
  siteKeywords: z.string().trim().max(200).optional(),
  author: z.string().trim().max(50).optional(),
  avatar: z.string().trim().max(500).optional(),
  email: z.string().trim().max(100).optional(),
  github: z.string().trim().max(300).optional(),
  announcement: z.string().trim().max(300).optional(),
  heroTitle: z.string().trim().max(120).optional(),
  heroSubtitle: z.string().trim().max(200).optional(),
  about: z.string().max(20000).optional(),
  footerText: z.string().trim().max(200).optional(),
  icp: z.string().trim().max(100).optional(),
  startDate: z.string().trim().max(20).optional(),
  socialLinks: z.array(socialLinkSchema).max(10).optional(),
  commentNeedReview: z.boolean().optional(),
})

/** 解析单行配置值（JSON 优先，失败回退字符串） */
function parseValue(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

/** 读取整站配置（缺省值 + 已保存值） */
export async function getSiteConfig() {
  const rows = await SiteConfig.findAll()
  const stored = {}
  for (const row of rows) stored[row.key] = parseValue(row.value)
  return { ...SITE_CONFIG_DEFAULTS, ...stored }
}

/**
 * 合并保存站点配置（只接受白名单 key）。
 * @param {Record<string, unknown>} patch
 */
export async function updateSiteConfig(patch) {
  const entries = Object.entries(patch)
  await Promise.all(
    entries.map(([key, value]) =>
      SiteConfig.upsert({ key, value: JSON.stringify(value) }),
    ),
  )
  return getSiteConfig()
}

/** 站点统计数字（关于页 / 首页侧栏） */
export async function getSiteStats() {
  const [article, category, tag, comment, talk, photo, message] = await Promise.all([
    Article.count({ where: { status: 'published' } }),
    Category.count(),
    Tag.count(),
    Comment.count({ where: { status: 'approved' } }),
    Talk.count(),
    Photo.count(),
    Message.count({ where: { status: 'approved' } }),
  ])

  const viewsRow = await Article.sum('views', { where: { status: 'published' } })
  const words = await Article.sum('readingTime', { where: { status: 'published' } })

  return {
    article,
    category,
    tag,
    comment,
    talk,
    photo,
    message,
    views: Number(viewsRow ?? 0),
    words: Number(words ?? 0) * 400,
  }
}
