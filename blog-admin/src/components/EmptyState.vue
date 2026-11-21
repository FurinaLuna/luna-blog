<script setup lang="ts">
withDefaults(
  defineProps<{
    title?: string
    description?: string
    compact?: boolean
  }>(),
  {
    title: '暂无数据',
    description: '',
    compact: false,
  },
)
</script>

<template>
  <div class="flex flex-col items-center justify-center text-center" :class="compact ? 'py-8' : 'py-14'">
    <div
      class="mb-3 grid h-12 w-12 place-items-center rounded-full"
      :style="{ background: 'var(--brand-soft)', color: 'var(--brand)' }"
    >
      <el-icon :size="22"><DocumentAdd /></el-icon>
    </div>
    <p class="m-0 text-[14px] font-semibold" :style="{ color: 'var(--text)' }">{{ title }}</p>
    <p v-if="description" class="mt-1 max-w-[420px] text-[12px] leading-relaxed" :style="{ color: 'var(--text-2)' }">
      {{ description }}
    </p>
    <div v-if="$slots.default" class="mt-3">
      <slot />
    </div>
  </div>
</template>
