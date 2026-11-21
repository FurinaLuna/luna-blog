<script setup lang="ts">
import { computed } from 'vue'
import { Monitor, Moon, Sunny } from '@element-plus/icons-vue'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const theme = useThemeStore()

const options: { value: ThemeMode; label: string; icon: typeof Sunny }[] = [
  { value: 'light', label: '浅色', icon: Sunny },
  { value: 'dark', label: '深色', icon: Moon },
  { value: 'system', label: '跟随系统', icon: Monitor },
]

const currentIcon = computed(() => (theme.isDark ? Sunny : Moon))
const currentLabel = computed(() => {
  const matched = options.find((option) => option.value === theme.mode)
  return matched?.label ?? '跟随系统'
})

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system'
}

function handleCommand(command: unknown): void {
  if (isThemeMode(command)) theme.setMode(command)
}
</script>

<template>
  <el-dropdown trigger="click" placement="bottom-end" @command="handleCommand">
    <button
      type="button"
      class="icon-btn"
      :aria-label="`切换主题，当前：${currentLabel}`"
      :title="`主题：${currentLabel}`"
    >
      <el-icon :size="18"><component :is="currentIcon" /></el-icon>
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="option in options" :key="option.value" :command="option.value">
          <span class="flex w-full items-center gap-2">
            <el-icon :size="15"><component :is="option.icon" /></el-icon>
            <span>{{ option.label }}</span>
            <span v-if="theme.mode === option.value" class="ml-auto" style="color: var(--brand)">
              ✓
            </span>
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>
