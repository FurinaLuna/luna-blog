<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@pinia/colada'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
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
  <div>
    <PageHeader
      title="说说"
      :subtitle="talks.length > 0 ? `比文章轻一点，比朋友圈认真一点 · 共 ${total} 条` : '比文章轻一点，比朋友圈认真一点'"
    />

    <div class="center_box">
      <div class="card talk-list-card">
        <div v-if="isLoading" class="talk-list-card__loading">
          <SkeletonList variant="list" :count="3" />
        </div>

        <EmptyState
          v-else-if="error && talks.length === 0"
          icon="error"
          title="说说加载失败"
          description="请稍后重试。"
          action-text="重新加载"
          @action="refetch"
        />

        <EmptyState
          v-else-if="talks.length === 0"
          icon="comment"
          title="还没有说说"
          description="碎碎念正在路上。"
        />

        <div v-else class="talk-list">
          <TalkCard v-for="talk in talks" :key="talk.id" :talk="talk" />
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

<style scoped>
.talk-list-card {
  padding: 2.4rem clamp(1.2rem, 4vw, 3rem);
}

.talk-list-card__loading {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
