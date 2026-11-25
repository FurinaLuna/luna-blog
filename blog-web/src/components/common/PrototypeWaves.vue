<script setup lang="ts">
import { computed } from 'vue'

/**
 * 原型底部波浪：4 层 `gentle-wave` 叠加，各自不同速度做视差。
 * 用随机 id 保证同页多实例（首页 + 内页 banner）不会互相串层。
 */
const props = withDefaults(
  defineProps<{
    height?: string
    variant?: 'home' | 'header'
  }>(),
  { height: '', variant: 'home' },
)

const uid = `gentle-wave-${Math.random().toString(36).slice(2, 9)}`
const svgStyle = computed(() =>
  props.height ? { height: props.height, minHeight: props.height } : undefined,
)
const classes = computed(() => ['waves', props.variant === 'header' ? 'waves--header' : ''])
</script>

<template>
  <svg
    :class="classes"
    :style="svgStyle"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 24 150 28"
    preserveAspectRatio="none"
    shape-rendering="auto"
    aria-hidden="true"
  >
    <defs>
      <path
        :id="uid"
        d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"
      />
    </defs>
    <g class="parallax">
      <use :href="`#${uid}`" x="48" y="0" />
      <use :href="`#${uid}`" x="48" y="4" />
      <use :href="`#${uid}`" x="48" y="7" />
      <use :href="`#${uid}`" x="48" y="10" />
    </g>
  </svg>
</template>
