<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useEventListener, useWindowScroll } from '@vueuse/core'
import type { Component } from 'vue'
import {
  ChatLineRound,
  Clock,
  Collection,
  Grid,
  House,
  Link as LinkIcon,
  Message,
  Picture,
  Search,
} from '@element-plus/icons-vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { mainNav } from '@/config/nav'
import { useSiteStore } from '@/stores/site'

interface MenuLink {
  label: string
  to: string
  icon: Component
}

const site = useSiteStore()
const route = useRoute()
const router = useRouter()
const { y } = useWindowScroll()

const drawerOpen = ref(false)
const hidden = ref(false)
let lastY = 0

const scrolled = computed(() => y.value > 50)
/** 首页与内页 banner 顶部都浮在背景图之上；404 没有 banner，直接白底 */
const transparent = computed(() => !scrolled.value && route.name !== 'not-found')
const avatarUrl = computed(() => site.avatar || '')
const avatarInitial = computed(() => (site.siteName || 'Luna').trim().charAt(0).toUpperCase())

const primaryNav: MenuLink[] = [
  { label: '主页', to: '/', icon: House },
  { label: '时间轴', to: '/archives', icon: Clock },
]

const tailNav: MenuLink[] = [
  { label: '相册', to: '/albums', icon: Picture },
  { label: '说说', to: '/talks', icon: ChatLineRound },
  { label: '友链', to: '/friends', icon: LinkIcon },
  { label: '留言', to: '/message', icon: Message },
]

const moreLinks: MenuLink[] = [
  { label: '归档', to: '/archives', icon: Clock },
  { label: '资源', to: '/resources', icon: Collection },
  { label: '关于', to: '/about', icon: Grid },
]

const drawerNav = computed<MenuLink[]>(() => {
  const items: MenuLink[] = [{ label: '主页', to: '/', icon: House }]
  for (const item of mainNav.slice(1)) {
    const icon = tailNav.find((entry) => entry.to === item.to)?.icon
    items.push({ label: item.label, to: item.to, icon: icon ?? Collection })
  }
  return items
})

watch(
  () => route.fullPath,
  () => {
    drawerOpen.value = false
  },
)

watch(y, (next) => {
  if (next <= 50) {
    hidden.value = false
  } else if (next > lastY + 6) {
    hidden.value = true
  } else if (next < lastY - 6) {
    hidden.value = false
  }
  lastY = next
})

function isActive(to: string): boolean {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}

const taxonomyActive = computed(() => route.name === 'category' || route.name === 'tag')

function go(path: string): void {
  drawerOpen.value = false
  void router.push(path)
}

