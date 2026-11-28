<script setup lang="ts">
import { computed } from 'vue'
import { Calendar, ChatDotRound, View } from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import type { Article } from '@/api/types'
import { formatCompact, formatDate } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    article: Article
    /** card = 首页 3 列网格卡；list = 分类/标签/搜索的横向列表卡 */
    variant?: 'card' | 'list' | 'feature'
  }>(),
  { variant: 'card' },
)

const articleLink = computed(() => `/article/${props.article.id}`)
const publishedLabel = computed(() =>
  formatDate(props.article.publishedAt || props.article.createdAt),
)
</script>

<template>
  <article :class="['post-card', variant === 'list' ? 'post-card--row' : '']">
    <RouterLink :to="articleLink" class="post-card__cover" tabindex="-1" aria-hidden="true">
      <CoverImage
        :src="article.cover"
        use-site-default
        :alt="article.title"
        :seed="article.title"
        ratio="16 / 9"
        rounded="rounded-none"
      />
      <span v-if="article.category" class="post-card__tag">{{ article.category.name }}</span>
    </RouterLink>

    <div class="post-card__body">
      <div class="post-card__titles">
        <span v-if="article.isTop" class="badge-accent">置顶</span>
        <RouterLink :to="articleLink" class="post-card__title">{{ article.title }}</RouterLink>
        <p v-if="article.summary" class="post-card__summary">{{ article.summary }}</p>
      </div>

      <div class="post-card__meta">
        <span class="post-card__meta-item">
          <el-icon :size="13"><Calendar /></el-icon>{{ publishedLabel }}
        </span>
        <span class="post-card__sep" aria-hidden="true">|</span>
        <span class="post-card__meta-item">
          <el-icon :size="13"><View /></el-icon>{{ formatCompact(article.views) }}
        </span>
        <span class="post-card__sep" aria-hidden="true">|</span>
        <span class="post-card__meta-item">
          <el-icon :size="13"><ChatDotRound /></el-icon>{{ article.commentCount }}
        </span>
        <span class="post-card__meta-item post-card__read">{{ article.readingTime }} 分钟</span>
      </div>
    </div>
  </article>
</template>

<style scoped>
.post-card--row {
  flex-direction: row;
  align-items: stretch;
}

.post-card--row .post-card__cover {
  width: 34%;
  max-width: 260px;
  flex-shrink: 0;
  aspect-ratio: auto;
}

.post-card--row .post-card__body {
  justify-content: center;
}

.post-card__titles {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  align-items: flex-start;
}

.post-card__read {
  margin-left: auto;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .post-card--row {
    flex-direction: column;
  }

  .post-card--row .post-card__cover {
    width: 100%;
    max-width: none;
    aspect-ratio: 16 / 9;
  }

  .post-card__read {
    display: none;
  }
}
</style>
