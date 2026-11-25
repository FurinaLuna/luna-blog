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
  const commentNeedReview = computed(() => config.value?.commentNeedReview ?? true)

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
    resolvedSocialLinks,
    commentNeedReview,
    ensureLoaded,
    refresh,
    setVisitStats,
  }
})
