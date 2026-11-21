<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Close } from '@element-plus/icons-vue'

interface TagItem {
  path: string
  title: string
  affix: boolean
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  tag: TagItem | null
}

const AFFIX_PATH = '/dashboard'

const route = useRoute()
const router = useRouter()
const emit = defineEmits<{ refresh: [] }>()

const tags = ref<TagItem[]>([])
const scrollRef = ref<HTMLElement | null>(null)
const menu = ref<ContextMenuState>({ visible: false, x: 0, y: 0, tag: null })

function resolveTitle(): string {
  const title = route.meta.title
  return typeof title === 'string' && title ? title : '未命名页面'
}

function ensureTag(): void {
  const path = route.path
  const existing = tags.value.find((item) => item.path === path)
  if (existing) {
    existing.title = resolveTitle()
  } else {
    tags.value.push({ path, title: resolveTitle(), affix: path === AFFIX_PATH })
  }
}

function isActive(tag: TagItem): boolean {
  return tag.path === route.path
}

function scrollActiveIntoView(): void {
  void nextTick(() => {
    const container = scrollRef.value
    if (!container) return
    const active = container.querySelector<HTMLElement>('.tags-item.is-active')
    active?.scrollIntoView({ inline: 'end', block: 'nearest' })
  })
}

function goTag(tag: TagItem): void {
  hideMenu()
  if (tag.path !== route.path) void router.push(tag.path)
}

function closeTag(tag: TagItem): void {
  if (tag.affix) return
  const index = tags.value.findIndex((item) => item.path === tag.path)
  if (index < 0) return
  const wasActive = isActive(tag)
  tags.value.splice(index, 1)
  if (wasActive) {
    const next = tags.value[index] ?? tags.value[index - 1]
    void router.push(next ? next.path : AFFIX_PATH)
  }
}

function closeOthers(target: TagItem): void {
  tags.value = tags.value.filter((item) => item.affix || item.path === target.path || isActive(item))
  if (!isActive(target)) void router.push(target.path)
}

function closeAll(): void {
  tags.value = tags.value.filter((item) => item.affix)
  if (route.path !== AFFIX_PATH) void router.push(AFFIX_PATH)
}

function refreshCurrent(): void {
  hideMenu()
  emit('refresh')
}

function openMenu(event: MouseEvent, tag: TagItem): void {
  menu.value = {
    visible: true,
    x: Math.min(event.clientX, window.innerWidth - 130),
    y: Math.min(event.clientY, window.innerHeight - 160),
    tag,
  }
}

function hideMenu(): void {
  if (menu.value.visible) menu.value = { visible: false, x: 0, y: 0, tag: null }
}

watch(
  () => route.path,
  () => {
    ensureTag()
    scrollActiveIntoView()
  },
  { immediate: true },
)

watch(
  () => route.meta.title,
  () => ensureTag(),
)

onMounted(() => {
  document.addEventListener('click', hideMenu)
  window.addEventListener('resize', hideMenu)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', hideMenu)
  window.removeEventListener('resize', hideMenu)
})
</script>

<template>
  <div class="tags-view" @contextmenu.prevent>
    <div ref="scrollRef" class="tags-scroll">
      <div
        v-for="tag in tags"
        :key="tag.path"
        class="tags-item"
        :class="{ 'is-active': isActive(tag) }"
        @click="goTag(tag)"
        @contextmenu.prevent.stop="openMenu($event, tag)"
      >
        <span class="tags-item__title">{{ tag.title }}</span>
        <el-icon v-if="!tag.affix" class="tags-item__close" @click.stop="closeTag(tag)">
          <Close />
        </el-icon>
      </div>
    </div>

    <ul
      v-if="menu.visible"
      class="tags-contextmenu"
      :style="{ left: `${menu.x}px`, top: `${menu.y}px` }"
      @click.stop
    >
      <li @click="menu.tag && closeTag(menu.tag)">关闭当前</li>
      <li @click="menu.tag && closeOthers(menu.tag)">关闭其他</li>
      <li @click="closeAll">关闭全部</li>
      <li @click="refreshCurrent">刷新当前</li>
    </ul>
  </div>
</template>
