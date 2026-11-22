<script setup lang="ts">
import { computed } from 'vue'
import CoverImage from '@/components/common/CoverImage.vue'
import type { Article } from '@/api/types'
import { formatCompact, formatDate } from '@/utils/format'

const props = defineProps<{ article: Article; index: number }>()

/** 左右交替：偶数行封面在左，奇数行封面在右 */
const reversed = computed(() => props.index % 2 === 1)
const articleLink = computed(() => `/article/${props.article.id}`)

const publishedDate = computed(() =>
  formatDate(props.article.publishedAt || props.article.createdAt),
)
const updatedDate = computed(() => formatDate(props.article.updatedAt))

interface MetaItem {
  key: string
  text: string
  /** top = 置顶（红色强调） */
  tone?: 'top'
}

const metaItems = computed<MetaItem[]>(() => {
  const items: MetaItem[] = []
  if (props.article.isTop) items.push({ key: 'top', text: '置顶', tone: 'top' })
  if (publishedDate.value) items.push({ key: 'published', text: `发表于 ${publishedDate.value}` })
  if (updatedDate.value && updatedDate.value !== publishedDate.value) {
    items.push({ key: 'updated', text: `更新于 ${updatedDate.value}` })
  }
  if (props.article.category) items.push({ key: 'category', text: props.article.category.name })

  const tagNames = props.article.tags.slice(0, 3).map((tag) => tag.name)
  if (tagNames.length > 0) items.push({ key: 'tags', text: tagNames.join('、') })

  items.push({ key: 'likes', text: `点赞 ${formatCompact(props.article.likeCount)}` })
  items.push({ key: 'views', text: `阅读 ${formatCompact(props.article.views)}` })
  return items
})
</script>

<template>
  <article class="home-article" :class="{ 'home-article--reverse': reversed }">
    <RouterLink :to="articleLink" class="home-article__cover" tabindex="-1" aria-hidden="true">
      <CoverImage
        :src="article.cover"
        :alt="article.title"
        :seed="article.title"
        ratio="auto"
        rounded="rounded-none"
      />
    </RouterLink>

    <div class="home-article__info">
      <RouterLink :to="articleLink" class="home-article__title" :title="article.title">
        {{ article.title }}
      </RouterLink>

      <div class="home-article__meta">
        <template v-for="(item, metaIndex) in metaItems" :key="item.key">
          <span v-if="metaIndex > 0" class="home-article__meta-sep" aria-hidden="true">|</span>
          <span
            class="home-article__meta-item"
            :class="{ 'home-article__meta-item--top': item.tone === 'top' }"
          >
            {{ item.text }}
          </span>
        </template>
      </div>

      <p v-if="article.summary" class="home-article__summary">{{ article.summary }}</p>
    </div>
  </article>
</template>
