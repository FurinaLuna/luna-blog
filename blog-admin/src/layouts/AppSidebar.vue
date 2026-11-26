<script setup lang="ts">
import { computed, type Component } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import {
  Bell,
  ChatDotRound,
  Comment,
  Connection,
  Document,
  Expand,
  FolderOpened,
  Fold,
  Link,
  Message,
  Odometer,
  PictureFilled,
  PriceTag,
  Setting,
  User,
} from '@element-plus/icons-vue'
import logoIcon from '@/assets/login/avatar.svg'

defineProps<{ collapsed: boolean }>()
const emit = defineEmits<{ toggle: [] }>()

interface MenuItem {
  name: string
  label: string
  path: string
  icon: Component
}

const menus: MenuItem[] = [
  { name: 'Dashboard', label: '仪表盘', path: '/dashboard', icon: Odometer },
  { name: 'Articles', label: '文章管理', path: '/articles', icon: Document },
  { name: 'Categories', label: '分类管理', path: '/categories', icon: FolderOpened },
  { name: 'Tags', label: '标签管理', path: '/tags', icon: PriceTag },
  { name: 'Talks', label: '说说管理', path: '/talks', icon: ChatDotRound },
  { name: 'Albums', label: '相册管理', path: '/albums', icon: PictureFilled },
  { name: 'Resources', label: '资源管理', path: '/resources', icon: Link },
  { name: 'Comments', label: '评论管理', path: '/comments', icon: Comment },
  { name: 'Messages', label: '留言管理', path: '/messages', icon: Message },
  { name: 'FriendLinks', label: '友情链接', path: '/friend-links', icon: Connection },
  { name: 'SiteConfig', label: '站点配置', path: '/site-config', icon: Setting },
  { name: 'Notifications', label: '通知中心', path: '/notifications', icon: Bell },
  { name: 'Profile', label: '个人中心', path: '/profile', icon: User },
]

const pathByName = new Map(menus.map((item) => [item.name, item.path]))

const route = useRoute()

const activePath = computed(() => {
  const activeMenu = route.meta.activeMenu
  if (typeof activeMenu === 'string') return pathByName.get(activeMenu) ?? route.path
  return route.path
})
</script>

<template>
  <div class="flex h-full flex-col">
    <div class="sidebar-logo-container">
      <RouterLink to="/dashboard" class="sidebar-logo-link">
        <img class="sidebar-logo-icon" :src="logoIcon" alt="Luna Blog" />
        <span class="sidebar-title">Luna Blog</span>
      </RouterLink>
    </div>

    <el-scrollbar class="sidebar-scroll">
      <el-menu
        :default-active="activePath"
        :collapse="collapsed"
        :collapse-transition="false"
        router
        class="outer-most select-none"
      >
        <el-menu-item v-for="item in menus" :key="item.name" :index="item.path">
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.label }}</template>
        </el-menu-item>
      </el-menu>
    </el-scrollbar>

    <div class="sidebar-collapse" @click="emit('toggle')">
      <el-icon :size="18"><Expand v-if="collapsed" /><Fold v-else /></el-icon>
    </div>
  </div>
</template>
