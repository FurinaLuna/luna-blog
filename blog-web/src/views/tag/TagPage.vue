<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import ArticleCard from '@/components/article/ArticleCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticles } from '@/api/article'
import { useSiteStore } from '@/stores/site'

const PAGE_SIZE = 9

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

const title = computed(() => (tag.value ? `#${tag.value.name}` : '标签'))
const subtitle = computed(() =>
  tag.value ? `共 ${tag.value.articleCount} 篇文章` : '正在加载标签信息…',
)

watch(tagId, () => {
  page.value = 1
})
</script>

<template>
  <div>
    <PageHeader :title="title" :subtitle="subtitle" />

    <div class="center_box">
      <SkeletonList v-if="isLoading" variant="card" :count="6" />

      <EmptyState
        v-else-if="error && list.length === 0"
        icon="error"
        title="标签文章加载失败"
        description="请稍后重试。"
        action-text="重新加载"
        @action="refetch"
      />

      <EmptyState
        v-else-if="list.length === 0"
        icon="inbox"
        title="这个标签下还没有文章"
        description="试试其他标签吧。"
      />

      <div v-else class="post-grid">
        <ArticleCard v-for="item in list" :key="item.id" :article="item" />
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
