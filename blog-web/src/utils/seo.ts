import { useSiteStore } from '@/stores/site'

/**
 * 前台页面级 SEO 元信息（低成本版：只在运行时维护 <head>，不做 SSR/预渲染）。
 * 站点默认值（站点名 / 描述 / 头像 / 作者）统一从 site store 读取，页面只需给出自己的部分。
 *
 * 覆盖范围参考 docs/ops 里的 SEO/GEO 约定：
 * - TDK：title / description / keywords，每页唯一，核心词前置
 * - 社交分享：Open Graph + twitter card（图片一律绝对地址）
 * - 结构化数据：JSON-LD（Article / WebSite / Person / BreadcrumbList 等）
 * - 规范链接：canonical 去掉查询串与 hash
 */
export interface PageMeta {
  /** 页面标题（不含站点名）；空串表示只用站点名（首页） */
  title?: string
  /** 页面描述；缺省用站点描述 */
  description?: string
  /** 页面级关键词，逗号分隔；缺省用站点关键词 */
  keywords?: string
  /** 分享图（文章封面 / 相册封面）；缺省用站点头像 */
  image?: string
  /** 规范链接与 og:url；缺省用当前地址（去掉查询串与 hash） */
  url?: string
  /** og:type：文章详情传 article，其余页面缺省 website */
  type?: string
  /** 作者（og:article:author / meta author）；缺省用站点作者 */
  author?: string
  /** 文章发布时间（ISO 字符串） */
  publishedAt?: string
  /** 文章更新时间（ISO 字符串） */
  updatedAt?: string
  /** 文章所属栏目（分类名） */
  section?: string
  /** 不希望被索引的页面（404 等） */
  noindex?: boolean
  /** 机器可读全文（Markdown）地址，会写成 link[rel=alternate][type=text/markdown]，方便 AI 爬虫取正文 */
  markdownUrl?: string
  /** JSON-LD 结构化数据：单个对象或对象数组（数组会包成 @graph） */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
}

/**
 * 最近一次写入的页面级元信息。
 * 站点配置是异步加载的，配置到位后需要用同一份页面数据重新套一次默认值
 * （站点名、站点描述、头像），否则标题会停留在兜底文案上。
 */
let activeMeta: PageMeta = {}

const JSON_LD_ID = 'page-jsonld'

/** 把相对路径（/uploads/x.png 等）补成绝对地址：canonical 与社交平台都要求绝对 URL */
function absoluteUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  try {
    return new URL(trimmed, window.location.origin).href
  } catch {
    return trimmed
  }
}

/** 当前页面的规范地址：不带查询串与 hash，避免统计参数等造成重复收录 */
function currentCanonical(): string {
  return `${window.location.origin}${window.location.pathname}`
}

/** 写入 / 更新单个 meta 标签（不存在就创建，存在就更新） */
function upsertMeta(key: string, content: string, attribute: 'name' | 'property' = 'name'): void {
  const selector = `meta[${attribute}="${key}"]`
  let element = document.head.querySelector<HTMLMetaElement>(selector)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  if (element.content !== content) element.content = content
}

function removeMeta(key: string, attribute: 'name' | 'property' = 'name'): void {
  document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)?.remove()
}

/** 写入 / 更新 link[rel=canonical] */
function upsertCanonical(href: string): void {
  let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'canonical'
    document.head.appendChild(link)
  }
  if (link.href !== href) link.href = href
}

/** 写入 / 移除 JSON-LD 脚本（每个页面只保留一份，路由切换即替换） */
function upsertJsonLd(payload: PageMeta['jsonLd']): void {
  const existing = document.getElementById(JSON_LD_ID)
  if (!payload || (Array.isArray(payload) && payload.length === 0)) {
    existing?.remove()
    return
  }
  const graph = Array.isArray(payload)
    ? { '@context': 'https://schema.org', '@graph': payload }
    : { '@context': 'https://schema.org', ...payload }
  const script = (existing as HTMLScriptElement | null) ?? document.createElement('script')
  script.id = JSON_LD_ID
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(graph)
  if (!existing) document.head.appendChild(script)
}

