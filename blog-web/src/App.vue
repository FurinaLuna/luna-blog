<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppFooter from '@/components/layout/AppFooter.vue'
import BackToTop from '@/components/common/BackToTop.vue'
import MusicPlayer from '@/components/music/MusicPlayer.vue'
import { useSiteStore } from '@/stores/site'

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

watch(
  () => [route.fullPath, site.config] as const,
  () => {
    syncDocumentMeta()
    syncFavicon()
  },
  { immediate: true },
)

onMounted(() => {
  void site.ensureLoaded()
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

    <!-- 常驻组件：音乐在无 /wapi 数据时自身不渲染；返回顶部随滚动出现 -->
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
