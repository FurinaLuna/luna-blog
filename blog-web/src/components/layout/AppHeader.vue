<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener, useWindowScroll } from '@vueuse/core'
import { Close, Menu, Search } from '@element-plus/icons-vue'
import SocialLinks from '@/components/common/SocialLinks.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { mainNav } from '@/config/nav'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'

const site = useSiteStore()
const theme = useThemeStore()
const route = useRoute()
const router = useRouter()
const { y } = useWindowScroll()

const scrolled = computed(() => y.value > 8)
const drawerOpen = ref(false)
const searchKeyword = ref('')

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)

function focusSearchOnPage(): void {
  const input = document.querySelector<HTMLInputElement>('#page-search-input')
  input?.focus()
  input?.select()
}

function openSearchPage(): void {
  drawerOpen.value = false
  if (route.path === '/search') {
    focusSearchOnPage()
    return
  }
  void router.push('/search')
}

function submitSearch(): void {
  const keyword = searchKeyword.value.trim()
  drawerOpen.value = false
  if (!keyword) {
    void router.push('/search')
    return
  }
  void router.push({ path: '/search', query: { keyword } })
  searchKeyword.value = ''
}

useEventListener(document, 'keydown', (event: KeyboardEvent) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    openSearchPage()
    return
  }
  if (event.key === 'Escape') drawerOpen.value = false
})
</script>

<template>
  <header class="app-header" :class="{ 'is-scrolled': scrolled }">
    <div class="container-page flex h-16 items-center gap-3">
      <RouterLink to="/" class="flex shrink-0 items-center gap-2.5" aria-label="返回首页">
        <span class="logo-mark" aria-hidden="true">L</span>
        <span class="hidden text-[15px] font-bold tracking-tight sm:block">
          {{ site.siteName }}
        </span>
      </RouterLink>

      <nav class="ml-5 hidden items-center gap-5 md:flex" aria-label="主导航">
        <RouterLink
          v-for="item in mainNav"
          :key="item.to"
          :to="item.to"
          class="nav-link"
          :class="{ 'is-active': isActive(item.to) }"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="ml-auto flex items-center gap-1">
        <button
          type="button"
          class="icon-btn"
          aria-label="搜索文章"
          title="搜索文章（Ctrl / ⌘ + K）"
          @click="openSearchPage"
        >
          <el-icon :size="18"><Search /></el-icon>
        </button>
        <ThemeToggle />
        <button
          type="button"
          class="icon-btn md:hidden"
          aria-label="打开导航菜单"
          :aria-expanded="drawerOpen"
          aria-controls="mobile-nav-drawer"
          @click="drawerOpen = true"
        >
          <el-icon :size="19"><Menu /></el-icon>
        </button>
      </div>
    </div>

    <el-drawer
      id="mobile-nav-drawer"
      v-model="drawerOpen"
      direction="rtl"
      size="84%"
      :with-header="false"
      append-to-body
    >
      <div class="flex h-full flex-col">
        <div
          class="flex items-center justify-between border-b pb-4"
          style="border-color: var(--border)"
        >
          <span class="text-sm font-semibold">导航</span>
          <button type="button" class="icon-btn" aria-label="关闭导航菜单" @click="drawerOpen = false">
            <el-icon :size="18"><Close /></el-icon>
          </button>
        </div>

        <form class="mt-4 flex gap-2" role="search" @submit.prevent="submitSearch">
          <el-input
            id="header-search-input"
            v-model="searchKeyword"
            placeholder="搜索文章…"
            clearable
            :prefix-icon="Search"
            aria-label="搜索文章关键词"
          />
          <button type="submit" class="btn btn-primary px-4">搜索</button>
        </form>

        <nav class="mt-6 space-y-1" aria-label="移动端主导航">
          <RouterLink
            v-for="(item, index) in mainNav"
            :key="item.to"
            :to="item.to"
            class="flex items-center justify-between rounded-[10px] px-3 py-2.5 text-[15px] font-medium transition-colors"
            :style="
              isActive(item.to)
                ? { color: 'var(--brand)', background: 'var(--brand-soft)' }
                : { color: 'var(--text-2)' }
            "
          >
            <span class="flex items-center gap-3">
              <span class="font-mono text-[11px] opacity-50">
                {{ String(index + 1).padStart(2, '0') }}
              </span>
              {{ item.label }}
            </span>
            <span
              v-if="isActive(item.to)"
              class="h-1.5 w-1.5 rounded-full"
              style="background: var(--brand)"
              aria-hidden="true"
            ></span>
          </RouterLink>
        </nav>

        <div class="mt-auto border-t pt-4" style="border-color: var(--border)">
          <div class="flex items-center justify-between">
            <span class="text-xs" style="color: var(--text-2)">外观主题</span>
            <button type="button" class="btn btn-ghost text-xs" @click="theme.toggle()">
              切换为{{ theme.isDark ? '浅色' : '深色' }}
            </button>
          </div>
          <SocialLinks v-if="site.resolvedSocialLinks.length > 0" class="mt-4" :links="site.resolvedSocialLinks" size="md" />
        </div>
      </div>
    </el-drawer>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 40;
  background: color-mix(in srgb, var(--bg) 84%, transparent);
  border-bottom: 1px solid transparent;
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  transition:
    border-color 0.2s ease,
    background-color 0.2s ease;
}

.app-header.is-scrolled {
  background: color-mix(in srgb, var(--bg) 94%, transparent);
  border-bottom-color: var(--border);
}

.logo-mark {
  display: flex;
  height: 2.1rem;
  width: 2.1rem;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--brand);
  color: var(--brand-contrast);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.14);
}
</style>
