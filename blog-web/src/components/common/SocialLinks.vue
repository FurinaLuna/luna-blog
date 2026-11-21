<script setup lang="ts">
import type { SocialLink } from '@/api/types'

withDefaults(defineProps<{ links: SocialLink[]; size?: 'sm' | 'md' }>(), { size: 'sm' })

function iconKey(link: SocialLink): 'github' | 'mail' | 'rss' | 'x' | 'link' {
  const raw = `${link.icon} ${link.name}`.toLowerCase()
  if (raw.includes('github')) return 'github'
  if (raw.includes('mail') || raw.includes('email') || raw.includes('邮箱')) return 'mail'
  if (raw.includes('rss')) return 'rss'
  if (raw.includes('twitter') || raw.trim() === 'x') return 'x'
  return 'link'
}

function isExternal(url: string): boolean {
  return url.startsWith('http')
}
</script>

<template>
  <ul class="flex flex-wrap items-center gap-2">
    <li v-for="link in links" :key="link.url">
      <a
        :href="link.url"
        :target="isExternal(link.url) ? '_blank' : undefined"
        :rel="isExternal(link.url) ? 'noopener noreferrer' : undefined"
        class="icon-btn h-9 w-9"
        :class="size === 'md' ? 'h-10 w-10' : ''"
        :aria-label="link.name"
        :title="link.name"
        style="border-color: var(--border)"
      >
        <svg
          v-if="iconKey(link) === 'github'"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path
            d="M12 .5C5.65.5.5 5.65.5 12c0 5.1 3.29 9.41 7.86 10.94.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.72.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.72-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.18-3.1-.12-.29-.51-1.46.11-3.05 0 0 .96-.31 3.15 1.18a10.9 10.9 0 0 1 5.74 0c2.19-1.49 3.15-1.18 3.15-1.18.62 1.59.23 2.76.11 3.05.73.81 1.18 1.84 1.18 3.1 0 4.43-2.69 5.4-5.25 5.69.41.36.78 1.06.78 2.14v3.17c0 .3.21.67.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
          />
        </svg>
        <svg
          v-else-if="iconKey(link) === 'x'"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M17.5 3h3l-6.6 7.5L21.8 21h-5.9l-4.6-6-5.3 6H3l7.1-8L2.6 3h6l4.1 5.4L17.5 3zm-1 16h1.7L7.6 4.7H5.8L16.5 19z" />
        </svg>
        <svg
          v-else-if="iconKey(link) === 'mail'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m3.5 7 8.5 6 8.5-6" />
        </svg>
        <svg
          v-else-if="iconKey(link) === 'rss'"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M5 5a14 14 0 0 1 14 14" />
          <path d="M5 11a8 8 0 0 1 8 8" />
          <circle cx="5.5" cy="18.5" r="1.4" fill="currentColor" stroke="none" />
        </svg>
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1.5 1.5" />
          <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1.5-1.5" />
        </svg>
      </a>
    </li>
  </ul>
</template>
