<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useQuery } from '@pinia/colada'
import { ArrowDown } from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticleArchives } from '@/api/article'
import type { ArchiveArticle, ArchiveYear } from '@/api/types'
import { formatArchiveTime } from '@/utils/format'

const { data, isLoading, error, refetch } = useQuery({
  key: () => ['article-archives'],
  query: () => getArticleArchives(),
  staleTime: 5 * 60_000,
})

const years = computed<ArchiveYear[]>(() => data.value ?? [])
const totalArticles = computed(() => years.value.reduce((sum, year) => sum + year.count, 0))

/** 展开的年份：默认只展开最近一年，历史年份折叠成一行，避免时间轴无限拉长 */
const expandedYears = ref<Set<number>>(new Set())

watch(
  years,
  (list) => {
    const known = new Set(list.map((year) => year.year))
    const next = new Set([...expandedYears.value].filter((year) => known.has(year)))
    if (next.size === 0 && list.length > 0) next.add(list[0].year)
    expandedYears.value = next
  },
  { immediate: true },
)

const allExpanded = computed(
  () => years.value.length > 0 && years.value.every((year) => expandedYears.value.has(year.year)),
)

function isExpanded(year: number): boolean {
  return expandedYears.value.has(year)
}

function toggleYear(year: number): void {
  const next = new Set(expandedYears.value)
  if (next.has(year)) next.delete(year)
  else next.add(year)
  expandedYears.value = next
}

function toggleAll(): void {
  expandedYears.value = allExpanded.value ? new Set() : new Set(years.value.map((year) => year.year))
}

/** 把「按年 → 按月」的分组摊平成一条时间线，最近的在最上面 */
function flattenYear(year: ArchiveYear): ArchiveArticle[] {
  return year.months.flatMap((month) => month.articles)
}
</script>

<template>
  <div>
    <PageHeader
      title="时间轴"
      :subtitle="
        years.length > 0
          ? `共 ${totalArticles} 篇文章 · ${years.length} 个年份`
          : '把写过的东西串成一条线'
      "
    />

    <div class="center_box">
      <div class="card timeline-card">
        <div v-if="isLoading" class="timeline-card__loading">
          <SkeletonList variant="list" :count="4" />
        </div>

        <EmptyState
          v-else-if="error && years.length === 0"
          icon="error"
          title="时间轴加载失败"
          description="请稍后重试。"
          action-text="重新加载"
          @action="refetch"
        />

        <EmptyState
          v-else-if="years.length === 0"
          icon="inbox"
          title="还没有发布文章"
          description="等第一篇发布后，这里就会热闹起来。"
        />

        <div v-else class="timeline">
          <div v-if="years.length > 1" class="timeline-toolbar">
            <button type="button" class="timeline-toolbar__btn" @click="toggleAll">
              {{ allExpanded ? '收起全部年份' : '展开全部年份' }}
            </button>
          </div>

          <section
            v-for="year in years"
            :key="year.year"
            class="timeline-year"
            :class="{ 'is-collapsed': !isExpanded(year.year) }"
            :aria-label="`${year.year} 年`"
          >
            <button
              type="button"
              class="timeline-year__head"
              :aria-expanded="isExpanded(year.year)"
              @click="toggleYear(year.year)"
            >
              <span class="timeline-year__title">{{ year.year }}</span>
              <span class="timeline-year__count">{{ year.count }} 篇</span>
              <el-icon class="timeline-year__chevron"><ArrowDown /></el-icon>
            </button>

            <ul v-if="isExpanded(year.year)" class="timeline-list">
              <li v-for="article in flattenYear(year)" :key="article.id" class="timeline-item">
                <RouterLink :to="`/article/${article.id}`" class="timeline-link">
                  <span class="timeline-dot" aria-hidden="true"></span>
                  <CoverImage
                    class="timeline-cover"
                    :src="article.cover ?? null"
                    :alt="article.title"
                    :seed="article.title"
                    ratio="1 / 1"
                    rounded="rounded-[6px]"
                    plain-fallback
                  />
                  <span class="timeline-body">
                    <span class="timeline-title">{{ article.title }}</span>
                    <span class="timeline-date">{{ formatArchiveTime(article.createdAt) }}</span>
                  </span>
                </RouterLink>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-card {
  padding: 2.2rem clamp(1rem, 3.6vw, 2.8rem);
}

