<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import ArticleTile from '@/components/article/ArticleTile.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticles } from '@/api/article'
import { useSiteStore } from '@/stores/site'
import { setPageMeta } from '@/utils/seo'

const PAGE_SIZE = 4

const route = useRoute()
const site = useSiteStore()

const categoryId = computed(() => Number(route.params.id))
const page = ref(1)

const category = computed(() => site.categories.find((item) => item.id === categoryId.value) ?? null)

/** 分类信息就绪后把真实分类名写进页面 meta（SEO） */
watch(
  category,
  (current) => {
    if (!current) return
    setPageMeta({ title: current.name, description: current.description ?? undefined })
  },
  { immediate: true },
)

const { data, isLoading, error, refetch } = useQuery({
  key: () => ['articles-category', categoryId.value, page.value],
  query: () => getArticles({ categoryId: categoryId.value, page: page.value, pageSize: PAGE_SIZE }),
  staleTime: 60_000,
})

const list = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

const subtitle = computed(() => {
  if (!category.value) return '正在加载分类信息…'
  return category.value.description || `共 ${category.value.articleCount} 篇文章`
})

watch(categoryId, () => {
  page.value = 1
})
</script>

<template>
  <div>
    <PageHeader :title="category?.name ?? '分类'" :subtitle="subtitle" />

    <div class="center_box">
      <div class="card article-list-panel">
        <div class="article-list-panel__head">
          <span class="article-list-panel__type">分类 - {{ category?.name ?? '…' }}</span>
          <span class="article-list-panel__total">文章总数：{{ total }}</span>
        </div>

        <SkeletonList v-if="isLoading" variant="card" :count="4" />

        <EmptyState
          v-else-if="error && list.length === 0"
          icon="error"
          title="分类文章加载失败"
          description="请稍后重试。"
          action-text="重新加载"
          @action="refetch"
        />

        <EmptyState
          v-else-if="list.length === 0"
          icon="inbox"
          title="这个分类还没有文章"
          description="换个分类看看，或者期待一下新内容。"
        />

        <div v-else class="article-tile-grid">
          <ArticleTile v-for="item in list" :key="item.id" :article="item" />
        </div>
      </div>

      <Pagination
        :page="page"
        :total="total"
        :page-size="PAGE_SIZE"
        @update:page="page = $event"
      />
    </div>
  </div>
</template>
