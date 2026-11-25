<script setup lang="ts">
import { computed, ref } from 'vue'
import { onClickOutside } from '@vueuse/core'
import { Bell } from '@element-plus/icons-vue'
import { useSiteStore } from '@/stores/site'

const site = useSiteStore()
const root = ref<HTMLElement | null>(null)
const open = ref(false)

/** 已读的公告内容存在本地，公告文字一改就会重新出现红点 */
const READ_KEY = 'luna-announce-read'
const readText = ref<string>(readFromStorage())

function readFromStorage(): string {
  try {
    return localStorage.getItem(READ_KEY) ?? ''
  } catch {
    return ''
  }
}

const unread = computed(() => !!site.announcement && readText.value !== site.announcement)

function markRead(): void {
  readText.value = site.announcement
  try {
    localStorage.setItem(READ_KEY, site.announcement)
  } catch {
    /* 隐私模式下写不进去也不影响阅读 */
  }
}

function toggle(): void {
  open.value = !open.value
  if (open.value && unread.value) markRead()
}

// 点到页面其它地方（或按 Esc）就收起
onClickOutside(root, () => {
  open.value = false
})
</script>

<template>
  <div ref="root" v-if="site.announcement" class="announce-ball" :class="{ 'is-open': open }">
    <button
      type="button"
      class="announce-ball__trigger"
      aria-label="站长公告"
      :aria-expanded="open"
      @click="toggle"
    >
      <el-icon :size="19"><Bell /></el-icon>
      <span v-if="unread" class="announce-ball__dot" aria-hidden="true"></span>
    </button>

    <transition name="announce-slide">
      <div v-if="open" class="announce-ball__panel" role="dialog" aria-label="站长公告">
        <div class="announce-ball__head">
          <span class="announce-ball__title">站长公告</span>
          <button type="button" class="announce-ball__close" aria-label="关闭公告" @click="open = false">
            ×
          </button>
        </div>
        <p class="announce-ball__text">{{ site.announcement }}</p>
      </div>
    </transition>
  </div>
</template>
