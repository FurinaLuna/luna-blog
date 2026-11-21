<script setup lang="ts">
import { computed, reactive } from 'vue'
import { useQuery } from '@pinia/colada'
import { Link, Share } from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
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
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><Share /></el-icon>
        Resources
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">资源</h1>
      <p class="mt-2 text-sm" style="color: var(--text-2)">
        收藏的一些工具、站点与读物，共 {{ total }} 个。
      </p>
    </header>

    <div v-if="isLoading" class="mt-8">
      <SkeletonList variant="card" :count="6" />
    </div>

    <EmptyState
      v-else-if="error && groups.length === 0"
      class="mt-8"
      icon="error"
      title="资源加载失败"
      description="请稍后重试。"
      action-text="重新加载"
      @action="refetch"
    />

    <EmptyState
      v-else-if="groups.length === 0"
      class="mt-8"
      icon="inbox"
      title="还没有整理资源"
      description="收藏夹正在慢慢变好。"
    />

    <div v-else class="mt-8 space-y-10">
      <section v-for="group in groups" :key="group.category">
        <div class="flex items-center gap-3">
          <h2 class="text-lg font-bold">{{ group.category }}</h2>
          <span class="text-xs" style="color: var(--text-2)">{{ group.items.length }} 个</span>
          <span class="h-px flex-1" style="background: var(--border)" />
        </div>

        <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <a
            v-for="item in group.items"
            :key="item.id"
            :href="item.url"
            target="_blank"
            rel="noopener noreferrer"
            class="card card-hover group flex items-start gap-3 p-4"
          >
            <img
              v-if="item.icon && !failedIcons.has(item.id)"
              :src="item.icon"
              :alt="`${item.name} 图标`"
              class="h-10 w-10 shrink-0 rounded-lg border object-cover"
              style="border-color: var(--border)"
              loading="lazy"
              @error="markIconFailed(item.id)"
            />
            <span
              v-else
              class="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-sm font-bold"
              style="background: var(--brand-soft); color: var(--brand)"
              aria-hidden="true"
            >
              {{ item.name.charAt(0) }}
            </span>

            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-1">
                <span class="truncate text-sm font-semibold transition-colors group-hover:text-[var(--brand)]">
                  {{ item.name }}
                </span>
                <el-icon :size="12" class="shrink-0" style="color: var(--text-2)"><Link /></el-icon>
              </span>
              <span class="mt-1 line-clamp-2 block text-xs leading-relaxed" style="color: var(--text-2)">
                {{ item.description || item.url }}
              </span>
            </span>
          </a>
        </div>
      </section>
    </div>
  </div>
</template>