function openSearchPage(): void {
  drawerOpen.value = false
  if (route.path === '/search') {
    const input = document.querySelector<HTMLInputElement>('#page-search-input')
    input?.focus()
    input?.select()
    return
  }
  void router.push('/search')
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
  <header
    class="header_box"
    :class="{
      'is-transparent': transparent,
      'is-solid': !transparent,
      'is-hidden': hidden,
    }"
  >
    <div class="header_inner">
      <div class="header_left">
        <RouterLink to="/" class="header_avatar" aria-label="返回首页">
          <img v-if="avatarUrl" :src="avatarUrl" alt="" />
          <span v-else class="header_avatar_text" aria-hidden="true">{{ avatarInitial }}</span>
        </RouterLink>
      </div>

      <div class="header_right">
        <nav class="pc_menu" aria-label="主导航">
          <button
            type="button"
            class="menu_item"
            aria-label="搜索文章"
            title="搜索文章（Ctrl / ⌘ + K）"
            @click="openSearchPage"
          >
            <el-icon class="menu_icon"><Search /></el-icon>
          </button>

          <RouterLink
            v-for="item in primaryNav"
            :key="item.to"
            :to="item.to"
            class="menu_item"
            :class="{ 'is-active': isActive(item.to) }"
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            <el-icon class="menu_icon"><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>

          <el-dropdown trigger="click" placement="bottom" @command="go">
            <button
              type="button"
              class="menu_item"
              :class="{ 'is-active': isActive('/resources') || isActive('/about') }"
            >
              <el-icon class="menu_icon"><Grid /></el-icon>
              <span>更多</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="item in moreLinks"
                  :key="item.to"
                  :command="item.to"
                >
                  {{ item.label }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <el-dropdown trigger="click" placement="bottom" @command="go">
            <button type="button" class="menu_item" :class="{ 'is-active': taxonomyActive }">
              <el-icon class="menu_icon"><Collection /></el-icon>
              <span>分类</span>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-for="category in site.categories"
                  :key="category.id"
                  :command="`/category/${category.id}`"
                >
                  {{ category.name }}（{{ category.articleCount }}）
                </el-dropdown-item>
                <el-dropdown-item v-if="site.categories.length === 0" disabled>
                  暂无分类
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>

          <RouterLink
            v-for="item in tailNav"
            :key="item.to"
            :to="item.to"
            class="menu_item"
            :class="{ 'is-active': isActive(item.to) }"
            :aria-current="isActive(item.to) ? 'page' : undefined"
          >
            <el-icon class="menu_icon"><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
        </nav>

        <ThemeToggle />
      </div>
    </div>

    <div class="mobile_menu">
      <div class="mobile_menu_actions">
        <button
          type="button"
          class="header_icon"
          aria-label="打开导航菜单"
          :aria-expanded="drawerOpen"
          @click="drawerOpen = true"
        >
          <el-icon :size="20"><Grid /></el-icon>
        </button>
      </div>
      <div class="mobile_menu_actions">
        <button type="button" class="header_icon" aria-label="搜索文章" @click="openSearchPage">
          <el-icon :size="19"><Search /></el-icon>
        </button>
        <ThemeToggle />
      </div>
    </div>

    <el-drawer
      v-model="drawerOpen"
      direction="ltr"
      size="60%"
      :with-header="false"
      append-to-body
    >
      <div class="drawer_body">
        <div class="drawer_profile">
          <img v-if="avatarUrl" class="drawer_avatar" :src="avatarUrl" alt="" />
          <span v-else class="drawer_avatar drawer_avatar_text" aria-hidden="true">{{ avatarInitial }}</span>
          <div>
            <div class="drawer_name">{{ site.siteName }}</div>
            <div class="drawer_desc">{{ site.siteDescription }}</div>
          </div>
        </div>

        <nav class="header_drawer_list" aria-label="移动端主导航">
          <RouterLink
            v-for="item in drawerNav"
            :key="item.to"
            :to="item.to"
            class="drawer_link"
            :class="{ 'is-active': isActive(item.to) }"
          >
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </RouterLink>
          <RouterLink to="/search" class="drawer_link" :class="{ 'is-active': isActive('/search') }">
            <el-icon><Search /></el-icon>
            <span>搜索</span>
          </RouterLink>
        </nav>

        <div v-if="site.categories.length > 0" class="drawer_sub">
          <div class="drawer_sub_title">分类</div>
          <button
            v-for="category in site.categories"
            :key="category.id"
            type="button"
            class="drawer_link"
            @click="go(`/category/${category.id}`)"
          >
            <el-icon><Collection /></el-icon>
            <span>{{ category.name }}</span>
          </button>
        </div>

        <div v-if="site.tags.length > 0" class="drawer_sub">
          <div class="drawer_sub_title">标签</div>
          <button
            v-for="tag in site.tags"
            :key="tag.id"
            type="button"
            class="drawer_link"
            @click="go(`/tag/${tag.id}`)"
          >
            <el-icon><Collection /></el-icon>
            <span>{{ tag.name }}</span>
          </button>
        </div>
      </div>
    </el-drawer>
  </header>
</template>

<style scoped>
.drawer_body {
  display: flex;
  height: 100%;
  flex-direction: column;
  padding: 0.4rem 0.2rem 1.5rem;
  overflow-y: auto;
}

.drawer_profile {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.4rem 0.6rem 0.9rem;
  border-bottom: 1px solid var(--border);
}

.drawer_avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-soft);
}

.drawer_name {
  color: var(--text);
  font-size: 1.05rem;
  font-weight: 700;
}

.drawer_desc {
  margin-top: 0.15rem;
  color: var(--meta-color);
  font-size: 0.8rem;
  line-height: 1.5;
}
</style>
