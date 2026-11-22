<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useThemeStore, type ThemeMode } from '@/stores/theme'

const theme = useThemeStore()

const options: { value: ThemeMode; label: string }[] = [
  { value: 'light', label: '浅色' },
  { value: 'dark', label: '深色' },
  { value: 'system', label: '跟随系统' },
]

const label = computed(() => {
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
      class="theme-switch"
      :class="{ 'is-dark': theme.isDark, 'is-system': theme.mode === 'system' }"
      :aria-label="`切换主题，当前：${label}`"
      :title="`主题：${label}`"
    >
      <span class="theme-switch__knob">
        <el-icon :size="14"><component :is="theme.isDark ? Moon : Sunny" /></el-icon>
      </span>
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item v-for="option in options" :key="option.value" :command="option.value">
          <span class="theme-option">
            <span>{{ option.label }}</span>
            <span v-if="theme.mode === option.value" class="theme-option__check">✓</span>
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<style scoped>
.theme-switch {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 42px;
  height: 20px;
  margin: 0 0.4rem;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.35);
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.theme-switch__knob {
  position: absolute;
  left: 2px;
  display: grid;
  place-items: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  color: #e6a23c;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  transition:
    transform 0.3s ease,
    color 0.3s ease;
}

.theme-switch.is-dark {
  background: rgba(0, 0, 0, 0.45);
}

.theme-switch.is-dark .theme-switch__knob {
  transform: translateX(22px);
  color: #6f7fa8;
}

.theme-option {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.8rem;
}

.theme-option__check {
  margin-left: auto;
  color: var(--primary);
}
</style>
