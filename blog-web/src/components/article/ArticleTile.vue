<script setup lang="ts">
import CoverImage from '@/components/common/CoverImage.vue'
import type { Article } from '@/api/types'
import { formatArchiveTime } from '@/utils/format'

defineProps<{ article: Article }>()
</script>

<template>
  <RouterLink
    class="article-tile"
    :to="`/article/${article.id}`"
    :aria-label="`阅读《${article.title}》`"
  >
    <CoverImage
      class="article-tile__cover"
      :src="article.cover"
      :alt="article.title"
      :seed="article.title"
      ratio="16 / 9"
      rounded="rounded-[8px]"
      plain-fallback
    />
    <h3 class="article-tile__title">{{ article.title }}</h3>
    <p class="article-tile__time">{{ formatArchiveTime(article.publishedAt) }}</p>
  </RouterLink>
</template>
