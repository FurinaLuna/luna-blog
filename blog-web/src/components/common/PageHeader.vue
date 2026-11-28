<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import PrototypeWaves from '@/components/common/PrototypeWaves.vue'
import { useSiteStore } from '@/stores/site'

/**
 * 原型内页 banner：默认天空+云层背景（纯 CSS，离线可看）→ 暗色遮罩 → 居中标题 → 底部波浪。
 * 站点配置里给对应页面传了横幅图时，改用图片背景（clouds/天空层自动隐藏）。
 * 文章详情等页面用默认插槽自定义内容（标题 / meta / 按钮）。
 */
const props = withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
    /** 覆盖自动推导的横幅配置键（默认按首段路由推导） */
    bannerKey?: string
    /** 更高的 banner 且标题上移，给压在卡片上的圆形头像留位置（关于页） */
    tall?: boolean
  }>(),
  { title: '', subtitle: '', bannerKey: '', tall: false },
)

const route = useRoute()
const site = useSiteStore()

/** 路由首段 → 横幅配置键；相册详情（/albums/:id）单独用 album */
const BANNER_KEYS = new Set([
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
])

function deriveBannerKey(path: string): string {
  const segments = path.split('/').filter(Boolean)
  const first = segments[0] ?? 'home'
  if (first === 'albums' && segments.length > 1) return 'album'
  return BANNER_KEYS.has(first) ? first : ''
}

/** 总览页可回退到同名的详情页横幅（分类总览 → 分类详情、标签总览 → 标签详情） */
const BANNER_FALLBACK: Record<string, string> = {
  categories: 'category',
  tags: 'tag',
}

const bannerKey = computed(() => props.bannerKey || deriveBannerKey(route.path))

const bannerUrl = computed(() => {
  const banners = site.config?.pageBanners
  if (!banners || !bannerKey.value) return ''
  const own = (banners[bannerKey.value] ?? '').trim()
  if (own) return own
  const fallbackKey = BANNER_FALLBACK[bannerKey.value]
  return fallbackKey ? (banners[fallbackKey] ?? '').trim() : ''
})

/** 横幅取景位置（0 = 贴顶，100 = 贴底），后台可逐页调整，缺省 30 偏上 */
const BANNER_DEFAULT_FOCUS = 30

const bannerFocus = computed(() => {
  const positions = site.config?.pageBannerPositions
  if (!positions || !bannerKey.value) return BANNER_DEFAULT_FOCUS
  const own = positions[bannerKey.value]
  if (typeof own === 'number') return own
  const fallbackKey = BANNER_FALLBACK[bannerKey.value]
  const inherited = fallbackKey ? positions[fallbackKey] : undefined
  return typeof inherited === 'number' ? inherited : BANNER_DEFAULT_FOCUS
})

/** 横幅遮罩深度：后台可调（0 = 原图，80 = 很暗），默认 28 */
const BANNER_DEFAULT_SHADE = 28

const bannerShade = computed(() => {
  const value = site.config?.bannerShade
  if (typeof value !== 'number' || Number.isNaN(value)) return BANNER_DEFAULT_SHADE
  return Math.min(80, Math.max(0, value))
})

const bannerStyle = computed(() => {
  if (!bannerUrl.value) return undefined
  return {
    backgroundImage: `url("${bannerUrl.value}")`,
    backgroundPosition: `center ${bannerFocus.value}%`,
    // CSS 变量传成 0-1 的透明度，供 .page-header--custom::before 使用
    '--banner-shade': (bannerShade.value / 100).toFixed(3),
  }
})
</script>

<template>
  <header
    class="page-header"
    :class="{ 'page-header--custom': !!bannerUrl, 'page-header--tall': tall }"
    :style="bannerStyle"
  >
    <div v-if="!bannerUrl" class="page-header__sky" aria-hidden="true"></div>
    <div v-if="!bannerUrl" class="page-header__clouds" aria-hidden="true"></div>

    <div v-if="$slots.default" class="page-header__body">
      <slot />
    </div>
    <div v-else class="route-font">
      <div>{{ title }}</div>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>

    <PrototypeWaves variant="header" />
  </header>
</template>

<style scoped>
/* 关于页：banner 再高一档、标题上移，给压在卡片上的圆形头像留位置 */
.page-header--tall {
  height: 41rem;
}

.page-header--tall .route-font {
  margin-bottom: 4.5rem;
}

.page-header__subtitle {
  margin-top: 0.2rem;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0.04em;
}
</style>
