<script setup lang="ts">
import { BRAND_ICONS } from './social-icons'

defineProps<{
  kind: 'brand' | 'mail' | 'link'
  brand?: string
}>()
</script>

<template>
  <svg
    v-if="kind === 'brand'"
    viewBox="0 0 24 24"
    fill="currentColor"
    class="h-4 w-4"
    aria-hidden="true"
  >
    <path v-for="(d, index) in BRAND_ICONS[brand ?? '']?.paths ?? []" :key="index" :d="d" />
  </svg>
  <svg
    v-else-if="kind === 'mail'"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-4 w-4"
    aria-hidden="true"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3.5 7 8.5 6 8.5-6" />
  </svg>
  <svg
    v-else
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.7"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="h-4 w-4"
    aria-hidden="true"
  >
    <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
    <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
  </svg>
</template>
