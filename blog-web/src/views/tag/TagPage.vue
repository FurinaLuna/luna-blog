<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { PriceTag } from '@element-plus/icons-vue'
import ArticleCard from '@/components/article/ArticleCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticles } from '@/api/article'
import { useSiteStore } from '@/stores/site'

const PAGE_SIZE = 8

const route = useRoute()
const site = useSiteStore()

const tagId = computed(() => Number(route.params.id))
const page = ref(1)

const tag = computed(() => site.tags.find((item) => item.id === tagId.value) ?? null)

const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
  key: () => ['articles-tag', tagId.value, page.value],
  query: () => getArticles({ tagId: tagId.value, page: page.value, pageSize: PAGE_SIZE }),
  staleTime: 60_000,
})

const list = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

watch(tagId, () => {
  page.value = 1
})
</script>

<template>
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><PriceTag /></el-icon>
        标签
      </p>
      <h1 class="mt-2 flex items-center gap-2 text-3xl font-bold sm:text-4xl">
        <span v-if="tag?.color" class="inline-block h-3 w-3 rounded-full" :style="{ background: tag.color }" aria-hidden="true" />
        {{ tag ? `#${tag.name}` : '标签文章' }}
      </h1>
      <p class="mt-2 text-xs" style="color: var(--text-2)">
        {{ tag ? `共 ${tag.articleCount} 篇文章` : '正在加载标签信息…' }}
      </p>
    </header>

    <div v-if="isLoading" class="mt-8">
      <SkeletonList variant="list" :count="4" />
    </div>

    <EmptyState
      v-else-if="error && list.length === 0"
      class="mt-8"
      icon="error"
      title="标签文章加载失败"
      description="请稍后重试。"
      action-text="重新加载"
      @action="refetch"
    />

    <EmptyState
      v-else-if="list.length === 0"
      class="mt-8"
      icon="inbox"
      title="这个标签下还没有文章"
      description="试试其他标签吧。"
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
