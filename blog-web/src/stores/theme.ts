import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePreferredDark } from '@vueuse/core'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'luna-theme'

function readMode(): ThemeMode {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (value === 'light' || value === 'dark' || value === 'system') return value
  } catch {
    /* 隐私模式下忽略 */
  }
  // 默认深色：没有本地偏好时先给暗色主题
  return 'dark'
}

export const useThemeStore = defineStore('theme', () => {
  const mode = ref<ThemeMode>(readMode())
  const prefersDark = usePreferredDark()
  const isDark = computed(() => mode.value === 'dark' || (mode.value === 'system' && prefersDark.value))

  function applyTheme(dark: boolean): void {
    const root = document.documentElement
    root.classList.toggle('dark', dark)
    root.style.colorScheme = dark ? 'dark' : 'light'
  }

  function setMode(next: ThemeMode): void {
    mode.value = next
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* 隐私模式下忽略 */
    }
    applyTheme(isDark.value)
  }

  function toggle(): void {
    setMode(isDark.value ? 'light' : 'dark')
  }

  watch(isDark, (dark) => applyTheme(dark), { immediate: true })

  return { mode, isDark, setMode, toggle }
})
