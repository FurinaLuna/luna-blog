/**
 * 与 docs/API.md 对齐的接口类型定义。
 * 所有 id 为整数，时间为 ISO 8601 字符串。
 */

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface ApiErrorBody {
  code?: number
  message?: string
  reason?: string
  details?: Array<{ field: string; message: string }>
}

export interface PageQuery {
  page?: number
  pageSize?: number
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/* ------------------------------- 用户 ------------------------------- */

export interface AdminUser {
  id: number
  username: string
  nickname: string
  avatar: string | null
  email: string | null
  needPasswordChange: boolean
  lastLoginAt: string | null
  createdAt: string
}

export interface LoginPayload {
  username: string
  password: string
}

export interface LoginResult {
  token: string
  user: AdminUser
}

export interface PasswordPayload {
  oldPassword: string
  newPassword: string
}

/* ------------------------------- 文章 ------------------------------- */

export type ArticleStatus = 'draft' | 'published'

export interface ArticleCategoryRef {
  id: number
  name: string
}

export interface ArticleTagRef {
  id: number
  name: string
  color?: string | null
}

export interface ArticleSummary {
  id: number
  title: string
  summary: string
  cover: string | null
  categoryId: number | null
  category: ArticleCategoryRef | null
  tags: ArticleTagRef[]
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

export interface Article extends ArticleSummary {
  content: string
}

export interface ArticleQuery extends PageQuery {
  status?: ArticleStatus
  categoryId?: number
  keyword?: string
}

export interface ArticlePayload {
  title: string
  summary: string
  content: string
  cover: string
  categoryId: number | null
  tagIds: number[]
  status: ArticleStatus
  isRecommend: boolean
  isTop: boolean
  readingTime?: number
}

export interface ArticleFlags {
  isRecommend?: boolean
  isTop?: boolean
  status?: ArticleStatus
}

/* ----------------------------- 分类 / 标签 ---------------------------- */

export interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  sort: number
  articleCount: number
}

export interface CategoryPayload {
  name: string
  slug?: string
  description?: string
  sort?: number
}

export interface Tag {
  id: number
  name: string
  slug: string
  color: string | null
  articleCount: number
}

export interface TagPayload {
  name: string
  slug?: string
  color?: string
}

/* -------------------------------- 评论 ------------------------------- */

export type CommentTargetType = 'article' | 'talk'
export type ReviewStatus = 'pending' | 'approved' | 'rejected'

export interface CommentReplyTo {
  nickname: string
}

export interface Comment {
  id: number
  targetType: CommentTargetType
  articleId: number | null
  talkId: number | null
  parentId: number | null
  nickname: string
  email: string
  website: string | null
  content: string
  isAdmin: boolean
  status: ReviewStatus
  ip: string | null
  likeCount: number
  replyTo: CommentReplyTo | null
  createdAt: string
  replies?: Comment[]
}

export interface CommentQuery extends PageQuery {
  status?: ReviewStatus
  targetType?: CommentTargetType
  keyword?: string
}

/* -------------------------------- 说说 ------------------------------- */

export interface Talk {
  id: number
  content: string
  images: string[]
  likeCount: number
  commentCount: number
  createdAt: string
}

export interface TalkPayload {
  content: string
  images: string[]
}

/* ----------------------------- 相册 / 照片 ---------------------------- */

export interface Album {
  id: number
  name: string
  description: string | null
  cover: string | null
  photoCount: number
  createdAt: string
}

export interface Photo {
  id: number
  albumId: number
  url: string
  title: string | null
  description: string | null
  width: number | null
  height: number | null
  sort: number
}

export interface AlbumDetail extends Album {
  photos: Photo[]
}

export interface AlbumPayload {
  name: string
  description?: string
  cover?: string
  sort?: number
}

export interface PhotoPayload {
  url: string
  title?: string
  description?: string
  width?: number
  height?: number
  sort?: number
}

/* ------------------------------- 留言 ------------------------------- */

export interface MessageItem {
  id: number
  nickname: string
  content: string
  color: string | null
  status: ReviewStatus
  likeCount: number
  createdAt: string
  ip: string | null
}

export interface MessageQuery extends PageQuery {
  status?: ReviewStatus
}

/* ------------------------------- 资源 ------------------------------- */

export interface Resource {
  id: number
  name: string
  url: string
  description: string | null
  icon: string | null
  category: string | null
  sort: number
}

export interface ResourcePayload {
  name: string
  url: string
  description?: string
  icon?: string
  category?: string
  sort?: number
}

/* ------------------------------- 友链 ------------------------------- */

export interface FriendLink {
  id: number
  name: string
  url: string
  avatar: string | null
  description: string | null
  status: ReviewStatus
  sort: number
  createdAt: string
}

export interface FriendLinkPayload {
  name: string
  url: string
  avatar?: string
  description?: string
  sort?: number
  status?: ReviewStatus
}

/* ----------------------------- 站点配置 ------------------------------ */

export interface SocialLink {
  name: string
  url: string
  icon: string
  /** 微信 / QQ 等平台的二维码图（前台悬浮展示），留空则照常跳链接 */
  qrcode: string
}

/** 前台页面横幅的固定键（与后端 pageBanners 对象的键一致） */
export type PageBannerKey =
  | 'home'
  | 'archives'
  | 'categories'
  | 'category'
  | 'tags'
  | 'tag'
  | 'article'
  | 'talks'
  | 'albums'
  | 'album'
  | 'resources'
  | 'friends'
  | 'message'
  | 'about'
  | 'search'

/** 每个页面对应的横幅图 URL，空字符串表示使用内置默认横幅 */
export type PageBanners = Record<PageBannerKey, string>

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
  commentNeedReview: boolean
  messageNeedReview: boolean
  /** 首页侧栏资料卡横幅（空字符串 = 回退 pageBanners.home） */
  profileBanner: string
  pageBanners: PageBanners
  /** 每个页面横幅的取景位置（0 = 贴顶，100 = 贴底） */
  pageBannerPositions: Record<string, number>
  /** 每个页面内容卡片的上移量（px，0 = 默认位置） */
  pageCardOffsets: Record<string, number>
  danmakuSpeed: number
  meteorCount: number
  /** 站点图标（favicon），空 = 用内置 favicon.svg */
  favicon: string
  /** 后台登录页背景图，空 = 用内置蓝色波浪底图 */
  adminLoginBg: string
}

/* ------------------------------- 通知 ------------------------------- */

export type NotificationType = 'comment' | 'message' | 'friendlink' | 'system'

export interface NotificationItem {
  id: number
  type: NotificationType
  title: string
  content: string
  isRead: boolean
  targetType: string | null
  targetId: number | null
  createdAt: string
}

export interface NotificationQuery extends PageQuery {
  unreadOnly?: boolean
}

export interface UnreadCount {
  count: number
}

/* ------------------------------ 仪表盘 ------------------------------- */

export interface DashboardCounts {
  article: number
  published: number
  draft: number
  comment: number
  pendingComment: number
  talk: number
  album: number
  photo: number
  message: number
  pendingMessage: number
  friendLink: number
  pendingFriendLink: number
  views: number
}

export interface TrendPoint {
  date: string
  articles: number
  comments: number
}

export interface DashboardData {
  counts: DashboardCounts
  recentComments: Comment[]
  recentArticles: ArticleSummary[]
  trend: TrendPoint[]
}

/* ------------------------------- 上传 ------------------------------- */

export interface UploadResult {
  url: string
  name: string
  size: number
  mime: string
}
