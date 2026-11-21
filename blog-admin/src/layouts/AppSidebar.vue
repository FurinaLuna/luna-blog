<script setup lang="ts">
import { computed, type Component } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import {
  Bell,
  ChatDotRound,
  Comment,
  Connection,
  Document,
  Expand,
  Fold,
  FolderOpened,
  Link,
  Message,
  Moon,
  Odometer,
  PictureFilled,
  PriceTag,
  Setting,
  Sunny,
  SwitchButton,
  User,
} from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'

defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ toggle: []; navigate: [] }>()

interface MenuItem {
  name: string
  label: string
  icon: Component
}

interface MenuGroup {
  title: string
  items: MenuItem[]
}

const groups: MenuGroup[] = [
  {
    title: '内容',
    items: [
      { name: 'Dashboard', label: '仪表盘', icon: Odometer },
      { name: 'Articles', label: '文章', icon: Document },
      { name: 'Categories', label: '分类', icon: FolderOpened },
      { name: 'Tags', label: '标签', icon: PriceTag },
      { name: 'Talks', label: '说说', icon: ChatDotRound },
      { name: 'Albums', label: '相册', icon: PictureFilled },
      { name: 'Resources', label: '资源', icon: Link },
    ],
  },
  {
    title: '互动',
    items: [
      { name: 'Comments', label: '评论', icon: Comment },
      { name: 'Messages', label: '留言', icon: Message },
      { name: 'FriendLinks', label: '友链', icon: Connection },
    ],
  },
  {
    title: '站点',
    items: [
      { name: 'SiteConfig', label: '站点配置', icon: Setting },
      { name: 'Notifications', label: '通知', icon: Bell },
    ],
  },
  {
    title: '账户',
    items: [{ name: 'Profile', label: '个人中心', icon: User }],
  },
]

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

const activeName = computed(() => {
  if (route.meta.activeMenu) return route.meta.activeMenu
  return typeof route.name === 'string' ? route.name : ''
})

function isActive(item: MenuItem): boolean {
  return activeName.value === item.name
}

function handleNavigate(): void {
  emit('navigate')
}

async function handleLogout(): Promise<void> {
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
</script>

<template>
  <div class="flex h-full flex-col">
    <div
      class="flex h-[60px] shrink-0 items-center gap-2.5 border-b px-4"
      :class="collapsed ? 'justify-center px-2' : ''"
      :style="{ borderColor: 'var(--border)' }"
    >
      <span
        class="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] text-[15px] font-bold text-white"
        :style="{ background: 'linear-gradient(135deg, #2f8f83, #5ec9b8)' }"
      >
        🌙
      </span>
      <div v-if="!collapsed" class="min-w-0">
        <p class="truncate text-[14px] font-bold tracking-tight" :style="{ color: 'var(--text)' }">
          Luna Blog
        </p>
        <p class="truncate text-[11px]" :style="{ color: 'var(--text-3)' }">内容管理后台</p>
      </div>
    </div>

    <nav class="flex-1 overflow-y-auto px-2 py-3">
      <div v-for="group in groups" :key="group.title" class="mb-3">
        <p
          v-if="!collapsed"
          class="mb-1 px-2 text-[11px] font-semibold tracking-[0.12em] uppercase"
          :style="{ color: 'var(--text-3)' }"
        >
          {{ group.title }}
        </p>
        <div v-else class="mx-auto mb-2 h-px w-6" :style="{ background: 'var(--border)' }" />

        <el-tooltip
          v-for="item in group.items"
          :key="item.name"
          :content="item.label"
          placement="right"
          :disabled="!collapsed"
          :show-after="150"
        >
          <RouterLink
            :to="{ name: item.name }"
            class="mb-0.5 flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-colors"
            :class="collapsed ? 'justify-center px-0' : ''"
            :style="
              isActive(item)
                ? { background: 'var(--brand-soft)', color: 'var(--brand)', fontWeight: 600 }
                : { color: 'var(--text-2)' }
            "
            @click="handleNavigate"
          >
            <el-icon :size="18"><component :is="item.icon" /></el-icon>
            <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
          </RouterLink>
        </el-tooltip>
      </div>
    </nav>

    <div class="shrink-0 border-t p-2" :style="{ borderColor: 'var(--border)' }">
      <el-tooltip :content="theme.isDark ? '切换亮色' : '切换深色'" placement="right" :disabled="!collapsed">
        <button
          type="button"
          class="mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-[13px] transition-colors hover:bg-[var(--brand-soft)]"
          :class="collapsed ? 'justify-center px-0' : ''"
          :style="{ color: 'var(--text-2)' }"
          @click="theme.toggle()"
        >
          <el-icon :size="18"><Sunny v-if="theme.isDark" /><Moon v-else /></el-icon>
          <span v-if="!collapsed">{{ theme.isDark ? '亮色模式' : '深色模式' }}</span>
        </button>
      </el-tooltip>

      <el-tooltip content="退出登录" placement="right" :disabled="!collapsed">
        <button
          type="button"
          class="flex w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-[13px] transition-colors hover:bg-[var(--brand-soft)]"
          :class="collapsed ? 'justify-center px-0' : ''"
          :style="{ color: 'var(--text-2)' }"
          @click="handleLogout"
        >
          <el-icon :size="18"><SwitchButton /></el-icon>
          <span v-if="!collapsed">退出登录</span>
        </button>
      </el-tooltip>

      <button
        type="button"
        class="mt-0.5 hidden w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-transparent px-2.5 py-2 text-[13px] transition-colors hover:bg-[var(--brand-soft)] min-[768px]:flex"
        :class="collapsed ? 'justify-center px-0' : ''"
        :style="{ color: 'var(--text-3)' }"
        @click="emit('toggle')"
      >
        <el-icon :size="18"><Expand v-if="collapsed" /><Fold v-else /></el-icon>
        <span v-if="!collapsed">收起侧栏</span>
      </button>
    </div>
  </div>
</template>
