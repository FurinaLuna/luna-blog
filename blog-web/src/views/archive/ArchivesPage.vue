<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@pinia/colada'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getArticleArchives } from '@/api/article'
import { formatDate } from '@/utils/format'

const { data, isLoading, error, refetch } = useQuery({
  key: () => ['article-archives'],
  query: () => getArticleArchives(),
  staleTime: 5 * 60_000,
})

const years = computed(() => data.value ?? [])
const totalArticles = computed(() => years.value.reduce((sum, year) => sum + year.count, 0))
</script>

<template>
  <div>
    <PageHeader
      title="时间轴"
      :subtitle="years.length > 0 ? `共 ${totalArticles} 篇文章 · ${years.length} 个年份` : '把写过的东西串成一条线'"
    />

    <div class="center_box">
      <div class="card timeline-card">
        <div v-if="isLoading" class="timeline-card__loading">
          <SkeletonList variant="list" :count="4" />
        </div>

        <EmptyState
          v-else-if="error && years.length === 0"
          icon="error"
          title="归档加载失败"
          description="请稍后重试。"
          action-text="重新加载"
          @action="refetch"
        />

        <EmptyState
          v-else-if="years.length === 0"
          icon="inbox"
          title="还没有可归档的文章"
          description="等第一篇发布后，这里就会热闹起来。"
        />

        <div v-else class="timeline">
          <section v-for="year in years" :key="year.year" class="timeline-year-block" :aria-label="`${year.year} 年归档`">
            <h2 class="timeline-year">{{ year.year }}</h2>

            <div v-for="month in year.months" :key="month.month" class="timeline-month-block">
              <p class="timeline-month">
                {{ month.month }} 月
                <span>{{ month.count }} 篇</span>
              </p>

              <ul class="timeline-list">
                <li v-for="article in month.articles" :key="article.id" class="timeline-item">
                  <RouterLink :to="`/article/${article.id}`" class="timeline-item__link">
                    <span class="timeline-item__date">{{ formatDate(article.createdAt).slice(5) }}</span>
                    <span class="timeline-item__title">{{ article.title }}</span>
                  </RouterLink>
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-card {
  padding: 2.6rem clamp(1.2rem, 4vw, 3.2rem);
}

.timeline-card__loading {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.timeline-year-block + .timeline-year-block {
  margin-top: 2rem;
}

.timeline-month-block {
  margin-top: 1rem;
}

.timeline-list {
  margin-top: 0.2rem;
}

.timeline-item {
  list-style: none;
}

.timeline-item__link {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.28rem 0.4rem;
  border-radius: 6px;
  transition: background-color 0.2s ease;
}

.timeline-item__link:hover {
  background: var(--bg-soft);
}

.timeline-item__date {
  flex: 0 0 4rem;
  color: var(--meta-color);
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
}

.timeline-item__title {
  color: var(--font-color);
  font-size: 0.92rem;
  transition: color 0.2s ease;
}

.timeline-item__link:hover .timeline-item__title {
  color: var(--primary);
}
</style>
