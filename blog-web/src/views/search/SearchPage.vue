<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { Search } from '@element-plus/icons-vue'
import ArticleCard from '@/components/article/ArticleCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticles } from '@/api/article'

const PAGE_SIZE = 10

const route = useRoute()
const router = useRouter()

const keyword = ref(typeof route.query.keyword === 'string' ? route.query.keyword : '')
const page = ref(1)

const submittedKeyword = computed(() =>
  typeof route.query.keyword === 'string' ? route.query.keyword.trim() : '',
)

const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
  key: () => ['articles-search', submittedKeyword.value, page.value],
  query: () =>
    getArticles({
      keyword: submittedKeyword.value || undefined,
      page: page.value,
      pageSize: PAGE_SIZE,
    }),
  staleTime: 30_000,
})

const list = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)

function submit(): void {
  const value = keyword.value.trim()
  page.value = 1
  void router.push({ path: '/search', query: value ? { keyword: value } : {} })
}

watch(
  () => route.query.keyword,
  (value) => {
    keyword.value = typeof value === 'string' ? value : ''
    page.value = 1
  },
)

onMounted(() => {
  void nextTick(() => {
    document.getElementById('page-search-input')?.focus()
  })
})
</script>

<template>
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><Search /></el-icon>
        Search
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">搜索</h1>
      <p class="mt-2 text-sm" style="color: var(--text-2)">在标题与摘要里找找看。</p>
    </header>

    <div class="mt-6 flex flex-col gap-3 sm:flex-row">
      <el-input
        id="page-search-input"
        v-model="keyword"
        size="large"
        placeholder="输入关键词，回车搜索"
        clearable
        maxlength="60"
        aria-label="搜索关键词"
        @keyup.enter="submit"
      />
      <button type="button" class="btn btn-primary shrink-0 sm:w-32" @click="submit">
        搜索
      </button>
    </div>

    <div v-if="!submittedKeyword" class="mt-8">
      <EmptyState
        icon="search"
        title="输入关键词开始搜索"
        description="可以搜索文章标题、摘要中的词，比如「Vue」「随笔」。"
      />
    </div>

    <template v-else>
      <p class="mt-6 text-sm" style="color: var(--text-2)">
        关于
        <span class="font-semibold" style="color: var(--text)">「{{ submittedKeyword }}」</span>
        找到 <span class="font-semibold tabular-nums" style="color: var(--brand)">{{ total }}</span> 篇文章
      </p>

      <div v-if="isLoading" class="mt-6">
        <SkeletonList variant="list" :count="4" />
      </div>

      <EmptyState
        v-else-if="error && list.length === 0"
        class="mt-6"
        icon="error"
        title="搜索失败"
        description="请检查网络后重试。"
        action-text="重新搜索"
        @action="refetch"
      />

      <EmptyState
        v-else-if="list.length === 0"
        class="mt-6"
        icon="search"
        title="没有找到相关文章"
        description="换个词试试，或者看看首页的最新内容。"
        action-text="回到首页"
        @action="router.push('/')"
      />

      <div v-else class="mt-6 space-y-4">
        <ArticleCard v-for="item in list" :key="item.id" :article="item" />
      </div>

      <Pagination
        :page="page"
        :total="total"
        :page-size="PAGE_SIZE"
        class="mt-8"
        @update:page="page = $event"
      />
    </template>
  </div>
</template>
