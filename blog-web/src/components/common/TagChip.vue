<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    id: number
    name: string
    color?: string | null
    count?: number
  }>(),
  { color: null, count: undefined },
)

const dotStyle = computed(() => (props.color ? { backgroundColor: props.color } : undefined))
</script>

<template>
  <RouterLink :to="`/tag/${id}`" class="chip" :aria-label="`标签 ${name}`">
    <span
      v-if="color"
      class="h-1.5 w-1.5 shrink-0 rounded-full"
      :style="dotStyle"
      aria-hidden="true"
    ></span>
    <span class="opacity-70">#</span>{{ name }}
    <span v-if="count !== undefined" class="text-[10px] tabular-nums opacity-60">{{ count }}</span>
  </RouterLink>
</template>
