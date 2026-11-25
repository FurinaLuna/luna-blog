<script setup lang="ts">
import { computed } from 'vue'
import { Moon, Sunny } from '@element-plus/icons-vue'
import { useThemeStore } from '@/stores/theme'

const theme = useThemeStore()

const label = computed(() => (theme.isDark ? '深色' : '浅色'))
</script>

<template>
  <button
    type="button"
    class="theme-switch"
    :class="{ 'is-dark': theme.isDark }"
    :aria-label="`切换为${theme.isDark ? '浅色' : '深色'}主题，当前：${label}`"
    :title="`切换为${theme.isDark ? '浅色' : '深色'}主题（当前：${label}）`"
    @click="theme.toggle()"
  >
    <span class="theme-switch__knob">
      <el-icon :size="14"><component :is="theme.isDark ? Moon : Sunny" /></el-icon>
    </span>
  </button>
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

.theme-switch:hover {
  background: rgba(255, 255, 255, 0.5);
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

.theme-switch.is-dark:hover {
  background: rgba(0, 0, 0, 0.6);
}

.theme-switch.is-dark .theme-switch__knob {
  transform: translateX(22px);
  color: #6f7fa8;
}
</style>
