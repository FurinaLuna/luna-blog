<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

interface TocItem {
  id: string
  text: string
  level: number
}

const props = withDefaults(
  defineProps<{
    /** MdPreview 的容器 id，用来在渲染完成后扫描标题 */
    editorId: string
    /** 顶栏高度偏移，点击滚动时让标题落在顶栏下方 */
    offsetTop?: number
  }>(),
  { offsetTop: 88 },
)

const emit = defineEmits<{ navigate: [id: string] }>()

const items = ref<TocItem[]>([])
const activeId = ref('')

let root: HTMLElement | null = null
let observer: MutationObserver | null = null
let rebuildTimer = 0
let frame = 0

function ensureRoot(): HTMLElement | null {
  if (root && root.isConnected) return root
  root = document.getElementById(props.editorId)
  return root
}

function collect(): void {
  const host = ensureRoot()
  if (!host) {
    scheduleRebuild()
    return
  }
  const headings = Array.from(host.querySelectorAll<HTMLElement>('h2, h3, h4'))
  // 预览还没渲染完（正文切换瞬间）时不要清空已有目录，稍后重试
  if (headings.length === 0) {
    if (items.value.length === 0) scheduleRebuild()
    return
  }
  items.value = headings.map((element, index) => {
    if (!element.id) element.id = `${props.editorId}-heading-${index + 1}`
    return {
      id: element.id,
      text: (element.textContent ?? '').trim(),
      level: Number(element.tagName.slice(1)),
    }
  })
  syncActive()
}

function syncActive(): void {
  if (items.value.length === 0) {
    activeId.value = ''
    return
  }
  const line = props.offsetTop + 12
  let current = items.value[0].id
  for (const item of items.value) {
    const element = document.getElementById(item.id)
    if (!element) continue
    if (element.getBoundingClientRect().top - line <= 0) current = item.id
    else break
  }
  activeId.value = current
}

function handleScroll(): void {
  if (frame !== 0) return
  frame = window.requestAnimationFrame(() => {
    frame = 0
    if (items.value.length === 0) collect()
    syncActive()
  })
}

function jump(item: TocItem): void {
  const element = document.getElementById(item.id)
  if (!element) return
  const top = element.getBoundingClientRect().top + window.scrollY - props.offsetTop
  window.scrollTo({ top, behavior: 'smooth' })
  activeId.value = item.id
  emit('navigate', item.id)
}

function scheduleRebuild(): void {
  window.clearTimeout(rebuildTimer)
  rebuildTimer = window.setTimeout(collect, 120)
}

function unbind(): void {
  observer?.disconnect()
  observer = null
  root = null
  items.value = []
  activeId.value = ''
}

function bind(): void {
  unbind()
  root = document.getElementById(props.editorId)
  if (!root) return
  collect()
  observer = new MutationObserver(scheduleRebuild)
  observer.observe(root, { childList: true, subtree: true })
}

onMounted(() => {
  bind()
  window.addEventListener('scroll', handleScroll, { passive: true })
})

watch(
  () => props.editorId,
  () => bind(),
)

// 当前小节变化时，让目录里的高亮项保持在可视区域内
watch(activeId, async (id) => {
  if (!id) return
  await nextTick()
  const link = Array.from(document.querySelectorAll<HTMLElement>('.toc-link')).find((item) => item.classList.contains('is-active'))
  const list = link?.closest<HTMLElement>('.toc-list')
  if (!link || !list) return
  const linkRect = link.getBoundingClientRect()
  const listRect = list.getBoundingClientRect()
  if (linkRect.top < listRect.top + 8 || linkRect.bottom > listRect.bottom - 8) {
    list.scrollTo({
      top: list.scrollTop + (linkRect.top - listRect.top) - listRect.height / 2 + linkRect.height / 2,
      behavior: 'smooth',
    })
  }
})

onBeforeUnmount(() => {
  window.clearTimeout(rebuildTimer)
  if (frame !== 0) window.cancelAnimationFrame(frame)
  window.removeEventListener('scroll', handleScroll)
  unbind()
})
</script>

<template>
  <nav class="toc-nav" aria-label="文章目录">
    <div v-if="items.length > 0" class="toc-list">
      <a
        v-for="item in items"
        :key="item.id"
        :href="`#${item.id}`"
        :title="item.text"
        class="toc-link"
        :class="[`level-${item.level}`, { 'is-active': item.id === activeId }]"
        @click.prevent="jump(item)"
      >
        <span class="toc-link__text">{{ item.text }}</span>
      </a>
    </div>
    <p v-else class="toc-empty">这篇文章没有小节标题</p>
  </nav>
</template>
