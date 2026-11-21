<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Bell, Expand, Fold, Moon, Sunny } from '@element-plus/icons-vue'
import AppSidebar from './AppSidebar.vue'
import TagsView from './TagsView.vue'
import {
  getNotifications,
  getUnreadCount,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { NotificationItem } from '@/api/types'
import { fromNow, resolveAssetUrl } from '@/utils/format'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

const { width } = useWindowSize()
const isMobile = computed(() => width.value < 760)
const collapsed = ref(width.value < 990)
const mobileOpen = ref(false)
const viewKey = ref(0)

watch(width, (next) => {
  if (next < 760) {
    mobileOpen.value = false
    return
  }
  collapsed.value = next < 990
})

const sidebarCollapsed = computed(() => !isMobile.value && collapsed.value)

const crumbs = computed(() => {
  const list: Array<{ label: string; to?: string }> = [{ label: '首页', to: '/dashboard' }]
  if (route.meta.group) list.push({ label: route.meta.group })
  if (route.meta.title) list.push({ label: route.meta.title })
  return list
})

const unread = ref(0)
const recent = ref<NotificationItem[]>([])
const recentLoading = ref(false)

async function loadUnread(): Promise<void> {
  try {
    const result = await getUnreadCount()
    unread.value = result.count
  } catch {
    unread.value = 0
  }
}

async function loadRecent(): Promise<void> {
  recentLoading.value = true
  try {
    const result = await getNotifications({ page: 1, pageSize: 5 })
    recent.value = result.list
  } catch {
    recent.value = []
  } finally {
    recentLoading.value = false
  }
}

function handleBellVisible(visible: boolean): void {
  if (visible) {
    void loadRecent()
    void loadUnread()
  }
}

async function handleReadAll(): Promise<void> {
  try {
    await markAllNotificationsRead()
    recent.value = recent.value.map((item) => ({ ...item, isRead: true }))
    unread.value = 0
    ElMessage.success('已全部标记为已读')
  } catch {
    // 错误提示已由请求层统一处理
  }
}

async function openNotification(item: NotificationItem): Promise<void> {
  if (!item.isRead) {
    try {
      await markNotificationRead(item.id)
      item.isRead = true
      unread.value = Math.max(0, unread.value - 1)
    } catch {
      // 忽略单条已读失败
    }
  }
  await router.push({ name: 'Notifications' })
}

function toggleSidebar(): void {
  if (isMobile.value) {
    mobileOpen.value = !mobileOpen.value
    return
  }
  collapsed.value = !collapsed.value
}

function refreshView(): void {
  viewKey.value += 1
}

async function handleUserCommand(command: string | number | object): Promise<void> {
  if (command === 'profile') {
    await router.push({ name: 'Profile' })
    return
  }
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '退出登录', {
        confirmButtonText: '退出',
        cancelButtonText: '取消',
        type: 'warning',
      })
    } catch {
      return
    }
    auth.logout()
    await router.replace({ name: 'Login' })
  }
}

const initial = computed(() => auth.displayName.slice(0, 1).toUpperCase())
const avatarUrl = computed(() => resolveAssetUrl(auth.user?.avatar))

let unreadTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  void loadUnread()
  unreadTimer = setInterval(() => {
    void loadUnread()
  }, 60000)
})

onBeforeUnmount(() => {
  if (unreadTimer) clearInterval(unreadTimer)
})
</script>

