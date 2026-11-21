<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useWindowSize } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, Bell, Menu, Moon, Sunny } from '@element-plus/icons-vue'
import AppSidebar from './AppSidebar.vue'
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
const isMobile = computed(() => width.value < 768)
const collapsed = ref(width.value < 1280)
const mobileOpen = ref(false)

watch(width, (next, prev) => {
  if (prev === undefined) return
  if (next >= 1280 && prev < 1280) collapsed.value = false
  else if (next < 1280 && prev >= 1280) collapsed.value = true
  if (next >= 768) mobileOpen.value = false
})

const contentOffset = computed(() => {
  if (isMobile.value) return '0px'
  return collapsed.value ? '72px' : '220px'
})

const crumbs = computed(() => {
  const list: Array<{ label: string; to?: string }> = [{ label: '管理后台', to: '/dashboard' }]
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
  <div class="min-h-screen" :style="{ background: 'var(--bg)' }">
    <aside
      v-if="!isMobile"
      class="fixed inset-y-0 left-0 z-30 overflow-hidden border-r transition-[width] duration-200"
      :class="collapsed ? 'w-[72px]' : 'w-[220px]'"
      :style="{ background: 'var(--sidebar)', borderColor: 'var(--border)' }"
    >
      <AppSidebar :collapsed="collapsed" @toggle="collapsed = !collapsed" />
    </aside>

    <el-drawer
      v-model="mobileOpen"
      direction="ltr"
      :with-header="false"
      size="240px"
      :style="{ '--el-drawer-padding-primary': '0px' }"
    >
      <div class="h-full" :style="{ background: 'var(--sidebar)' }">
        <AppSidebar :collapsed="false" @navigate="mobileOpen = false" />
      </div>
    </el-drawer>

    <div class="flex min-h-screen flex-col transition-[margin] duration-200" :style="{ marginLeft: contentOffset }">
      <header
        class="sticky top-0 z-20 flex h-[60px] shrink-0 items-center gap-3 border-b px-4 backdrop-blur-md lg:px-6"
        :style="{
          background: 'color-mix(in srgb, var(--bg) 82%, transparent)',
          borderColor: 'var(--border)',
        }"
      >
        <button
          type="button"
          class="grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] border-0 bg-transparent transition-colors hover:bg-[var(--brand-soft)] min-[768px]:hidden"
          :style="{ color: 'var(--text-2)' }"
          aria-label="打开菜单"
          @click="mobileOpen = true"
        >
          <el-icon :size="19"><Menu /></el-icon>
        </button>

        <el-breadcrumb class="hidden min-w-0 flex-1 text-[13px] min-[480px]:block" separator="/">
          <el-breadcrumb-item v-for="(crumb, index) in crumbs" :key="`${crumb.label}-${index}`">
            <RouterLink
              v-if="crumb.to && index < crumbs.length - 1"
              :to="crumb.to"
              class="transition-colors hover:text-[var(--brand)]"
              :style="{ color: 'var(--text-2)' }"
            >
              {{ crumb.label }}
            </RouterLink>
            <span v-else :style="{ color: index === crumbs.length - 1 ? 'var(--text)' : 'var(--text-2)' }">
              {{ crumb.label }}
            </span>
          </el-breadcrumb-item>
        </el-breadcrumb>

        <div class="flex flex-1 items-center justify-end gap-1.5 min-[480px]:flex-none">
          <el-popover
            placement="bottom-end"
            :width="340"
            trigger="click"
            popper-class="notification-popover"
            @show="handleBellVisible(true)"
          >
            <template #reference>
              <button
                type="button"
                class="grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] border-0 bg-transparent transition-colors hover:bg-[var(--brand-soft)]"
                :style="{ color: 'var(--text-2)' }"
                aria-label="通知"
              >
                <el-badge :value="unread" :max="99" :hidden="unread === 0" :offset="[-2, 2]">
                  <el-icon :size="19"><Bell /></el-icon>
                </el-badge>
              </button>
            </template>

            <div>
              <div class="mb-2 flex items-center justify-between">
                <p class="m-0 text-[13px] font-bold" :style="{ color: 'var(--text)' }">
                  通知
                  <span v-if="unread > 0" class="ml-1 text-[12px] font-normal" :style="{ color: 'var(--accent)' }">
                    {{ unread }} 条未读
                  </span>
                </p>
                <el-button link size="small" :disabled="unread === 0" @click="handleReadAll">
                  全部已读
                </el-button>
              </div>

              <div v-loading="recentLoading" class="max-h-[320px] min-h-[80px] overflow-y-auto">
                <button
                  v-for="item in recent"
                  :key="item.id"
                  type="button"
                  class="mb-1 flex w-full cursor-pointer gap-2 rounded-lg border-0 bg-transparent px-2 py-2 text-left transition-colors hover:bg-[var(--brand-soft)]"
                  @click="openNotification(item)"
                >
                  <span
                    class="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    :style="{ background: item.isRead ? 'var(--border-strong)' : 'var(--accent)' }"
                  />
                  <span class="min-w-0 flex-1">
                    <span class="clamp-1 block text-[13px]" :style="{ color: 'var(--text)' }">{{ item.title }}</span>
                    <span class="clamp-1 mt-0.5 block text-[12px]" :style="{ color: 'var(--text-2)' }">
                      {{ item.content }}
                    </span>
                    <span class="mt-1 block text-[11px]" :style="{ color: 'var(--text-3)' }">
                      {{ fromNow(item.createdAt) }}
                    </span>
                  </span>
                </button>

                <p v-if="!recentLoading && recent.length === 0" class="py-6 text-center text-[12px]" :style="{ color: 'var(--text-3)' }">
                  暂无通知
                </p>
              </div>

              <div class="mt-2 border-t pt-2 text-center" :style="{ borderColor: 'var(--border)' }">
                <el-button link size="small" @click="router.push({ name: 'Notifications' })">
                  查看全部
                </el-button>
              </div>
            </div>
          </el-popover>

          <button
            type="button"
            class="hidden h-9 w-9 cursor-pointer place-items-center rounded-[10px] border-0 bg-transparent transition-colors hover:bg-[var(--brand-soft)] min-[768px]:grid"
            :style="{ color: 'var(--text-2)' }"
            :aria-label="theme.isDark ? '切换亮色' : '切换深色'"
            @click="theme.toggle()"
          >
            <el-icon :size="18"><Sunny v-if="theme.isDark" /><Moon v-else /></el-icon>
          </button>

          <el-dropdown trigger="click" @command="handleUserCommand">
            <button
              type="button"
              class="ml-1 flex cursor-pointer items-center gap-2 rounded-full border-0 bg-transparent py-1 pr-2 pl-1 transition-colors hover:bg-[var(--brand-soft)]"
            >
              <el-avatar :size="28" :src="avatarUrl" :style="{ background: 'var(--brand)', fontWeight: 600 }">
                {{ initial }}
              </el-avatar>
              <span class="hidden max-w-[120px] truncate text-[13px] min-[560px]:block" :style="{ color: 'var(--text)' }">
                {{ auth.displayName }}
              </span>
              <el-icon :size="12" class="hidden min-[560px]:block" :style="{ color: 'var(--text-3)' }">
                <ArrowDown />
              </el-icon>
            </button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人中心</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </header>

      <main class="mx-auto w-full max-w-[1400px] flex-1 px-4 py-5 lg:px-6">
        <RouterView v-slot="{ Component }">
          <Transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
:deep(.el-drawer__body) {
  padding: 0;
}
</style>
