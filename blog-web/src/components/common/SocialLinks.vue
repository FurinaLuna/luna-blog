<script setup lang="ts">
import { computed } from 'vue'
import type { SocialLink } from '@/api/types'
import { BRAND_ICONS } from './social-icons'

const props = withDefaults(defineProps<{ links: SocialLink[]; size?: 'sm' | 'md' }>(), {
  size: 'sm',
})

type Resolved = { kind: 'brand'; brand: string } | { kind: 'mail' } | { kind: 'link' }

/** 关键字 → 图标，顺序即优先级（越具体越靠前） */
const KEYWORDS: Array<[string, string[]]> = [
  ['github', ['github']],
  ['gitee', ['gitee', '码云']],
  ['bilibili', ['bilibili', '哔哩', 'b站']],
  ['wechat', ['wechat', 'weixin', '微信']],
  ['qq', ['qq']],
  ['weibo', ['weibo', '微博']],
  ['zhihu', ['zhihu', '知乎']],
  ['juejin', ['juejin', '掘金']],
  ['douyin', ['douyin', 'tiktok', '抖音']],
  ['telegram', ['telegram']],
  ['youtube', ['youtube', '油管']],
  ['netease', ['netease', '网易云', 'music']],
  ['rss', ['rss', '订阅']],
]

function resolve(link: SocialLink): Resolved {
  const raw = ` ${link.icon} ${link.name} `.toLowerCase()
  if (/mail|email|e-mail|邮箱/.test(raw)) return { kind: 'mail' }
  for (const [key, words] of KEYWORDS) {
    if (words.some((word) => raw.includes(word))) return { kind: 'brand', brand: key }
  }
  if (/(^|\s)(x|twitter|推特)(\s|$)/.test(raw)) return { kind: 'brand', brand: 'x' }
  return { kind: 'link' }
}

const items = computed(() =>
  props.links.map((link) => ({
    link,
    icon: resolve(link),
    external: link.url.startsWith('http'),
  })),
)
</script>

<template>
  <ul class="flex flex-wrap items-center gap-2">
    <li v-for="item in items" :key="item.link.url">
      <a
        :href="item.link.url"
        :target="item.external ? '_blank' : undefined"
        :rel="item.external ? 'noopener noreferrer' : undefined"
        class="icon-btn h-9 w-9"
        :class="size === 'md' ? 'h-10 w-10' : ''"
        :aria-label="item.link.name"
        :title="item.link.name"
        style="border-color: var(--border)"
      >
        <svg
          v-if="item.icon.kind === 'brand'"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="h-4 w-4"
          aria-hidden="true"
        >
          <path
            v-for="(d, index) in BRAND_ICONS[item.icon.brand]?.paths ?? []"
            :key="index"
            :d="d"
          />
        </svg>
        <svg
          v-else-if="item.icon.kind === 'mail'"
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
