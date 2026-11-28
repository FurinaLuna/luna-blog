<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useQuery } from '@pinia/colada'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getResources } from '@/api/resource'
import type { Resource } from '@/api/types'

const PAGE_SIZE = 12

const { data, isLoading, error, refetch } = useQuery({
  key: () => ['resources'],
  query: () => getResources(),
  staleTime: 10 * 60_000,
})

const items = computed<Resource[]>(() => data.value ?? [])
const total = computed(() => items.value.length)

const ALL = '全部'
const activeCategory = ref<string>(ALL)
const page = ref(1)

/** 分类 → 数量，用于顶部筛选胶囊 */
const categories = computed<{ name: string; count: number }[]>(() => {
  const map = new Map<string, number>()
  for (const item of items.value) {
    const key = item.category?.trim() || '其他'
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [{ name: ALL, count: total.value }, ...[...map.entries()].map(([name, count]) => ({ name, count }))]
})

const filtered = computed<Resource[]>(() =>
  activeCategory.value === ALL
    ? items.value
    : items.value.filter((item) => (item.category?.trim() || '其他') === activeCategory.value),
)

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))

const paged = computed<Resource[]>(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})

function selectCategory(name: string): void {
  if (activeCategory.value === name) return
  activeCategory.value = name
  page.value = 1
}

function changePage(value: number): void {
  page.value = Math.min(Math.max(1, value), pageCount.value)
  document.querySelector('.resource-filter')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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
        v-else-if="error && items.length === 0"
        icon="error"
        title="资源加载失败"
        description="请稍后重试。"
        action-text="重新加载"
        @action="refetch"
      />

      <EmptyState
        v-else-if="items.length === 0"
        icon="inbox"
        title="还没有整理资源"
        description="收藏夹正在慢慢变好。"
      />

      <template v-else>
        <div v-if="categories.length > 2" class="resource-filter">
          <button
            v-for="category in categories"
            :key="category.name"
            type="button"
            class="resource-filter__chip"
            :class="{ 'is-active': activeCategory === category.name }"
            @click="selectCategory(category.name)"
          >
            {{ category.name }}
            <span>{{ category.count }}</span>
          </button>
        </div>

        <div class="resource-grid">
          <a
            v-for="item in paged"
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
                decoding="async"
                @error="markIconFailed(item.id)"
              />
              <span v-else aria-hidden="true">{{ item.name.charAt(0) }}</span>
            </span>

            <span class="resource-body">
              <span class="resource-name">
                {{ item.name }}
                <span class="resource-tag">{{ item.category?.trim() || '其他' }}</span>
              </span>
              <span class="resource-desc">{{ item.description || item.url }}</span>
            </span>
          </a>
        </div>

        <Pagination :page="page" :total="filtered.length" :page-size="PAGE_SIZE" @update:page="changePage" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.resource-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1.1rem;
}

.resource-filter__chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.3rem 0.85rem;
  color: var(--font-color);
  font-size: 0.82rem;
  background: var(--bg-soft);
  border: 1px solid transparent;
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease,
    border-color 0.2s ease;
}

.resource-filter__chip span {
  color: var(--meta-color);
  font-size: 0.72rem;
}

.resource-filter__chip:hover {
  border-color: var(--primary);
}

.resource-filter__chip.is-active {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}

.resource-filter__chip.is-active span {
  color: rgb(255 255 255 / 78%);
}

.resource-tag {
  padding: 0.02rem 0.4rem;
  color: var(--primary);
  font-size: 0.68rem;
  font-weight: 400;
  background: var(--primary-soft, rgb(73 177 245 / 14%));
  border-radius: 999px;
}
</style>
