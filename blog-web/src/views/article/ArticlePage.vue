<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { useMediaQuery } from '@vueuse/core'
import { MdCatalog, MdPreview } from 'md-editor-v3'
import { ArrowLeft, ArrowRight, ChatDotRound, Clock, View } from '@element-plus/icons-vue'
import CommentSection from '@/components/comment/CommentSection.vue'
import CoverImage from '@/components/common/CoverImage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import LikeButton from '@/components/common/LikeButton.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import TagChip from '@/components/common/TagChip.vue'
import { getArticle, likeArticle } from '@/api/article'
import type { ArticleDetail } from '@/api/types'
import { useThemeStore } from '@/stores/theme'
import { formatCompact, formatDateTime } from '@/utils/format'
import { useLikeTarget } from '@/utils/like'

const previewId = 'article-preview'

const route = useRoute()
const theme = useThemeStore()
const isDesktop = useMediaQuery('(min-width: 1024px)')

const articleId = computed(() => Number(route.params.id))

const {
  data: articleData,
  isLoading,
  error,
  refetch,
} = useQuery({
  key: () => ['article', articleId.value],
  query: () => getArticle(articleId.value),
  staleTime: 30_000,
})

const article = computed<ArticleDetail | null>(() => articleData.value ?? null)

const { liked, count, pending, toggle } = useLikeTarget({
  key: () => `article:${articleId.value}`,
  initialCount: () => article.value?.likeCount ?? 0,
  action: () => likeArticle(articleId.value),
})

const mdTheme = computed<'light' | 'dark'>(() => (theme.isDark ? 'dark' : 'light'))
const scrollElement = document.documentElement
const catalogOpen = ref(false)

const publishedLabel = computed(() => {
  const current = article.value
  if (!current) return ''
  return formatDateTime(current.publishedAt ?? current.createdAt)
})

function closeCatalog(): void {
  catalogOpen.value = false
}
</script>

