<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'

withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    moreText?: string
    moreTo?: string
  }>(),
  { subtitle: '', moreText: '查看全部', moreTo: '' },
)
</script>

<template>
  <div class="mb-5 flex items-end justify-between gap-4">
    <div class="min-w-0">
      <div class="flex items-center gap-2.5">
        <span class="h-4 w-1 shrink-0 rounded-full" style="background: var(--brand)"></span>
        <h2 class="text-xl font-bold tracking-tight md:text-2xl">{{ title }}</h2>
      </div>
      <p v-if="subtitle" class="mt-1.5 pl-3.5 text-sm" style="color: var(--text-2)">
        {{ subtitle }}
      </p>
    </div>
    <RouterLink
      v-if="moreTo"
      :to="moreTo"
      class="group inline-flex shrink-0 items-center gap-1 text-sm font-medium transition-colors hover:text-[var(--brand)]"
      style="color: var(--text-2)"
    >
      {{ moreText }}
      <el-icon class="translate-x-0 transition-transform group-hover:translate-x-0.5">
        <ArrowRight />
      </el-icon>
    </RouterLink>
  </div>
</template>
