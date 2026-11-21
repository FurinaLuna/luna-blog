<script setup lang="ts">
import { computed } from 'vue'
import { useWindowScroll } from '@vueuse/core'

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
      class="card flex h-11 w-11 items-center justify-center transition-colors hover:text-[var(--brand)]"
      style="color: var(--text-2); box-shadow: var(--shadow)"
      aria-label="回到顶部"
      title="回到顶部"
      @click="scrollToTop"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M12 19V5" />
        <path d="m6 11 6-6 6 6" />
      </svg>
    </button>
  </Transition>
</template>
