<script setup lang="ts">
import { computed } from 'vue'
import { useWindowScroll } from '@vueuse/core'
import { Top } from '@element-plus/icons-vue'

const { y } = useWindowScroll()
const visible = computed(() => y.value > 480)

function scrollToTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <Transition name="page">
    <button
      v-if="visible"
      type="button"
      class="back-top"
      aria-label="回到顶部"
      title="回到顶部"
      @click="scrollToTop"
    >
      <el-icon :size="18"><Top /></el-icon>
    </button>
  </Transition>
</template>
