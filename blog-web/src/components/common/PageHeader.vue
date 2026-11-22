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
  'category',
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

const bannerKey = computed(() => props.bannerKey || deriveBannerKey(route.path))

const bannerUrl = computed(() => {
  const banners = site.config?.pageBanners
  if (!banners || !bannerKey.value) return ''
  return (banners[bannerKey.value] ?? '').trim()
})

const bannerStyle = computed(() =>
  bannerUrl.value ? { backgroundImage: `url("${bannerUrl.value}")` } : undefined,
)
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
/* 关于页：banner 再高一档、标题整体上移，避免被压在卡片上的头像盖住 */
.page-header--tall {
  height: 34rem;
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
