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
}

watch(
  () => [route.fullPath, site.config] as const,
  () => syncDocumentMeta(),
  { immediate: true },
)

onMounted(() => {
  void site.ensureLoaded()
})
</script>

<template>
  <div class="flex min-h-screen flex-col">
    <a
      href="#main-content"
      class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-[var(--card)] focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:shadow-lg"
    >
      跳到主要内容
    </a>

    <AppHeader />

    <main id="main-content" class="flex-1">
      <RouterView v-slot="{ Component }">
        <Transition name="page" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>

    <AppFooter />

    <div
      class="pointer-events-none fixed bottom-5 right-4 z-40 flex flex-col items-end gap-3 sm:right-6"
    >
      <MusicPlayer class="pointer-events-auto" />
      <BackToTop />
    </div>
  </div>
</template>
