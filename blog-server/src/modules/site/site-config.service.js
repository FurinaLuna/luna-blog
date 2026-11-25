import { z } from 'zod'
import { Article, Category, Comment, Message, Photo, SiteConfig, Tag, Talk } from '../../db/models/index.js'
import { getVisitStats } from '../visit/visit.service.js'

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
  messageNeedReview: true,
  // 首页侧栏资料卡的横幅图（空字符串 = 回退到 pageBanners.home，再回退内置渐变）
  profileBanner: '',
  // 站点图标（favicon）与后台登录页背景图（空 = 用内置图）
  favicon: '',
  adminLoginBg: '',
  // 每个页面的横幅图（空字符串 = 使用内置天空渐变默认横幅）
  pageBanners: {
    home: '',
    archives: '',
    categories: '',
    category: '',
    tags: '',
    tag: '',
    article: '',
    talks: '',
    albums: '',
    album: '',
    resources: '',
    friends: '',
    message: '',
    about: '',
    search: '',
  },
  // 每个页面横幅的取景位置（0 = 贴顶，100 = 贴底，默认 30 偏上）
  pageBannerPositions: {},
  // 每个页面内容卡片的上移量（px，0 = 保持默认位置）
  pageCardOffsets: {},
  /** 留言板弹幕速度（vue3-danmaku 的 speeds，越大越快） */
  danmakuSpeed: 180,
  /** 留言板弹幕背景的流星数量 */
  meteorCount: 34,
  /** 友链页介绍文案（后台「友链页」页签可改；留空时前台用站点信息兜底） */
  friendsTitle: '',
  friendsLink: '',
  friendsContactLabel: 'QQ',
  friendsContact: '',
  friendsTip: '申请前请先添加本站友链，审核通过后会尽快上线。',
})

const socialLinkSchema = z.object({
  name: z.string().trim().max(30),
  url: z.string().trim().max(300),
  icon: z.string().trim().max(300).default(''),
  /** 微信 / QQ 这类平台可以只放二维码图（悬浮展示），留空则照常跳链接 */
  qrcode: z.string().trim().max(500).default(''),
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
  socialLinks: z.array(socialLinkSchema).max(16).optional(),
  commentNeedReview: z.boolean().optional(),
  messageNeedReview: z.boolean().optional(),
  profileBanner: z.string().trim().max(500).optional(),
  favicon: z.string().trim().max(500).optional(),
  adminLoginBg: z.string().trim().max(500).optional(),
  pageBanners: z.record(z.string(), z.string().trim().max(500)).optional(),
  pageBannerPositions: z.record(z.string(), z.number().int().min(0).max(100)).optional(),
  pageCardOffsets: z.record(z.string(), z.number().int().min(0).max(400)).optional(),
  danmakuSpeed: z.number().int().min(60).max(600).optional(),
  meteorCount: z.number().int().min(0).max(80).optional(),
  friendsTitle: z.string().trim().max(120).optional(),
  friendsLink: z.string().trim().max(300).optional(),
  friendsContactLabel: z.string().trim().max(20).optional(),
  friendsContact: z.string().trim().max(100).optional(),
  friendsTip: z.string().trim().max(200).optional(),
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
  return {
    ...SITE_CONFIG_DEFAULTS,
    ...stored,
    // 横幅是对象，单独做一次浅合并，避免缺 key 时整块被覆盖掉
    pageBanners: {
      ...SITE_CONFIG_DEFAULTS.pageBanners,
      ...(stored.pageBanners && typeof stored.pageBanners === 'object' ? stored.pageBanners : {}),
    },
    pageBannerPositions:
      stored.pageBannerPositions && typeof stored.pageBannerPositions === 'object'
        ? stored.pageBannerPositions
        : {},
    pageCardOffsets:
      stored.pageCardOffsets && typeof stored.pageCardOffsets === 'object' ? stored.pageCardOffsets : {},
  }
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
  const visit = await getVisitStats()

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
    visit,
  }
}
