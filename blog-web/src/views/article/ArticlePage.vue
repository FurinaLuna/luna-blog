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
import PageHeader from '@/components/common/PageHeader.vue'
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

const copyrightText = computed(() => {
  const current = article.value
  if (!current) return ''
  return `本文链接：/article/${current.id}`
})

function closeCatalog(): void {
  catalogOpen.value = false
}
</script>

<template>
  <div>
    <div v-if="isLoading" class="article-center">
      <div class="card article-card">
        <SkeletonList variant="list" :count="1" />
        <div class="skeleton h-10 w-3/4 rounded-lg" />
        <div class="skeleton h-64 w-full rounded-lg" />
      </div>
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
      <PageHeader>
        <div class="page-header__article">
          <div class="page-header__tags">
            <RouterLink
              v-if="article.category"
              :to="`/category/${article.category.id}`"
              class="page-header__tag"
            >
              {{ article.category.name }}
            </RouterLink>
            <span v-if="article.isTop" class="page-header__tag">置顶</span>
            <span v-if="article.isRecommend" class="page-header__tag">推荐</span>
          </div>
          <h1 class="page-header__title">{{ article.title }}</h1>
          <div class="page-header__meta">
            <span class="page-header__meta-item">
              <el-icon :size="13"><Clock /></el-icon>{{ publishedLabel }}
            </span>
            <span class="page-header__sep" aria-hidden="true">|</span>
            <span class="page-header__meta-item">
              <el-icon :size="13"><View /></el-icon>{{ formatCompact(article.views) }} 阅读
            </span>
            <span class="page-header__sep" aria-hidden="true">|</span>
            <span class="page-header__meta-item">
              <el-icon :size="13"><ChatDotRound /></el-icon>{{ article.commentCount }} 评论
            </span>
            <span class="page-header__sep" aria-hidden="true">|</span>
            <span class="page-header__meta-item">{{ article.readingTime }} 分钟</span>
          </div>
        </div>
      </PageHeader>

      <div class="article-center">
        <div class="article-layout">
          <article class="card article-card">
            <CoverImage
              v-if="article.cover"
              :src="article.cover"
              :alt="article.title"
              ratio="16 / 9"
              rounded="rounded-none"
            />

            <div class="article-card__inner">
              <div v-if="article.tags.length > 0" class="article-tags">
                <TagChip v-for="tag in article.tags" :key="tag.id" :id="tag.id" :name="tag.name" />
              </div>

              <button
                type="button"
                class="article-catalog-btn"
                @click="catalogOpen = true"
              >
                查看目录
              </button>

              <div class="md-content">
                <MdPreview
                  :id="previewId"
                  :model-value="article.content"
                  :theme="mdTheme"
                  preview-theme="github"
                  code-theme="atom"
                />
              </div>

              <div class="article-copyright">
                <p>{{ copyrightText }}</p>
                <p>版权声明：本文为站长原创文章，如需转载，请注明出处。</p>
              </div>

              <div class="article-like">
                <LikeButton
                  size="lg"
                  :count="count"
                  :liked="liked"
                  :pending="pending"
                  label="点赞文章"
                  @toggle="toggle"
                />
              </div>

              <nav class="recommend-nav" aria-label="上一篇和下一篇">
                <RouterLink
                  v-if="article.prev"
                  :to="`/article/${article.prev.id}`"
                  class="recommend-item"
                >
                  <span class="recommend-item__label">
                    <el-icon :size="12"><ArrowLeft /></el-icon>
                    上一篇
                  </span>
                  <span class="recommend-item__title">{{ article.prev.title }}</span>
                </RouterLink>
                <RouterLink
                  v-if="article.next"
                  :to="`/article/${article.next.id}`"
                  class="recommend-item recommend-item--next"
                >
                  <span class="recommend-item__label">
                    下一篇
                    <el-icon :size="12"><ArrowRight /></el-icon>
                  </span>
                  <span class="recommend-item__title">{{ article.next.title }}</span>
                </RouterLink>
              </nav>
            </div>
          </article>

          <aside v-if="isDesktop" class="article-aside">
            <div class="card toc-card">
              <h3 class="toc-card__title">目录</h3>
              <div class="md-catalog toc-body">
                <MdCatalog
                  :editor-id="previewId"
                  :scroll-element="scrollElement"
                  :scroll-element-offset-top="88"
                  :theme="mdTheme"
                  :catalog-max-depth="3"
                />
              </div>
            </div>

            <div v-if="article.related.length > 0" class="card toc-card">
              <h3 class="toc-card__title">推荐阅读</h3>
              <RouterLink
                v-for="item in article.related"
                :key="item.id"
                :to="`/article/${item.id}`"
                class="toc-related"
              >
                {{ item.title }}
              </RouterLink>
            </div>
          </aside>
        </div>

        <CommentSection target-type="article" :target-id="article.id" title="评论" />
      </div>

      <el-drawer v-model="catalogOpen" direction="rtl" size="78%" title="文章目录">
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

<style scoped>
.article-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.2rem;
  align-items: start;
}

@media (min-width: 1024px) {
  .article-layout {
    grid-template-columns: minmax(0, 1fr) 232px;
    gap: 1.6rem;
  }
}

.article-aside {
  position: sticky;
  top: calc(var(--header-h) + 1rem);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.article-card__inner {
  padding: 1.6rem clamp(1rem, 3vw, 2.6rem) 2rem;
}

.article-catalog-btn {
  display: inline-flex;
  margin-bottom: 1rem;
  padding: 0.35rem 0.9rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--card);
  color: var(--text-2);
  font-size: 0.82rem;
}

@media (min-width: 1024px) {
  .article-catalog-btn {
    display: none;
  }
}

.toc-body {
  max-height: calc(100vh - var(--header-h) - 8rem);
  overflow-y: auto;
}

.toc-related {
  display: block;
  padding: 0.32rem 0;
  color: var(--text-2);
  font-size: 0.86rem;
  line-height: 1.5;
  transition: color 0.2s ease;
}

.toc-related:hover {
  color: var(--primary);
}

.page-header__article {
  max-width: 62%;
  text-align: center;
}

.page-header__tags {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
}

.page-header__tag {
  padding: 0.1rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.45);
  border-radius: 999px;
  color: #fff;
  font-size: 0.78rem;
}

.page-header__title {
  margin-top: 0.6rem;
  color: #fff;
  font-size: clamp(1.5rem, 2.6vw, 2.2rem);
  font-weight: 500;
  line-height: 1.4;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.35);
}

.page-header__meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.9rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.86rem;
}

.page-header__meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.page-header__sep {
  opacity: 0.6;
}

@media (max-width: 768px) {
  .page-header__article {
    max-width: 92%;
  }
}
</style>
