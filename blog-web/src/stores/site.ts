import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getSiteConfig, getSiteStats } from '@/api/site'
import { getCategories, getTags } from '@/api/taxonomy'
import type { Category, SiteConfig, SiteStats, SocialLink, Tag } from '@/api/types'

/**
 * 站点级数据：配置、统计、分类、标签。
 * 静默加载——后端未启动时页面应优雅降级，而不是弹一堆错误。
 */
export const useSiteStore = defineStore('site', () => {
  const config = ref<SiteConfig | null>(null)
  const stats = ref<SiteStats | null>(null)
  const categories = ref<Category[]>([])
  const tags = ref<Tag[]>([])

  let inflight: Promise<void> | null = null

  const siteName = computed(() => config.value?.siteName || 'Luna Blog')
  const siteDescription = computed(() => config.value?.siteDescription || '记录生活与代码的数字花园')
  const siteKeywords = computed(() => config.value?.siteKeywords || '博客,前端,技术,随笔')
  const author = computed(() => config.value?.author || 'Luna')
  const avatar = computed(() => config.value?.avatar || '')
  const announcement = computed(() => config.value?.announcement || '')
  const socialLinks = computed(() => config.value?.socialLinks ?? [])
  /** 导航栏「关于」右侧的自定义外链，后台可增删 */
  const navLinks = computed(() => (config.value?.navLinks ?? []).filter((link) => link.label && link.url))
  const commentNeedReview = computed(() => config.value?.commentNeedReview ?? true)
  /** 留言是否需要审核通过后展示（缺省开启） */
  const messageNeedReview = computed(() => config.value?.messageNeedReview ?? true)

  /** 进站欢迎通知：标题、称呼、8 个时段问候文案（缺省用原站文案） */
const DEFAULT_WELCOME_GREETINGS = [
  '夜深了：{name}，请注意休息！',
  '早上好：{name}，今天又是活力满满的一天！',
  '上午好：{name}，请合理安排时间摸鱼！',
  '中午好：{name}，现在正适合睡一觉',
  '下午好：{name}',
  '傍晚好：{name}，记得按时吃饭',
  '晚上好：{name}',
  '晚上好：{name}，记得按时碎觉哦',
]

const welcomeTitle = computed(() => config.value?.welcomeTitle || '欢迎～')
const welcomeName = computed(() => config.value?.welcomeName || '我的朋友')
const welcomeGreetings = computed(() => {
  const list = config.value?.welcomeGreetings
  if (!Array.isArray(list) || list.length !== 8) return DEFAULT_WELCOME_GREETINGS
  return list.map((item, i) => (item || '').trim() || DEFAULT_WELCOME_GREETINGS[i])
})

const friendsTitle = computed(() => config.value?.friendsTitle || `欢迎来到 ${siteName.value}`)
  const friendsLink = computed(() => config.value?.friendsLink || '')
  const friendsContactLabel = computed(() => config.value?.friendsContactLabel || 'QQ')
  const friendsContact = computed(() => config.value?.friendsContact || '')
  const friendsTip = computed(
    () => config.value?.friendsTip || '申请前请先添加本站友链，审核通过后会尽快上线。',
  )

  /** 音乐悬浮球：总开关 / 默认音量 / 网易云歌单 id */
  const musicEnabled = computed(() => config.value?.musicEnabled ?? true)
  const musicVolume = computed(() => {
    const value = config.value?.musicVolume
    return typeof value === 'number' && value >= 0 && value <= 1 ? value : 0.7
  })
  const musicServer = computed<'netease' | 'tencent'>(() => (config.value?.musicServer === 'tencent' ? 'tencent' : 'netease'))
const neteasePlaylistId = computed(() => config.value?.neteasePlaylistId || '')
const qqPlaylistId = computed(() => config.value?.qqPlaylistId || '')
const musicApiBase = computed(() => config.value?.musicApiBase || 'https://api.injahow.cn/meting/')

  /** 未配置 socialLinks 时用 github / email 兜底 */
  const resolvedSocialLinks = computed<SocialLink[]>(() => {
    if (socialLinks.value.length > 0) return socialLinks.value
    const fallback: SocialLink[] = []
    if (config.value?.github) {
      fallback.push({ name: 'GitHub', url: config.value.github, icon: 'github' })
    }
    if (config.value?.email) {
      fallback.push({ name: '邮箱', url: `mailto:${config.value.email}`, icon: 'email' })
    }
    return fallback
  })

  /** 访问上报接口顺带回的 pv/uv，避免为页脚再请求一次 */
  function setVisitStats(visit: { pv: number; uv: number }): void {
    if (!stats.value) return
    stats.value = { ...stats.value, visit }
  }

  async function loadAll(): Promise<void> {
    const results = await Promise.allSettled([
      getSiteConfig({ silent: true }),
      getSiteStats({ silent: true }),
      getCategories({ silent: true }),
      getTags({ silent: true }),
    ])

    const [configResult, statsResult, categoryResult, tagResult] = results
    if (configResult.status === 'fulfilled') config.value = configResult.value
    if (statsResult.status === 'fulfilled') stats.value = statsResult.value
    if (categoryResult.status === 'fulfilled') categories.value = categoryResult.value
    if (tagResult.status === 'fulfilled') tags.value = tagResult.value
  }

  /** 幂等加载：并发调用复用同一个请求；失败后下次可重试 */
  function ensureLoaded(): Promise<void> {
    if (config.value && stats.value) return Promise.resolve()
    if (!inflight) {
      inflight = loadAll().finally(() => {
        inflight = null
      })
    }
    return inflight
  }

  async function refresh(): Promise<void> {
    config.value = null
    stats.value = null
    await loadAll()
  }

  return {
    config,
    stats,
    categories,
    tags,
    siteName,
    siteDescription,
    siteKeywords,
    author,
    avatar,
    announcement,
    socialLinks,
    navLinks,
    resolvedSocialLinks,
    commentNeedReview,
    messageNeedReview,
    friendsTitle,
  welcomeTitle,
  welcomeName,
  welcomeGreetings,
    friendsLink,
    friendsContactLabel,
    friendsContact,
    friendsTip,
    musicEnabled,
    musicVolume,
    musicServer,
  neteasePlaylistId,
  qqPlaylistId,
    musicApiBase,
    ensureLoaded,
    refresh,
    setVisitStats,
  }
})
