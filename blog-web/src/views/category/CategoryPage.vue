<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { Collection } from '@element-plus/icons-vue'
import ArticleCard from '@/components/article/ArticleCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticles } from '@/api/article'
import { useSiteStore } from '@/stores/site'

const PAGE_SIZE = 8

const route = useRoute()
const site = useSiteStore()

const categoryId = computed(() => Number(route.params.id))
const page = ref(1)

const category = computed(() => site.categories.find((item) => item.id === categoryId.value) ?? null)

const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
  key: () => ['articles-category', categoryId.value, page.value],
  query: () => getArticles({ categoryId: categoryId.value, page: page.value, pageSize: PAGE_SIZE }),
  staleTime: 60_000,
})

const list = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

watch(categoryId, () => {
  page.value = 1
})
</script>

<template>
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><Collection /></el-icon>
        分类
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">{{ category?.name ?? '分类文章' }}</h1>
      <p v-if="category?.description" class="mt-2 max-w-2xl text-sm leading-relaxed" style="color: var(--text-2)">
        {{ category.description }}
      </p>
      <p class="mt-2 text-xs" style="color: var(--text-2)">
        {{ category ? `共 ${category.articleCount} 篇文章` : '正在加载分类信息…' }}
      </p>
    </header>

    <div v-if="isLoading" class="mt-8">
      <SkeletonList variant="list" :count="4" />
    </div>

    <EmptyState
      v-else-if="error && list.length === 0"
      class="mt-8"
      icon="error"
      title="分类文章加载失败"
      description="请稍后重试。"
      action-text="重新加载"
      @action="refetch"
    />

    <EmptyState
      v-else-if="list.length === 0"
      class="mt-8"
      icon="inbox"
      title="这个分类还没有文章"
      description="换个分类看看，或者期待一下新内容。"
    />

    <div v-else class="mt-8 space-y-4">
      <ArticleCard v-for="item in list" :key="item.id" :article="item" />
    </div>

    <Pagination
      :page="page"
      :total="total"
      :page-size="PAGE_SIZE"
      class="mt-8"
      @update:page="page = $event"
    />
  </div>
</template>
