<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useSiteStore } from '@/stores/site'
import type { Tag } from '@/api/types'

const site = useSiteStore()

const tags = computed(() => site.tags)

interface CloudItem {
  id: number
  name: string
  count: number
  size: string
  color: string
}

/**
 * 标签云：字号按文章数分档（1 篇最小、越多越大），颜色优先用标签自带颜色，
 * 没配颜色时按 id 稳定哈希取色相，刷新不会跳变。
 */
const cloud = computed<CloudItem[]>(() => {
  const max = Math.max(1, ...tags.value.map((tag: Tag) => tag.articleCount))
  return tags.value.map((tag: Tag) => {
    const weight = Math.min(1, tag.articleCount / max)
    const size = `${(0.95 + weight * 1.05).toFixed(2)}rem`
    const fallback = `hsl(${(tag.id * 137) % 360}deg 62% 48%)`
    return {
      id: tag.id,
      name: tag.name,
      count: tag.articleCount,
      size,
      color: tag.color?.trim() || fallback,
    }
  })
})
</script>

<template>
  <div>
    <PageHeader title="标签" subtitle="全部标签，字号越大文章越多" />

    <div class="center_box">
      <section class="card category-cloud">
        <h2 class="category-cloud__total">标签 - {{ tags.length }}</h2>

        <EmptyState
          v-if="tags.length === 0"
          icon="inbox"
          title="还没有标签"
          description="给文章打上标签后就会出现在这里。"
        />

        <div v-else class="category-cloud__list">
          <RouterLink
            v-for="item in cloud"
            :key="item.id"
            class="category-cloud__item"
            :style="{ fontSize: item.size, color: item.color }"
            :to="`/tag/${item.id}`"
            :title="`${item.name}（${item.count} 篇）`"
          >
            #{{ item.name }}
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>
