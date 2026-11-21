<script setup lang="ts">
import { computed } from 'vue'
import SocialLinks from '@/components/common/SocialLinks.vue'
import { mainNav } from '@/config/nav'
import { useSiteStore } from '@/stores/site'
import { formatCopyrightYear } from '@/utils/format'

const site = useSiteStore()

const year = computed(() => formatCopyrightYear(site.config?.startDate))
const footerText = computed(() => site.config?.footerText || '用文字记录，用代码思考')
const icp = computed(() => site.config?.icp || '')
const rssUrl = '/rss.xml'
</script>

<template>
  <footer class="mt-20 border-t" style="border-color: var(--border); background: var(--bg-soft)">
    <div class="container-page py-12">
      <div class="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <div class="flex items-center gap-2.5">
            <span
              class="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold"
              style="background: var(--brand); color: var(--brand-contrast)"
              aria-hidden="true"
            >
              L
            </span>
            <span class="text-[15px] font-bold tracking-tight">{{ site.siteName }}</span>
          </div>
          <p class="mt-3 max-w-sm text-sm leading-relaxed" style="color: var(--text-2)">
            {{ site.siteDescription }}
          </p>
          <SocialLinks
            v-if="site.resolvedSocialLinks.length > 0"
            class="mt-5"
            :links="site.resolvedSocialLinks"
          />
        </div>

        <nav aria-label="页脚导航">
          <h2 class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--text-2)">
            导航
          </h2>
          <ul class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
            <li v-for="item in mainNav" :key="item.to">
              <RouterLink
                :to="item.to"
                class="transition-colors hover:text-[var(--brand)]"
                style="color: var(--text-2)"
              >
                {{ item.label }}
              </RouterLink>
            </li>
          </ul>
        </nav>

        <div>
          <h2 class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--text-2)">
            更多
          </h2>
          <ul class="mt-4 space-y-2.5 text-sm">
            <li>
              <a
                :href="rssUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors hover:text-[var(--brand)]"
                style="color: var(--text-2)"
              >
                RSS 订阅
              </a>
            </li>
            <li v-if="site.config?.github">
              <a
                :href="site.config.github"
                target="_blank"
                rel="noopener noreferrer"
                class="transition-colors hover:text-[var(--brand)]"
                style="color: var(--text-2)"
              >
                GitHub
              </a>
            </li>
            <li>
              <RouterLink
                to="/search"
                class="transition-colors hover:text-[var(--brand)]"
                style="color: var(--text-2)"
              >
                搜索
              </RouterLink>
            </li>
            <li v-if="site.config?.email">
              <a
                :href="`mailto:${site.config.email}`"
                class="transition-colors hover:text-[var(--brand)]"
                style="color: var(--text-2)"
              >
                邮箱联系
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div
        class="mt-10 flex flex-col gap-3 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between"
        style="border-color: var(--border); color: var(--text-2)"
      >
        <p>© {{ year }} {{ site.siteName }} · {{ footerText }}</p>
        <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            v-if="icp"
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            class="transition-colors hover:text-[var(--brand)]"
            style="color: var(--text-2)"
          >
            {{ icp }}
          </a>
          <span class="inline-flex items-center gap-1.5">
            <span class="h-1 w-1 rounded-full" style="background: var(--brand)" aria-hidden="true"></span>
            Vue 3 · Vite · Tailwind CSS
          </span>
        </div>
      </div>
    </div>
  </footer>
</template>
