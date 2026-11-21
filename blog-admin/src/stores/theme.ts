import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'

const THEME_KEY = 'luna-admin-theme'

export type ThemeMode = 'light' | 'dark'

function readInitialTheme(): ThemeMode {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') return stored
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = defineStore('theme', () => {
  const theme = ref<ThemeMode>(readInitialTheme())

  const isDark = computed(() => theme.value === 'dark')

  function apply(next: ThemeMode): void {
    document.documentElement.classList.toggle('dark', next === 'dark')
    document.documentElement.style.colorScheme = next
    localStorage.setItem(THEME_KEY, next)
  }

  function setTheme(next: ThemeMode): void {
    theme.value = next
  }

  function toggle(): void {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
  }

  watch(theme, apply, { immediate: true })

  return { theme, isDark, setTheme, toggle }
})
