<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MdPreview } from 'md-editor-v3'
import {
  ChatDotRound,
  Collection,
  Document,
  Picture,
  PriceTag,
  View,
} from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SocialLinks from '@/components/common/SocialLinks.vue'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import { formatCompact, formatCopyrightYear } from '@/utils/format'

const site = useSiteStore()
const theme = useThemeStore()

const mdTheme = computed<'light' | 'dark'>(() => (theme.isDark ? 'dark' : 'light'))
const avatarFailed = ref(false)

const statItems = computed(() => {
  const stats = site.stats
  if (!stats) return []
  return [
    { label: '文章', value: formatCompact(stats.article), icon: Document },
    { label: '分类', value: String(stats.category), icon: Collection },
    { label: '标签', value: String(stats.tag), icon: PriceTag },
    { label: '评论', value: formatCompact(stats.comment), icon: ChatDotRound },
    { label: '说说', value: String(stats.talk), icon: ChatDotRound },
    { label: '照片', value: String(stats.photo), icon: Picture },
    { label: '留言', value: String(stats.message), icon: ChatDotRound },
    { label: '累计阅读', value: formatCompact(stats.views), icon: View },
    { label: '总字数', value: formatCompact(stats.words), icon: Document },
  ]
})

const aboutContent = computed(() => site.config?.about?.trim() ?? '')

onMounted(() => {
  if (!site.config) void site.ensureLoaded()
})
</script>

<template>
  <div class="container-page py-10">
    <header class="border-b pb-8" style="border-color: var(--border)">
      <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">About</p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">关于</h1>
    </header>

    <div class="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div class="order-2 min-w-0 lg:order-1">
        <div v-if="aboutContent" class="md-content card p-6 sm:p-8">
          <MdPreview
            id="about-preview"
            :model-value="aboutContent"
            :theme="mdTheme"
            preview-theme="github"
            code-theme="atom"
          />
        </div>

        <EmptyState
          v-else
          icon="inbox"
          title="还在写自我介绍"
          description="可以先看看侧边的站点信息，或者去读几篇文章。"
        />
      </div>

      <aside class="order-1 space-y-5 lg:order-2">
        <div class="card p-6 text-center">
          <img
            v-if="site.avatar && !avatarFailed"
            :src="site.avatar"
            :alt="`${site.author} 的头像`"
            class="mx-auto h-24 w-24 rounded-full border object-cover"
            style="border-color: var(--border)"
            loading="lazy"
            @error="avatarFailed = true"
          />
          <div
            v-else
            class="mx-auto grid h-24 w-24 place-items-center rounded-full text-3xl font-bold"
            style="background: var(--brand); color: var(--brand-contrast)"
            aria-hidden="true"
          >
            {{ site.author.charAt(0) }}
          </div>

          <h2 class="mt-4 text-xl font-bold">{{ site.author }}</h2>
          <p class="mt-2 text-sm leading-relaxed" style="color: var(--text-2)">
            {{ site.siteDescription }}
          </p>

          <div class="mt-4 flex justify-center">
            <SocialLinks :links="site.resolvedSocialLinks" />
          </div>

          <dl class="mt-5 space-y-2 border-t pt-4 text-left text-xs" style="border-color: var(--border)">
            <div v-if="site.config?.siteKeywords" class="flex gap-2">
              <dt class="shrink-0" style="color: var(--text-2)">关键词</dt>
              <dd class="min-w-0 flex-1">{{ site.config.siteKeywords }}</dd>
            </div>
            <div v-if="site.config?.startDate" class="flex gap-2">
              <dt class="shrink-0" style="color: var(--text-2)">记录始于</dt>
              <dd class="min-w-0 flex-1">{{ formatCopyrightYear(site.config.startDate) }}</dd>
            </div>
            <div v-if="site.config?.email" class="flex gap-2">
              <dt class="shrink-0" style="color: var(--text-2)">邮箱</dt>
              <dd class="min-w-0 flex-1 break-all">
                <a :href="`mailto:${site.config.email}`" class="hover:text-[var(--brand)]">{{ site.config.email }}</a>
              </dd>
            </div>
          </dl>
        </div>

        <div v-if="statItems.length > 0" class="card p-6">
          <h2 class="text-sm font-bold">站点统计</h2>
          <div class="mt-4 grid grid-cols-3 gap-3">
            <div
              v-for="item in statItems"
              :key="item.label"
              class="rounded-lg px-2 py-2.5 text-center"
              style="background: var(--bg-soft)"
            >
              <p class="stat-num text-base font-bold leading-tight">{{ item.value }}</p>
              <p class="mt-0.5 text-[11px]" style="color: var(--text-2)">{{ item.label }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
