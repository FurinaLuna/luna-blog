<script setup lang="ts">
import { computed } from 'vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import { useSiteStore } from '@/stores/site'
import type { Category } from '@/api/types'

const site = useSiteStore()

const categories = computed(() => site.categories)

interface CloudItem {
  id: number
  name: string
  count: number
  size: string
  color: string
}

/** 按分类 id 做稳定哈希：字号 0.95–2.2rem、色相均分，刷新不会跳变 */
function hashOf(value: number): number {
  let hash = value * 2654435761
  hash ^= hash >>> 13
  return Math.abs(hash % 997)
}

const cloud = computed<CloudItem[]>(() =>
  categories.value.map((category: Category) => {
    const hash = hashOf(category.id)
    return {
      id: category.id,
      name: category.name,
      count: category.articleCount,
      size: `${(0.95 + (hash % 9) * 0.16).toFixed(2)}rem`,
      color: `hsl(${hash % 360}deg 62% 48%)`,
    }
  }),
)
</script>

<template>
  <div>
    <PageHeader title="分类" subtitle="按主题浏览文章" />

    <div class="center_box">
      <section class="card category-cloud">
        <h2 class="category-cloud__total">分类 - {{ categories.length }}</h2>

        <EmptyState
          v-if="categories.length === 0"
          icon="inbox"
          title="还没有分类"
          description="等第一篇文章分类归档后就会出现在这里。"
        />

        <div v-else class="category-cloud__list">
          <RouterLink
            v-for="item in cloud"
            :key="item.id"
            class="category-cloud__item"
            :style="{ fontSize: item.size, color: item.color }"
            :to="`/category/${item.id}`"
            :title="`${item.name}（${item.count} 篇）`"
          >
            {{ item.name }}
          </RouterLink>
        </div>
      </section>
    </div>
  </div>
</template>
