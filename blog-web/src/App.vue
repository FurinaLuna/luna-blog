<script setup lang="ts">
import { h, onMounted, watch } from 'vue'
import { ElNotification } from 'element-plus'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import BackToTop from '@/components/common/BackToTop.vue'
import AnnouncementBall from '@/components/layout/AnnouncementBall.vue'
import MusicPlayer from '@/components/music/MusicPlayer.vue'
import { useSiteStore } from '@/stores/site'
import { derivePageKey, PAGE_KEY_FALLBACK } from '@/utils/page-key'

const site = useSiteStore()
const route = useRoute()

function syncDocumentMeta(): void {
  const meta = route.meta as { title?: string }
  const siteName = site.siteName
  document.title = meta.title ? `${meta.title} · ${siteName}` : `${siteName} · ${site.siteDescription}`

  const description = document.querySelector<HTMLMetaElement>('meta[name="description"]')
  if (description) description.content = site.siteDescription

  // 站点关键词：后台「基础信息 → 站点关键词」配置的 SEO keywords
  let keywords = document.querySelector<HTMLMetaElement>('meta[name="keywords"]')
  if (!keywords) {
    keywords = document.createElement('meta')
    keywords.name = 'keywords'
    document.head.appendChild(keywords)
  }
  keywords.content = site.siteKeywords
}

/** 每个页面的内容卡片上移量：后台按页配置，前台把负 margin 写成 CSS 变量交给 .center_box */
function syncCardOffset(): void {
  const offsets = site.config?.pageCardOffsets
  const key = derivePageKey(route.path)
  let value = 0
  if (offsets && key) {
    const own = offsets[key]
    const fallbackKey = PAGE_KEY_FALLBACK[key]
    const inherited = fallbackKey ? offsets[fallbackKey] : undefined
    value = typeof own === 'number' ? own : typeof inherited === 'number' ? inherited : 0
  }
  const style = document.documentElement.style
  if (value > 0) style.setProperty('--page-card-offset', `-${value}px`)
  else style.removeProperty('--page-card-offset')
}

function syncFavicon(): void {
  const href = (site.config?.favicon ?? '').trim() || '/favicon.svg'
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  if (link.getAttribute('href') !== href) link.href = href
}

/** 每个标签页只弹一次：window.name 在刷新后仍保留，新开标签页才重新问候 */
const WELCOME_FLAG = 'luna-welcomed'

/** 按当前时间段生成问候语，模仿原站欢迎通知 */
function greetingOf(name: string): string {
  if (!name) return `欢迎来到 ${site.siteName}`
  const hour = new Date().getHours()
  if (hour < 5) return `夜深了：${name}，请注意休息！`
  if (hour < 9) return `早上好：${name}，今天又是活力满满的一天！`
  if (hour < 12) return `上午好：${name}，请合理安排时间摸鱼！`
  if (hour < 14) return `中午好：${name}，现在正适合睡一觉`
  if (hour < 18) return `下午好：${name}`
  if (hour < 20) return `傍晚好：${name}，记得按时吃饭`
  if (hour < 22) return `晚上好：${name}`
  return `晚上好：${name}，记得按时碎觉哦`
}

function showWelcomeNotice(): void {
  if (window.name === WELCOME_FLAG) return
  window.name = WELCOME_FLAG
  window.setTimeout(() => {
    ElNotification({
      title: '欢迎～',
      message: h('div', { style: 'font-weight: 600' }, greetingOf(site.author)),
      offset: 60,
      duration: 4500,
    })
  }, 600)
}

watch(
  () => [route.fullPath, site.config] as const,
  () => {
    syncDocumentMeta()
    syncFavicon()
    syncCardOffset()
  },
  { immediate: true },
)

onMounted(() => {
  void site.ensureLoaded().then(showWelcomeNotice)
})
</script>

<template>
  <div class="app-shell">
    <a href="#main-content" class="skip-link">跳到主要内容</a>

    <AppHeader />

    <main id="main-content" class="app-main">
      <RouterView v-slot="{ Component }">
        <component :is="Component" />
      </RouterView>
    </main>

    <AppFooter />

    <!-- 常驻组件：公告悬浮球固定在左侧；音乐在无 /wapi 数据时自身不渲染；返回顶部随滚动出现 -->
    <AnnouncementBall />
    <MusicPlayer />
    <BackToTop />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  background: var(--bg);
}

.app-main {
  flex: 1;
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 1rem;
  z-index: 3000;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  background: var(--primary);
  color: #fff;
  font-size: 0.9rem;
  transition: top 0.2s ease;
}

.skip-link:focus {
  top: 0.6rem;
}
</style>