<template>
  <div class="app-wrapper" :class="{ 'is-collapsed': sidebarCollapsed, 'mobile-open': mobileOpen }">
    <div v-if="isMobile && mobileOpen" class="app-mask" @click="mobileOpen = false" />

    <aside class="sidebar-container has-logo">
      <AppSidebar :collapsed="sidebarCollapsed" @toggle="toggleSidebar" />
    </aside>

    <div class="main-container">
      <div class="fixed-header">
        <nav class="navbar">
          <div class="navbar-left">
            <button type="button" class="navbar-collapse" aria-label="收起或展开侧栏" @click="toggleSidebar">
              <el-icon :size="18"><Expand v-if="sidebarCollapsed" /><Fold v-else /></el-icon>
            </button>

            <el-breadcrumb v-if="!isMobile" class="navbar-breadcrumb" separator="/">
              <el-breadcrumb-item v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
                <RouterLink v-if="crumb.to && index < crumbs.length - 1" :to="crumb.to">
                  {{ crumb.label }}
                </RouterLink>
                <span v-else>{{ crumb.label }}</span>
              </el-breadcrumb-item>
            </el-breadcrumb>
          </div>

          <div class="navbar-right">
            <el-popover
              placement="bottom-end"
              :width="340"
              trigger="click"
              popper-class="notification-popover"
              @show="handleBellVisible(true)"
            >
              <template #reference>
                <button type="button" class="navbar-icon-btn" aria-label="通知">
                  <el-badge :value="unread" :max="99" :hidden="unread === 0" :offset="[-4, 4]">
                    <el-icon :size="18"><Bell /></el-icon>
                  </el-badge>
                </button>
              </template>

              <div>
                <div class="mb-2 flex items-center justify-between">
                  <p class="m-0 text-[13px] font-semibold" :style="{ color: 'var(--text)' }">
                    通知
                    <span v-if="unread > 0" class="ml-1 text-[12px] font-normal text-[var(--el-color-primary)]">
                      {{ unread }} 条未读
                    </span>
                  </p>
                  <el-button link type="primary" size="small" :disabled="unread === 0" @click="handleReadAll">
                    全部已读
                  </el-button>
                </div>

                <div v-loading="recentLoading" class="max-h-[320px] min-h-[80px] overflow-y-auto">
                  <button
                    v-for="item in recent"
                    :key="item.id"
                    type="button"
                    class="mb-1 flex w-full cursor-pointer gap-2 rounded-sm border-0 bg-transparent px-2 py-2 text-left transition-colors hover:bg-[var(--el-fill-color-light)]"
                    @click="openNotification(item)"
                  >
                    <span
                      class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                      :style="{ background: item.isRead ? 'var(--el-border-color)' : 'var(--el-color-primary)' }"
                    />
                    <span class="min-w-0 flex-1">
                      <span class="clamp-1 block text-[13px] text-[var(--text)]">{{ item.title }}</span>
                      <span class="clamp-1 mt-0.5 block text-[12px] text-[var(--text-2)]">
                        {{ item.content }}
                      </span>
                      <span class="mt-1 block text-[11px] text-[var(--text-3)]">
                        {{ fromNow(item.createdAt) }}
                      </span>
                    </span>
                  </button>

                  <p
                    v-if="!recentLoading && recent.length === 0"
                    class="py-6 text-center text-[12px] text-[var(--text-3)]"
                  >
                    暂无通知
                  </p>
                </div>

                <div class="mt-2 border-t border-[var(--el-border-color-lighter)] pt-2 text-center">
                  <el-button link type="primary" size="small" @click="router.push({ name: 'Notifications' })">
                    查看全部
                  </el-button>
                </div>
              </div>
            </el-popover>

            <button
              type="button"
              class="navbar-icon-btn"
              :aria-label="theme.isDark ? '切换亮色' : '切换深色'"
              @click="theme.toggle()"
            >
              <el-icon :size="18"><Sunny v-if="theme.isDark" /><Moon v-else /></el-icon>
            </button>

            <el-dropdown trigger="click" @command="handleUserCommand">
              <button type="button" class="navbar-user">
                <el-avatar :size="26" :src="avatarUrl" :style="{ background: 'var(--el-color-primary)' }">
                  {{ initial }}
                </el-avatar>
                <span v-if="!isMobile" class="navbar-user__name">{{ auth.displayName }}</span>
                <el-icon v-if="!isMobile" :size="12" class="ml-1"><ArrowDown /></el-icon>
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                  <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </nav>

        <TagsView @refresh="refreshView" />
      </div>

      <section class="app-main">
        <div class="main-content">
          <RouterView v-slot="{ Component }">
            <Transition name="fade-transform" mode="out-in">
              <component :is="Component" :key="`${route.path}-${viewKey}`" />
            </Transition>
          </RouterView>
        </div>
      </section>
    </div>
  </div>
</template>
