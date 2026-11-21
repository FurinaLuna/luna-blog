<script setup lang="ts">
withDefaults(
  defineProps<{
    id: number
    name: string
    color?: string | null
    count?: number
  }>(),
  { color: null, count: undefined },
)
</script>

<template>
  <RouterLink :to="`/tag/${id}`" class="chip" :aria-label="`标签 ${name}`">
    <span v-if="color" class="tag-dot" :style="{ backgroundColor: color }" aria-hidden="true"></span>
    <span>#{{ name }}</span>
    <span v-if="count !== undefined" class="tag-count">{{ count }}</span>
  </RouterLink>
</template>

<style scoped>
.tag-dot {
  width: 6px;
  height: 6px;
  flex-shrink: 0;
  border-radius: 50%;
}

.tag-count {
  font-size: 0.7rem;
  tabular-nums: tabular-nums;
  opacity: 0.65;
}
</style>
