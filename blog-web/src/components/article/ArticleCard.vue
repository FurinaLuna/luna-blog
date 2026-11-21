<script setup lang="ts">
import { computed } from 'vue'
import { ChatDotRound, View } from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import type { Article } from '@/api/types'
import { formatCompact, formatDate } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    article: Article
    variant?: 'list' | 'feature'
  }>(),
  { variant: 'list' },
)

const articleLink = computed(() => `/article/${props.article.id}`)
const publishedLabel = computed(() =>
  formatDate(props.article.publishedAt || props.article.createdAt),
)
const categoryLink = computed(() =>
  props.article.category ? `/category/${props.article.category.id}` : '',
)
</script>

<template>
  <article class="card card-hover group overflow-hidden">
    <!-- 列表卡：桌面端封面在右，移动端在上 -->
    <div v-if="variant === 'list'" class="flex flex-col sm:flex-row">
      <div class="order-first p-4 pb-0 sm:order-last sm:w-[236px] sm:shrink-0 sm:p-4">
        <RouterLink :to="articleLink" tabindex="-1" aria-hidden="true" class="block">
          <CoverImage
            :src="article.cover"
            :alt="article.title"
            :seed="article.title"
            ratio="16 / 10"
            rounded="rounded-[10px]"
          />
        </RouterLink>
      </div>

      <div class="flex min-w-0 flex-1 flex-col p-5">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style="color: var(--text-2)">
          <RouterLink
            v-if="article.category && categoryLink"
            :to="categoryLink"
            class="font-medium transition-colors hover:opacity-80"
            style="color: var(--brand)"
          >
            {{ article.category.name }}
          </RouterLink>
          <span v-if="article.category" aria-hidden="true">·</span>
          <time :datetime="article.publishedAt || article.createdAt">{{ publishedLabel }}</time>
          <span v-if="article.isTop" class="badge-accent">置顶</span>
          <span v-else-if="article.isRecommend" class="badge-accent">推荐</span>
        </div>

        <h3 class="mt-2.5 text-[17px] font-bold leading-snug tracking-tight md:text-lg">
          <RouterLink :to="articleLink" class="transition-colors hover:text-[var(--brand)]">
            {{ article.title }}
          </RouterLink>
        </h3>

        <p
          v-if="article.summary"
          class="mt-2 line-clamp-2 text-sm leading-relaxed"
          style="color: var(--text-2)"
        >
          {{ article.summary }}
        </p>

        <div
          class="mt-4 flex items-center justify-between gap-3 text-xs"
          style="color: var(--text-2)"
        >
          <div class="flex items-center gap-3.5">
            <span class="inline-flex items-center gap-1">
              <el-icon :size="13"><View /></el-icon>
              <span class="tabular-nums">{{ formatCompact(article.views) }}</span>
            </span>
            <span class="inline-flex items-center gap-1">
              <el-icon :size="13"><ChatDotRound /></el-icon>
              <span class="tabular-nums">{{ article.commentCount }}</span>
            </span>
          </div>
          <span class="inline-flex items-center gap-1 whitespace-nowrap">
            <span class="h-1 w-1 rounded-full" style="background: var(--brand)" aria-hidden="true"></span>
            {{ article.readingTime }} 分钟
          </span>
        </div>
      </div>
    </div>

    <!-- 推荐卡：上封面下文字 -->
    <div v-else class="flex h-full flex-col">
      <div class="p-3 pb-0">
        <RouterLink :to="articleLink" tabindex="-1" aria-hidden="true" class="block">
          <CoverImage
            :src="article.cover"
            :alt="article.title"
            :seed="article.title"
            ratio="16 / 9"
            rounded="rounded-[10px]"
          />
        </RouterLink>
      </div>

      <div class="flex flex-1 flex-col p-5">
        <div class="flex items-center gap-2 text-xs" style="color: var(--text-2)">
          <span class="badge-accent">推荐</span>
          <time :datetime="article.publishedAt || article.createdAt">{{ publishedLabel }}</time>
        </div>
        <h3 class="mt-2.5 line-clamp-2 text-base font-bold leading-snug tracking-tight">
          <RouterLink :to="articleLink" class="transition-colors hover:text-[var(--brand)]">
            {{ article.title }}
          </RouterLink>
        </h3>
        <p class="mt-2 line-clamp-2 text-sm leading-relaxed" style="color: var(--text-2)">
          {{ article.summary }}
        </p>
        <div class="mt-auto flex items-center justify-between pt-4 text-xs" style="color: var(--text-2)">
          <span v-if="article.category">{{ article.category.name }}</span>
          <span class="tabular-nums">{{ article.readingTime }} 分钟阅读</span>
        </div>
      </div>
    </div>
  </article>
</template>
