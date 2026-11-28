<script setup lang="ts">
import { computed } from 'vue'
import type { SocialLink } from '@/api/types'
import SocialIcon from './SocialIcon.vue'

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
  props.links.map((link) => {
    const icon = resolve(link)
    return {
      link,
      kind: icon.kind,
      brand: icon.kind === 'brand' ? icon.brand : '',
      /** 有二维码时悬浮展示二维码，不再当普通链接跳转 */
      qrcode: (link.qrcode ?? '').trim(),
      external: link.url.startsWith('http'),
    }
  }),
)

/** 图标按钮的公共 class（<a> 与 <button> 共用） */
function btnClass(size: 'sm' | 'md'): string {
  return ['icon-btn', 'h-9 w-9', size === 'md' ? 'h-10 w-10' : ''].filter(Boolean).join(' ')
}
</script>

<template>
  <ul class="flex flex-wrap items-center gap-2">
    <li v-for="item in items" :key="`${item.link.name}-${item.link.url}-${item.qrcode}`">
      <el-popover
        v-if="item.qrcode"
        placement="top"
        :width="196"
        trigger="hover"
        popper-class="social-qr-popover"
      >
        <template #reference>
          <span class="inline-flex">
            <button
              type="button"
              :class="btnClass(size)"
              :aria-label="`${item.link.name} 二维码`"
              :title="`${item.link.name} 二维码`"
              style="border-color: var(--border)"
            >
              <SocialIcon :kind="item.kind" :brand="item.brand" />
            </button>
          </span>
        </template>
        <div class="social-qr">
          <img :src="item.qrcode" loading="lazy" decoding="async" :alt="`${item.link.name} 二维码`" />
          <p class="social-qr__name">{{ item.link.name }}</p>
          <p class="social-qr__tip">扫码添加</p>
        </div>
      </el-popover>

      <a
        v-else
        :href="item.link.url"
        :target="item.external ? '_blank' : undefined"
        :rel="item.external ? 'noopener noreferrer' : undefined"
        :class="btnClass(size)"
        :aria-label="item.link.name"
        :title="item.link.name"
        style="border-color: var(--border)"
      >
        <SocialIcon :kind="item.kind" :brand="item.brand" />
      </a>
    </li>
  </ul>
</template>

<style scoped>
.social-qr {
  text-align: center;
}

.social-qr img {
  width: 160px;
  height: 160px;
  margin: 0 auto;
  border-radius: 8px;
  object-fit: contain;
  background: #fff;
}

.social-qr__name {
  margin: 0.5rem 0 0;
  color: var(--font-color);
  font-size: 0.85rem;
  font-weight: 600;
}

.social-qr__tip {
  margin: 0.1rem 0 0;
  color: var(--meta-color);
  font-size: 0.75rem;
}
</style>
