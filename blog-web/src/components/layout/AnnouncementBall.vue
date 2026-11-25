<script setup lang="ts">
import { ref } from 'vue'
import { Bell } from '@element-plus/icons-vue'
import { useSiteStore } from '@/stores/site'

const site = useSiteStore()
const open = ref(false)
</script>

<template>
  <div v-if="site.announcement" class="announce-ball" :class="{ 'is-open': open }">
    <button
      type="button"
      class="announce-ball__trigger"
      aria-label="站长公告"
      :aria-expanded="open"
      @click="open = !open"
    >
      <el-icon :size="19"><Bell /></el-icon>
      <span class="announce-ball__dot" aria-hidden="true"></span>
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