/** 写入 / 更新 link[rel=alternate][type=text/markdown]：告诉 AI 爬虫正文还有一份 Markdown 版本 */
function upsertMarkdownAlternate(href?: string): void {
  const selector = 'link[rel="alternate"][type="text/markdown"]'
  const existing = document.head.querySelector<HTMLLinkElement>(selector)
  if (!href) {
    existing?.remove()
    return
  }
  const target = absoluteUrl(href)
  let link = existing
  if (!link) {
    link = document.createElement('link')
    link.rel = 'alternate'
    link.type = 'text/markdown'
    document.head.appendChild(link)
  }
  if (link.href !== target) link.href = target
}

/**
 * 用「最近一次页面级元信息 + 站点配置」重新渲染 <head>。
 * 路由切换时由守卫调用；站点配置异步加载完成后由 App.vue 再调用一次。
 */
export function refreshPageMeta(): void {
  const site = useSiteStore()
  const rawTitle = activeMeta.title?.trim()
  const title = rawTitle
    ? rawTitle.includes(site.siteName)
      ? rawTitle
      : `${rawTitle} · ${site.siteName}`
    : site.siteName
  const description = activeMeta.description?.trim() || site.siteDescription
  const keywords = activeMeta.keywords?.trim() || site.siteKeywords
  const author = activeMeta.author?.trim() || site.author
  const image = absoluteUrl(activeMeta.image || site.avatar)
  const url = absoluteUrl(activeMeta.url ?? '') || currentCanonical()
  const type = activeMeta.type || 'website'

  document.title = title
  upsertMeta('description', description)
  upsertMeta('keywords', keywords)
  upsertMeta('author', author)
  upsertMeta('robots', activeMeta.noindex ? 'noindex,nofollow' : 'index,follow')

  upsertMeta('og:site_name', site.siteName, 'property')
  upsertMeta('og:locale', 'zh_CN', 'property')
  upsertMeta('og:title', title, 'property')
  upsertMeta('og:description', description, 'property')
  upsertMeta('og:url', url, 'property')
  upsertMeta('og:type', type, 'property')
  if (image) upsertMeta('og:image', image, 'property')
  else removeMeta('og:image', 'property')

  upsertMeta('twitter:card', image ? 'summary_large_image' : 'summary')
  upsertMeta('twitter:title', title)
  upsertMeta('twitter:description', description)
  if (image) upsertMeta('twitter:image', image)
  else removeMeta('twitter:image')

  // 文章专属的 Open Graph 字段（列表页等非文章页面不写）
  const published = activeMeta.publishedAt
  const updated = activeMeta.updatedAt
  if (published) upsertMeta('article:published_time', published, 'property')
  else removeMeta('article:published_time', 'property')
  if (updated) upsertMeta('article:modified_time', updated, 'property')
  else removeMeta('article:modified_time', 'property')
  const section = activeMeta.section?.trim()
  if (section) upsertMeta('article:section', section, 'property')
  else removeMeta('article:section', 'property')
  if (type === 'article') upsertMeta('article:author', author, 'property')
  else removeMeta('article:author', 'property')

  upsertCanonical(url)
  upsertMarkdownAlternate(activeMeta.markdownUrl)
  upsertJsonLd(activeMeta.jsonLd)
}

/**
 * 写入页面级 SEO 元信息：document.title + TDK / OG / twitter / JSON-LD / canonical。
 * 路由守卫先用 RouteMeta 写兜底值，页面拿到真实数据后再调一次覆盖（文章标题、分类名等）。
 */
export function setPageMeta(meta: PageMeta): void {
  activeMeta = { ...meta }
  refreshPageMeta()
}
