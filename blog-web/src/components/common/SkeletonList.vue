<script setup lang="ts">
withDefaults(
  defineProps<{
    count?: number
    variant?: 'list' | 'sidebar' | 'card'
  }>(),
  { count: 3, variant: 'list' },
)
</script>

<template>
  <div v-if="variant === 'sidebar'" class="space-y-3" aria-hidden="true">
    <div v-for="index in count" :key="index" class="flex items-center gap-3">
      <div class="skeleton h-8 w-8 shrink-0 rounded-lg"></div>
      <div class="flex-1 space-y-2">
        <div class="skeleton h-3 w-4/5"></div>
        <div class="skeleton h-2.5 w-1/3"></div>
      </div>
    </div>
  </div>

  <div v-else-if="variant === 'card'" class="post-grid" aria-hidden="true">
    <div v-for="index in count" :key="index" class="post-card">
      <div class="skeleton aspect-video rounded-none"></div>
      <div class="space-y-2.5 p-4">
        <div class="skeleton h-4 w-4/5"></div>
        <div class="skeleton h-3 w-full"></div>
        <div class="skeleton h-3 w-2/3"></div>
      </div>
    </div>
  </div>

  <div v-else class="space-y-4" aria-hidden="true">
    <div v-for="index in count" :key="index" class="post-card">
      <div class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div class="flex-1 space-y-3">
          <div class="skeleton h-3 w-24"></div>
          <div class="skeleton h-5 w-11/12"></div>
          <div class="skeleton h-3 w-full"></div>
          <div class="skeleton h-3 w-3/4"></div>
        </div>
        <div class="skeleton h-36 w-full shrink-0 sm:h-24 sm:w-40"></div>
      </div>
    </div>
  </div>
</template>
