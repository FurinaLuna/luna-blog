<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@pinia/colada'
import { ChatDotRound } from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import TalkCard from '@/components/talk/TalkCard.vue'
import { getTalks } from '@/api/talk'

const PAGE_SIZE = 6

const page = ref(1)

const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
  key: () => ['talks', page.value],
  query: () => getTalks({ page: page.value, pageSize: PAGE_SIZE }),
  staleTime: 30_000,
})

const talks = computed(() => data.value?.list ?? [])
const total = computed(() => data.value?.total ?? 0)
</script>

<template>
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><ChatDotRound /></el-icon>
        Talks
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">说说</h1>
      <p class="mt-2 text-sm" style="color: var(--text-2)">
        比文章轻一点、比朋友圈认真一点。共 {{ total }} 条记录。
      </p>
    </header>

    <div v-if="isLoading" class="mt-8 space-y-5">
      <SkeletonList variant="list" :count="3" />
    </div>

    <EmptyState
      v-else-if="error && talks.length === 0"
      class="mt-8"
      icon="error"
      title="说说加载失败"
      description="请稍后重试。"
      action-text="重新加载"
      @action="refetch"
    />

    <EmptyState
      v-else-if="talks.length === 0"
      class="mt-8"
      icon="comment"
      title="还没有说说"
      description="碎碎念正在路上。"
    />

    <div v-else class="mx-auto mt-8 max-w-3xl space-y-5">
      <TalkCard v-for="talk in talks" :key="talk.id" :talk="talk" />
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
