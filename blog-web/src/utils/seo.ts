import { useSiteStore } from '@/stores/site'

/**
 * 前台页面级 SEO 元信息（低成本版：只在运行时维护 <head>，不做 SSR/预渲染）。
 * 站点默认值（站点名 / 描述 / 头像）统一从 site store 读取，页面只需给出自己的部分。
 */
export interface PageMeta {
  /** 页面标题（不含站点名）；空串表示只用站点名（首页） */
  title?: string
  /** 页面描述；缺省用站点描述 */
  description?: string
  /** 分享图（文章封面 / 相册封面）；缺省用站点头像 */
  image?: string
  /** 规范链接与 og:url；缺省用当前地址（去掉查询串与 hash） */
  url?: string
  /** og:type：文章详情传 article，其余页面缺省 website */
  type?: string
}

/**
 * 最近一次写入的页面级元信息。
 * 站点配置是异步加载的，配置到位后需要用同一份页面数据重新套一次默认值
 * （站点名、站点描述、头像），否则标题会停留在兜底文案上。
 */
let activeMeta: PageMeta = {}

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

/**
 * 用「最近一次页面级元信息 + 站点配置」重新渲染 <head>。
 * 路由切换时由守卫调用；站点配置异步加载完成后由 App.vue 再调用一次。
 */
export function refreshPageMeta(): void {
  const site = useSiteStore()
  const title = activeMeta.title ? `${activeMeta.title} · ${site.siteName}` : site.siteName
  const description = activeMeta.description?.trim() || site.siteDescription
  const image = absoluteUrl(activeMeta.image || site.avatar)
  const url = absoluteUrl(activeMeta.url ?? '') || currentCanonical()

  document.title = title
  upsertMeta('description', description)
  upsertMeta('og:title', title, 'property')
  upsertMeta('og:description', description, 'property')
  upsertMeta('og:url', url, 'property')
  upsertMeta('og:type', activeMeta.type || 'website', 'property')
  if (image) upsertMeta('og:image', image, 'property')
  else removeMeta('og:image', 'property')
  upsertMeta('twitter:card', image ? 'summary_large_image' : 'summary')
  upsertCanonical(url)
}

/**
 * 写入页面级 SEO 元信息：document.title + description / OG / twitter:card / canonical。
 * 路由守卫先用 RouteMeta 写兜底值，页面拿到真实数据后再调一次覆盖（文章标题、分类名等）。
 */
export function setPageMeta(meta: PageMeta): void {
  activeMeta = { ...meta }
  refreshPageMeta()
}
