<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@pinia/colada'
import { Calendar, CollectionTag } from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
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
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><CollectionTag /></el-icon>
        Archives
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">归档</h1>
      <p class="mt-2 text-sm" style="color: var(--text-2)">
        时间会把写过的东西串成一条线。共 {{ totalArticles }} 篇文章，{{ years.length }} 个年份。
      </p>
    </header>

    <div v-if="isLoading" class="mt-8 space-y-4">
      <SkeletonList variant="list" :count="4" />
    </div>

    <EmptyState
      v-else-if="error && years.length === 0"
      class="mt-8"
      icon="error"
      title="归档加载失败"
      description="请稍后重试。"
      action-text="重新加载"
      @action="refetch"
    />

    <EmptyState
      v-else-if="years.length === 0"
      class="mt-8"
      icon="inbox"
      title="还没有可归档的文章"
      description="等第一篇发布后，这里就会热闹起来。"
    />

    <div v-else class="mt-10 space-y-12">
      <section v-for="year in years" :key="year.year" :aria-label="`${year.year} 年归档`">
        <div class="flex items-center gap-3">
          <h2 class="text-2xl font-bold tabular-nums">{{ year.year }}</h2>
          <span class="text-xs" style="color: var(--text-2)">{{ year.count }} 篇</span>
          <span class="h-px flex-1" style="background: var(--border)" />
        </div>

        <div class="mt-5 space-y-7 border-l pl-5" style="border-color: var(--border)">
          <div v-for="month in year.months" :key="month.month">
            <p class="relative flex items-center gap-2 text-sm font-semibold">
              <span
                class="absolute -left-[1.68rem] top-1/2 h-2 w-2 -translate-y-1/2 rounded-full ring-4"
                style="background: var(--brand); --tw-ring-color: var(--bg)"
                aria-hidden="true"
              />
              {{ month.month }} 月
              <span class="text-[11px] font-normal" style="color: var(--text-2)">{{ month.count }} 篇</span>
            </p>

            <ul class="mt-2 space-y-1">
              <li v-for="article in month.articles" :key="article.id">
                <RouterLink
                  :to="`/article/${article.id}`"
                  class="group flex items-baseline gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--bg-soft)]"
                >
                  <span class="w-14 shrink-0 text-xs tabular-nums" style="color: var(--text-2)">
                    {{ formatDate(article.createdAt).slice(5) }}
                  </span>
                  <span class="text-sm transition-colors group-hover:text-[var(--brand)]">{{ article.title }}</span>
                </RouterLink>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <p class="flex items-center justify-center gap-2 pt-2 text-xs" style="color: var(--text-2)">
        <el-icon :size="13"><Calendar /></el-icon>
        这就是全部的时间线了
      </p>
    </div>
  </div>
</template>
