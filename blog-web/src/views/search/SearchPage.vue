<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { Search } from '@element-plus/icons-vue'
import ArticleCard from '@/components/article/ArticleCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticles } from '@/api/article'

const PAGE_SIZE = 9

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
  <div>
    <PageHeader title="搜索" subtitle="在标题与摘要里找找看" />

    <div class="center_box">
      <div class="search-bar">
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
        <button type="button" class="apply-button search-bar__btn" @click="submit">
          <el-icon :size="15"><Search /></el-icon>
          搜索
        </button>
      </div>

      <EmptyState
        v-if="!submittedKeyword"
        class="search-empty"
        icon="search"
        title="输入关键词开始搜索"
        description="可以搜索文章标题、摘要中的词，比如「Vue」「随笔」。"
      />

      <template v-else>
        <p class="search-summary">
          关于
          <span class="search-summary__keyword">「{{ submittedKeyword }}」</span>
          找到 <strong>{{ total }}</strong> 篇文章
        </p>

        <SkeletonList v-if="isLoading" variant="card" :count="6" />

        <EmptyState
          v-else-if="error && list.length === 0"
          icon="error"
          title="搜索失败"
          description="请检查网络后重试。"
          action-text="重新搜索"
          @action="refetch"
        />

        <EmptyState
          v-else-if="list.length === 0"
          icon="search"
          title="没有找到相关文章"
          description="换个词试试，或者看看首页的最新内容。"
          action-text="回到首页"
          @action="router.push('/')"
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
      </template>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  gap: 0.8rem;
  align-items: stretch;
}

.search-bar :deep(.el-input) {
  flex: 1;
}

.search-bar__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  flex: 0 0 auto;
}

.search-summary {
  margin: 1.2rem 0;
  color: var(--meta-color);
  font-size: 0.92rem;
}

.search-summary__keyword {
  color: var(--font-color);
  font-weight: 600;
}

.search-summary strong {
  color: var(--primary);
  font-variant-numeric: tabular-nums;
}

.search-empty {
  margin-top: 2rem;
}
</style>
