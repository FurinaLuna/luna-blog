<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { Reading } from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import { getRecommendArticles } from '@/api/article'
import type { Article } from '@/api/types'
import { formatDate } from '@/utils/format'

const items = ref<Article[]>([])

onMounted(() => {
  void load()
})

/** 只展示后台勾了「推荐」的文章；没有推荐或接口失败时整张卡不渲染 */
async function load(): Promise<void> {
  try {
    const list = await getRecommendArticles(8)
    items.value = list.slice(0, 5)
  } catch {
    items.value = []
  }
}

function itemLink(id: number): string {
  return `/article/${id}`
}

function itemDate(item: Article): string {
  return formatDate(item.publishedAt || item.createdAt)
}
</script>

<template>
  <section v-if="items.length > 0" class="card side-card home-side-card">
    <div class="card-title">
      <el-icon :size="16"><Reading /></el-icon>
      <span>推荐阅读</span>
    </div>

    <ul class="home-recommend">
      <li v-for="item in items" :key="item.id">
        <RouterLink :to="itemLink(item.id)" class="home-recommend__item">
          <span class="home-recommend__thumb">
            <CoverImage
              :src="item.cover"
              use-site-default
              :alt="item.title"
              :seed="item.title"
              ratio="5 / 4"
              rounded="rounded-none"
            />
          </span>
          <span class="home-recommend__body">
            <span class="home-recommend__title" :title="item.title">{{ item.title }}</span>
            <span class="home-recommend__date">{{ itemDate(item) }}</span>
          </span>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>
