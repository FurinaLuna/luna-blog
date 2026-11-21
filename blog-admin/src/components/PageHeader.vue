<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string
    description?: string
  }>(),
  { description: '' },
)
</script>

<template>
  <div class="flex flex-wrap items-end justify-between gap-3">
    <div class="min-w-0">
      <h1 class="m-0 text-[20px] font-bold tracking-tight" :style="{ color: 'var(--text)' }">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-1 mb-0 text-[13px]" :style="{ color: 'var(--text-2)' }">
        {{ description }}
      </p>
    </div>
    <div class="toolbar-actions">
      <slot />
    </div>
  </div>
</template>
