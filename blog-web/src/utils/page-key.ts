/** 页面配置键推导（横幅 / 卡片位置等按页配置共用） */
export const PAGE_KEYS = [
  'home',
  'archives',
  'categories',
  'category',
  'tags',
  'tag',
  'article',
  'talks',
  'albums',
  'album',
  'resources',
  'friends',
  'message',
  'about',
  'search',
] as const

export type PageKey = (typeof PAGE_KEYS)[number]

const PAGE_KEY_SET = new Set<string>(PAGE_KEYS)

/** 总览页可回退到同名详情页的配置（分类总览 → 分类详情、标签总览 → 标签详情） */
export const PAGE_KEY_FALLBACK: Record<string, PageKey> = {
  categories: 'category',
  tags: 'tag',
}

/** 路由路径 → 页面配置键；相册详情（/albums/:id）单独用 album |
 *  无法识别时返回空串（调用方自行决定缺省） */
export function derivePageKey(path: string): PageKey | '' {
  const segments = path.split('/').filter(Boolean)
  const first = segments[0] ?? 'home'
  if (first === 'albums' && segments.length > 1) return 'album'
  return PAGE_KEY_SET.has(first) ? (first as PageKey) : ''
}