.timeline-card__loading {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-year + .timeline-year {
  margin-top: 1.1rem;
}

.timeline-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.4rem;
}

.timeline-toolbar__btn {
  padding: 0.25rem 0.7rem;
  color: var(--meta-color);
  font-size: 0.8rem;
  background: var(--bg-soft);
  border: 1px solid var(--border);
  border-radius: 999px;
  cursor: pointer;
  transition:
    color 0.2s ease,
    border-color 0.2s ease;
}

.timeline-toolbar__btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}

.timeline-year__head {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: 100%;
  padding: 0.3rem 0;
  background: none;
  border: 0;
  cursor: pointer;
  text-align: left;
}

.timeline-year__head:hover .timeline-year__title {
  opacity: 0.78;
}

.timeline-year__count {
  padding: 0.05rem 0.5rem;
  color: var(--meta-color);
  font-size: 0.75rem;
  background: var(--bg-soft);
  border-radius: 999px;
}

.timeline-year__chevron {
  margin-left: auto;
  color: var(--meta-color);
  font-size: 0.9rem;
  transition: transform 0.25s ease;
}

.timeline-year.is-collapsed .timeline-year__chevron {
  transform: rotate(-90deg);
}

.timeline-year__title {
  margin: 0;
  color: var(--primary);
  font-size: 1.45rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  transition: opacity 0.2s ease;
}

.timeline-list {
  position: relative;
  margin: 0.6rem 0 0;
  padding-left: 2.1rem;
  list-style: none;
}

/* 竖线：主色压到很淡，贴近原型的浅蓝细线 */
.timeline-list::before {
  position: absolute;
  top: 0.7rem;
  bottom: 0.7rem;
  left: 0.3rem;
  width: 2px;
  background: var(--primary);
  border-radius: 2px;
  content: '';
  opacity: 0.22;
}

.timeline-item + .timeline-item {
  margin-top: 0.15rem;
}

.timeline-link {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.95rem;
  padding: 0.55rem 0.6rem;
  border-radius: 8px;
  transition: background-color 0.2s ease;
}

.timeline-link:hover {
  background: var(--bg-soft);
}

.timeline-dot {
  position: absolute;
  top: 50%;
  left: -1.96rem;
  width: 0.55rem;
  height: 0.55rem;
  background: var(--card-bg);
  border: 2px solid var(--primary);
  border-radius: 50%;
  transform: translateY(-50%);
  transition: background-color 0.2s ease;
}

.timeline-link:hover .timeline-dot {
  background: var(--primary);
}

.timeline-cover {
  flex: 0 0 3.4rem;
  width: 3.4rem;
  height: 3.4rem;
  overflow: hidden;
  border-radius: 6px;
}

.timeline-body {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  min-width: 0;
}

.timeline-title {
  overflow: hidden;
  color: var(--font-color);
  font-size: 0.95rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.2s ease;
}

.timeline-link:hover .timeline-title {
  color: var(--primary);
}

.timeline-date {
  color: var(--meta-color);
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 640px) {
  .timeline-card {
    padding: 1.4rem 1rem;
  }

  .timeline-list {
    padding-left: 1.7rem;
  }

  .timeline-dot {
    left: -1.55rem;
  }

  .timeline-cover {
    flex-basis: 2.8rem;
    width: 2.8rem;
    height: 2.8rem;
  }

  .timeline-title {
    font-size: 0.9rem;
  }
}
</style>