<template>
  <div class="container-page py-8 sm:py-10">
    <div v-if="isLoading" class="mx-auto max-w-3xl space-y-6">
      <SkeletonList variant="list" :count="1" />
      <div class="skeleton h-10 w-3/4 rounded-lg" />
      <div class="skeleton h-4 w-1/2 rounded" />
      <div class="skeleton h-64 w-full rounded-[18px]" />
      <SkeletonList variant="list" :count="2" />
    </div>

    <EmptyState
      v-else-if="error || !article"
      icon="error"
      title="文章不存在或已下架"
      description="它可能被删除、移动，或者链接输入有误。"
      action-text="重新加载"
      @action="refetch"
    />

    <template v-else>
      <nav class="mx-auto flex max-w-3xl items-center gap-1.5 text-xs" aria-label="面包屑" style="color: var(--text-2)">
        <RouterLink to="/" class="transition-colors hover:text-[var(--brand)]">首页</RouterLink>
        <span aria-hidden="true">/</span>
        <RouterLink
          v-if="article.category"
          :to="`/category/${article.category.id}`"
          class="transition-colors hover:text-[var(--brand)]"
        >
          {{ article.category.name }}
        </RouterLink>
        <span v-else>文章</span>
        <span aria-hidden="true">/</span>
        <span class="truncate" aria-current="page">{{ article.title }}</span>
      </nav>

      <header class="mx-auto mt-5 max-w-3xl">
        <div class="flex flex-wrap items-center gap-2">
          <RouterLink
            v-if="article.category"
            :to="`/category/${article.category.id}`"
            class="text-xs font-semibold"
            style="color: var(--brand)"
          >
            {{ article.category.name }}
          </RouterLink>
          <span v-if="article.isTop" class="badge-accent">置顶</span>
          <span v-if="article.isRecommend" class="badge-accent">推荐</span>
        </div>

        <h1 class="mt-3 text-3xl font-bold leading-[1.2] sm:text-[2.35rem]">{{ article.title }}</h1>

        <p v-if="article.summary" class="mt-4 text-[15px] leading-relaxed" style="color: var(--text-2)">
          {{ article.summary }}
        </p>

        <div class="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs" style="color: var(--text-2)">
          <time :datetime="article.publishedAt ?? article.createdAt">{{ publishedLabel }}</time>
          <span class="inline-flex items-center gap-1">
            <el-icon :size="13"><View /></el-icon>
            {{ formatCompact(article.views) }} 阅读
          </span>
          <span class="inline-flex items-center gap-1">
            <el-icon :size="13"><ChatDotRound /></el-icon>
            {{ article.commentCount }} 评论
          </span>
          <span class="inline-flex items-center gap-1">
            <el-icon :size="13"><Clock /></el-icon>
            {{ article.readingTime }} 分钟
          </span>
          <LikeButton
            class="ml-auto"
            :count="count"
            :liked="liked"
            :pending="pending"
            label="点赞文章"
            @toggle="toggle"
          />
        </div>
      </header>

      <div class="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_230px] xl:gap-14">
        <div class="mx-auto w-full min-w-0 max-w-3xl">
          <CoverImage
            v-if="article.cover"
            :src="article.cover"
            :alt="article.title"
            ratio="16 / 9"
            rounded="rounded-[18px]"
          />

          <button
            type="button"
            class="mt-6 inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs lg:hidden"
            style="border-color: var(--border); color: var(--text-2)"
            @click="catalogOpen = true"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h10" />
            </svg>
            查看目录
          </button>

          <div class="md-content mt-6">
            <MdPreview
              :id="previewId"
              :model-value="article.content"
              :theme="mdTheme"
              preview-theme="github"
              code-theme="atom"
            />
          </div>

          <div v-if="article.tags.length > 0" class="mt-8 flex flex-wrap gap-2">
            <TagChip v-for="tag in article.tags" :key="tag.id" :id="tag.id" :name="tag.name" />
          </div>

          <nav class="mt-10 grid gap-3 sm:grid-cols-2" aria-label="上一篇和下一篇">
            <RouterLink
              v-if="article.prev"
              :to="`/article/${article.prev.id}`"
              class="card card-hover group p-4"
            >
              <span class="inline-flex items-center gap-1 text-[11px]" style="color: var(--text-2)">
                <el-icon :size="12"><ArrowLeft /></el-icon>
                上一篇
              </span>
              <p class="mt-1 line-clamp-2 text-sm font-medium transition-colors group-hover:text-[var(--brand)]">
                {{ article.prev.title }}
              </p>
            </RouterLink>
            <RouterLink
              v-if="article.next"
              :to="`/article/${article.next.id}`"
              class="card card-hover group p-4 sm:text-right"
            >
              <span class="inline-flex items-center gap-1 text-[11px]" style="color: var(--text-2)">
                下一篇
                <el-icon :size="12"><ArrowRight /></el-icon>
              </span>
              <p class="mt-1 line-clamp-2 text-sm font-medium transition-colors group-hover:text-[var(--brand)]">
                {{ article.next.title }}
              </p>
            </RouterLink>
          </nav>

          <section v-if="article.related.length > 0" class="mt-12">
            <SectionTitle title="相关文章" />
            <div class="mt-4 grid gap-4 sm:grid-cols-2">
              <RouterLink
                v-for="item in article.related"
                :key="item.id"
                :to="`/article/${item.id}`"
                class="card card-hover flex items-center gap-3 p-3"
              >
                <div class="w-16 shrink-0">
                  <CoverImage :src="item.cover" :alt="item.title" :seed="item.title" ratio="1 / 1" rounded="rounded-lg" />
                </div>
                <p class="line-clamp-2 text-sm font-medium">{{ item.title }}</p>
              </RouterLink>
            </div>
          </section>

          <CommentSection
            :target-type="'article'"
            :target-id="article.id"
            :title="'评论'"
          />
        </div>

        <aside v-if="isDesktop" class="hidden lg:block">
          <div
            class="md-catalog sticky top-[calc(var(--header-h)+1.5rem)] max-h-[calc(100vh-var(--header-h)-3rem)] overflow-y-auto"
          >
            <MdCatalog
              :editor-id="previewId"
              :scroll-element="scrollElement"
              :scroll-element-offset-top="88"
              :theme="mdTheme"
              :catalog-max-depth="3"
            />
          </div>
        </aside>
      </div>

      <el-drawer
        v-model="catalogOpen"
        direction="rtl"
        size="78%"
        title="文章目录"
        class="catalog-drawer"
      >
        <div v-if="catalogOpen" class="md-catalog">
          <MdCatalog
            :editor-id="previewId"
            :scroll-element="scrollElement"
            :scroll-element-offset-top="88"
            :theme="mdTheme"
            :catalog-max-depth="3"
            @on-click="closeCatalog"
          />
        </div>
      </el-drawer>
    </template>
  </div>
</template>
