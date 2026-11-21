<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useQuery } from '@pinia/colada'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getResources } from '@/api/resource'
import type { Resource } from '@/api/types'

const { data, isLoading, error, refetch } = useQuery({
  key: () => ['resources'],
  query: () => getResources(),
  staleTime: 10 * 60_000,
})

interface ResourceGroup {
  category: string
  items: Resource[]
}

const groups = computed<ResourceGroup[]>(() => {
  const map = new Map<string, Resource[]>()
  for (const resource of data.value ?? []) {
    const key = resource.category?.trim() || '其他'
    const bucket = map.get(key) ?? []
    bucket.push(resource)
    map.set(key, bucket)
  }
  return [...map.entries()].map(([category, items]) => ({ category, items }))
})

const total = computed(() => (data.value ?? []).length)

const failedIcons = reactive(new Set<number>())

function markIconFailed(id: number): void {
  failedIcons.add(id)
}
</script>

<template>
  <div>
    <PageHeader title="资源" :subtitle="`收藏的一些工具、站点与读物 · 共 ${total} 个`" />

    <div class="center_box">
      <SkeletonList v-if="isLoading" variant="card" :count="6" />

      <EmptyState
        v-else-if="error && groups.length === 0"
        icon="error"
        title="资源加载失败"
        description="请稍后重试。"
        action-text="重新加载"
        @action="refetch"
      />

      <EmptyState
        v-else-if="groups.length === 0"
        icon="inbox"
        title="还没有整理资源"
        description="收藏夹正在慢慢变好。"
      />

      <div v-else>
        <section v-for="group in groups" :key="group.category" class="resource-group">
          <h2 class="resource-group__title">
            {{ group.category }}
            <span>{{ group.items.length }} 个</span>
          </h2>

          <div class="resource-grid">
            <a
              v-for="item in group.items"
              :key="item.id"
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="resource-card"
            >
              <span class="resource-icon">
                <img
                  v-if="item.icon && !failedIcons.has(item.id)"
                  :src="item.icon"
                  :alt="`${item.name} 图标`"
                  loading="lazy"
                  @error="markIconFailed(item.id)"
                />
                <span v-else aria-hidden="true">{{ item.name.charAt(0) }}</span>
              </span>

              <span class="resource-body">
                <span class="resource-name">{{ item.name }}</span>
                <span class="resource-desc">{{ item.description || item.url }}</span>
              </span>
            </a>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.resource-group {
  margin-bottom: 2rem;
}

.resource-group:last-child {
  margin-bottom: 0;
}
</style>
