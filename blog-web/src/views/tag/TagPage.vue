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

const tagId = computed(() => Number(route.params.id))
const page = ref(1)

const tag = computed(() => site.tags.find((item) => item.id === tagId.value) ?? null)

/** 标签信息就绪后把真实标签名写进页面 meta（SEO） */
watch(
  tag,
  (current) => {
    if (!current) return
    setPageMeta({ title: current.name, description: `共 ${current.articleCount} 篇文章` })
  },
  { immediate: true },
)

const { data, isLoading, error, refetch } = useQuery({
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
      <div class="card article-list-panel">
        <div class="article-list-panel__head">
          <span class="article-list-panel__type">标签 - {{ tag?.name ?? '…' }}</span>
          <span class="article-list-panel__total">文章总数：{{ total }}</span>
        </div>

        <SkeletonList v-if="isLoading" variant="card" :count="4" />

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
