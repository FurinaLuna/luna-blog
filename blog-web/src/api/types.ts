/**
 * 与 docs/API.md 严格对齐的接口类型。
 * 字段命名、可空性均以服务端契约为准，前端不得臆造字段。
 */

/** 后端统一响应包装 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 分页数据结构 */
export interface Paginated<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface PageParams {
  page?: number
  pageSize?: number
}

/* -------------------------------------------------------------------------- */
/*                                   分类 / 标签                               */
/* -------------------------------------------------------------------------- */

export interface Category {
  id: number
  name: string
  slug: string | null
  description: string | null
  sort: number
  articleCount: number
}

export interface Tag {
  id: number
  name: string
  slug: string | null
  color: string | null
  articleCount: number
}

/** 文章内嵌的精简分类 */
export interface CategoryBrief {
  id: number
  name: string
}

/** 文章内嵌的精简标签 */
export interface TagBrief {
  id: number
  name: string
}

/* -------------------------------------------------------------------------- */
/*                                     文章                                   */
/* -------------------------------------------------------------------------- */

export type ArticleStatus = 'draft' | 'published'
export type ArticleSort = 'latest' | 'popular'

export interface Article {
  id: number
  title: string
  summary: string
  content: string
  cover: string | null
  categoryId: number | null
  category: CategoryBrief | null
  tags: TagBrief[]
  status: ArticleStatus
  isRecommend: boolean
  isTop: boolean
  views: number
  likeCount: number
  commentCount: number
  readingTime: number
  publishedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ArticleNav {
  id: number
  title: string
}

export interface RelatedArticle {
  id: number
  title: string
  cover: string | null
}

export interface ArticleDetail extends Article {
  prev: ArticleNav | null
  next: ArticleNav | null
  related: RelatedArticle[]
}

export interface ArticleQuery extends PageParams {
  categoryId?: number
  tagId?: number
  keyword?: string
  sort?: ArticleSort
}

export interface ArchiveArticle {
  id: number
  title: string
  cover?: string | null
  createdAt: string
}

export interface ArchiveMonth {
  month: number
  count: number
  articles: ArchiveArticle[]
}

export interface ArchiveYear {
  year: number
  count: number
  months: ArchiveMonth[]
}

/* -------------------------------------------------------------------------- */
/*                                     评论                                   */
/* -------------------------------------------------------------------------- */

export type TargetType = 'article' | 'talk'
export type CommentStatus = 'pending' | 'approved' | 'rejected'

export interface CommentReplyTo {
  nickname: string
}

export interface Comment {
  id: number
  targetType: TargetType
  articleId: number | null
  talkId: number | null
  parentId: number | null
  nickname: string
  email: string
  website: string | null
  content: string
  isAdmin: boolean
  status: CommentStatus
  ip?: string | null
  likeCount: number
  replyTo: CommentReplyTo | null
  createdAt: string
  replies: Comment[]
}

export interface CommentQuery extends PageParams {
  targetType: TargetType
  targetId: number
}

export interface CommentPayload {
  targetType: TargetType
  articleId?: number
  talkId?: number
  parentId?: number
  nickname: string
  email: string
  website?: string
  content: string
}

export interface CommentCreated {
  id: number
  status: CommentStatus
}

/* -------------------------------------------------------------------------- */
/*                                  说说 / 相册                               */
/* -------------------------------------------------------------------------- */

export interface Talk {
  id: number
  content: string
  images: string[]
  likeCount: number
  commentCount: number
  createdAt: string
}

export interface Album {
  id: number
  name: string
  description: string
  cover: string | null
  photoCount: number
  createdAt: string
}

export interface Photo {
  id: number
  albumId: number
  url: string
  title: string
  description: string
  width: number
  height: number
  sort: number
}

export interface AlbumDetail extends Album {
  photos: Photo[]
}

/* -------------------------------------------------------------------------- */
/*                                     留言                                   */
/* -------------------------------------------------------------------------- */

export interface Message {
  id: number
  nickname: string
  content: string
  color: string | null
  status: string
  likeCount: number
  createdAt: string
  ip?: string | null
}

export interface MessagePayload {
  nickname: string
  content: string
  color?: string
}

/* -------------------------------------------------------------------------- */
/*                                资源 / 友链                                 */
/* -------------------------------------------------------------------------- */

export interface Resource {
  id: number
  name: string
  url: string
  description: string
  icon: string
  category: string
  sort: number
}

export type FriendLinkStatus = 'pending' | 'approved' | 'rejected'

export interface FriendLink {
  id: number
  name: string
  url: string
  avatar: string | null
  description: string | null
  status: FriendLinkStatus
  sort: number
  createdAt: string
}

export interface FriendLinkPayload {
  name: string
  url: string
  avatar?: string
  description?: string
}

/* -------------------------------------------------------------------------- */
/*                                站点配置 / 统计                              */
/* -------------------------------------------------------------------------- */

export interface NavLinkItem {
  label: string
  url: string
}

export interface SocialLink {
  name: string
  url: string
  icon: string
  /** 微信 / QQ 等平台的二维码图，有值时前台悬浮展示二维码而不是跳转 */
  qrcode?: string
}

export interface SiteConfig {
  siteName: string
  siteDescription: string
  siteKeywords: string
  author: string
  avatar: string
  email: string
  github: string
  announcement: string
  heroTitle: string
  heroSubtitle: string
  about: string
  footerText: string
  icp: string
  startDate: string
  socialLinks: SocialLink[]
  navLinks: NavLinkItem[]
  commentNeedReview: boolean
  /** 留言是否需要在审核通过后展示（后台可关） */
  messageNeedReview: boolean
  /** 每个页面的横幅图（空字符串 = 用内置天空渐变） */
  pageBanners?: Record<string, string>
  /** 每个页面横幅的取景位置（0 = 贴顶，100 = 贴底），缺省 30 */
  pageBannerPositions?: Record<string, number>
  /** 每个页面内容卡片的上移量（px，0 = 默认位置） */
  pageCardOffsets?: Record<string, number>
  danmakuSpeed?: number
  meteorCount?: number
  /** 友链页介绍文案（留空时用站点信息兜底） */
  friendsTitle?: string
  friendsLink?: string
  friendsContactLabel?: string
  friendsContact?: string
  friendsTip?: string
  /** 进站欢迎通知：标题 / 称呼 / 8 个时段的问候文案（{name} 占位） */
  welcomeTitle?: string
  welcomeName?: string
  welcomeGreetings?: string[]
  /** 首页侧栏资料卡横幅（空字符串 = 回退 pageBanners.home） */
  profileBanner?: string
  /** 站点图标（浏览器标签页 favicon），空 = 用 public/favicon.svg */
  favicon?: string
  /** 音乐悬浮球：总开关 / 默认音量 / 网易云歌单 id */
  musicEnabled?: boolean
  musicVolume?: number
  musicServer?: 'netease' | 'tencent'
  neteasePlaylistId?: string
  qqPlaylistId?: string
  musicApiBase?: string
  /** 文章默认封面（文章自身没有封面时使用），空 = 用渐变占位 */
  defaultCover?: string
  /** 页面横幅遮罩深度 0-80（越大越暗），默认 28 */
  bannerShade?: number
  /** PV/UV 展示偏移（后台校正历史累计值，不影响真实访问记录） */
  statsPvOffset?: number
  statsUvOffset?: number
}

export interface SiteStats {
  article: number
  category: number
  tag: number
  comment: number
  talk: number
  photo: number
  message: number
  views: number
  words: number
  /** 站点访问量：pv=总访问量（页面浏览数），uv=总访客数（去重 IP 数） */
  visit: { pv: number; uv: number }
}

/* -------------------------------------------------------------------------- */
/*                                     通用                                   */
/* -------------------------------------------------------------------------- */

export interface LikeResult {
  liked: boolean
  likeCount: number
}

export interface SimpleResult {
  success: boolean
}
