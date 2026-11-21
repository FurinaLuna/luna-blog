<script setup lang="ts">
import { computed, onMounted, ref, type Component } from 'vue'
import { useRouter } from 'vue-router'
import { ChatDotRound, Document, Message, View } from '@element-plus/icons-vue'
import { getDashboard } from '@/api/dashboard'
import type { DashboardData, TrendPoint } from '@/api/types'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { formatNumber, fromNow, truncate } from '@/utils/format'

interface StatCard {
  key: string
  label: string
  value: number
  sub: string
  highlight: boolean
  icon: Component
  to: string
}

const router = useRouter()
const loading = ref(true)
const failed = ref(false)
const data = ref<DashboardData | null>(null)

const counts = computed(() => data.value?.counts)
const trend = computed<TrendPoint[]>(() => data.value?.trend ?? [])
const recentComments = computed(() => data.value?.recentComments ?? [])
const recentArticles = computed(() => data.value?.recentArticles ?? [])

const todayPoint = computed<TrendPoint | undefined>(() => trend.value[trend.value.length - 1])

const stats = computed<StatCard[]>(() => [
  {
    key: 'article',
    label: '文章',
    value: counts.value?.article ?? 0,
    sub: `已发布 ${counts.value?.published ?? 0} · 草稿 ${counts.value?.draft ?? 0}`,
    highlight: false,
    icon: Document,
    to: '/articles',
  },
  {
    key: 'comment',
    label: '评论',
    value: counts.value?.comment ?? 0,
    sub: counts.value?.pendingComment ? `待审核 ${counts.value.pendingComment}` : '暂无待审核',
    highlight: (counts.value?.pendingComment ?? 0) > 0,
    icon: ChatDotRound,
    to: '/comments',
  },
  {
    key: 'message',
    label: '留言',
    value: counts.value?.message ?? 0,
    sub: counts.value?.pendingMessage ? `待审核 ${counts.value.pendingMessage}` : '暂无待审核',
    highlight: (counts.value?.pendingMessage ?? 0) > 0,
    icon: Message,
    to: '/messages',
  },
  {
    key: 'views',
    label: '浏览',
    value: counts.value?.views ?? 0,
    sub: todayPoint.value ? `今日新增文章 ${todayPoint.value.articles}` : '累计阅读量',
    highlight: false,
    icon: View,
    to: '/articles',
  },
])

const CHART = { width: 760, height: 230, padX: 44, padTop: 18, plotH: 150 }

const chart = computed(() => {
  const points = trend.value
  const rawMax = Math.max(1, ...points.flatMap((p) => [p.articles, p.comments]))
  // 整数刻度：步长取整，纵轴最高值 = 4 × 步长，避免出现 2/2/1/1 这种重复刻度
  const tickStep = Math.max(1, Math.ceil(rawMax / 4))
  const max = tickStep * 4
  const step = points.length > 1 ? (CHART.width - CHART.padX * 2) / (points.length - 1) : 0
  const x = (index: number): number => CHART.padX + index * step
  const y = (value: number): number => CHART.padTop + CHART.plotH - (value / max) * CHART.plotH

  const build = (key: 'articles' | 'comments'): string =>
    points.map((point, index) => `${x(index).toFixed(1)},${y(point[key]).toFixed(1)}`).join(' ')

  const area = points.length
    ? `${x(0)},${CHART.padTop + CHART.plotH} ${build('comments')} ${x(points.length - 1)},${CHART.padTop + CHART.plotH}`
    : ''

  const grid = [0, 1, 2, 3, 4].map((index) => ({
    y: CHART.padTop + CHART.plotH * (index / 4),
    value: max - index * tickStep,
  }))

  const labels = points.map((point, index) => ({
    x: x(index),
    text: point.date.slice(5),
  }))

  return {
    articles: build('articles'),
    comments: build('comments'),
    area,
    grid,
    labels,
    dots: points.map((point, index) => ({
      x: x(index),
      ya: y(point.articles),
      yc: y(point.comments),
      key: point.date,
    })),
    totalArticles: points.reduce((sum, point) => sum + point.articles, 0),
    totalComments: points.reduce((sum, point) => sum + point.comments, 0),
  }
})

async function load(): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    data.value = await getDashboard()
  } catch {
    failed.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <PageHeader title="仪表盘" description="内容与互动概览，最近 7 天的数据变化">
      <el-button :loading="loading" @click="load">刷新</el-button>
      <el-button type="primary" @click="router.push('/articles/create')">写文章</el-button>
    </PageHeader>

    <div v-if="loading && !data" class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div v-for="i in 4" :key="i" class="panel" :style="{ padding: '18px 20px' }">
        <el-skeleton :rows="2" animated />
      </div>
    </div>

    <EmptyState v-else-if="failed && !data" title="数据加载失败" description="请检查后端服务是否启动，然后重试。">
      <el-button type="primary" @click="load">重新加载</el-button>
    </EmptyState>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="stat in stats"
          :key="stat.key"
          type="button"
          class="panel cursor-pointer p-[18px] text-left transition-transform hover:-translate-y-0.5"
          style="background: var(--card)"
          @click="router.push(stat.to)"
        >
          <div class="flex items-start justify-between">
            <p class="m-0 text-[13px]" :style="{ color: 'var(--text-2)' }">{{ stat.label }}</p>
            <span class="grid h-8 w-8 place-items-center rounded-[10px]" :style="{ background: 'var(--brand-soft)', color: 'var(--brand)' }">
              <el-icon :size="16"><component :is="stat.icon" /></el-icon>
            </span>
          </div>
          <p class="mt-2 mb-1 text-[26px] leading-none font-bold tracking-tight" :style="{ color: 'var(--text)' }">
            {{ formatNumber(stat.value) }}
          </p>
          <p class="m-0 text-[12px]" :style="{ color: stat.highlight ? 'var(--accent)' : 'var(--text-3)' }">
            {{ stat.sub }}
          </p>
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <section class="panel panel--pad">
          <div class="section-title">
            <h2>近 7 天趋势</h2>
            <div class="flex items-center gap-4 text-[12px]" :style="{ color: 'var(--text-2)' }">
              <span class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full" :style="{ background: 'var(--brand)' }" />文章
                <b :style="{ color: 'var(--text)' }">{{ chart.totalArticles }}</b>
              </span>
              <span class="flex items-center gap-1.5">
                <span class="h-2 w-2 rounded-full" :style="{ background: 'var(--accent)' }" />评论
                <b :style="{ color: 'var(--text)' }">{{ chart.totalComments }}</b>
              </span>
            </div>
          </div>

          <svg v-if="trend.length" :viewBox="`0 0 ${CHART.width} ${CHART.height}`" class="w-full" role="img" aria-label="近 7 天文章与评论趋势">
            <defs>
              <linearGradient id="commentArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#e07a3f" stop-opacity="0.22" />
                <stop offset="100%" stop-color="#e07a3f" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g>
              <line
                v-for="line in chart.grid"
                :key="line.y"
                :x1="CHART.padX"
                :x2="CHART.width - CHART.padX"
                :y1="line.y"
                :y2="line.y"
                :stroke="'var(--border)'"
                stroke-width="1"
              />
              <text
                v-for="line in chart.grid"
                :key="`t-${line.y}`"
                :x="CHART.padX - 10"
                :y="line.y + 4"
                text-anchor="end"
                font-size="11"
                :fill="'var(--text-3)'"
              >
                {{ line.value }}
              </text>
            </g>
            <polygon v-if="chart.area" :points="chart.area" fill="url(#commentArea)" />
            <polyline :points="chart.articles" fill="none" stroke="#2f8f83" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <polyline :points="chart.comments" fill="none" stroke="#e07a3f" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
            <g v-for="dot in chart.dots" :key="dot.key">
              <circle :cx="dot.x" :cy="dot.ya" r="3.5" fill="#2f8f83" />
              <circle :cx="dot.x" :cy="dot.yc" r="3.5" fill="#e07a3f" />
            </g>
            <text
              v-for="label in chart.labels"
              :key="label.text"
              :x="label.x"
              :y="CHART.padTop + CHART.plotH + 26"
              text-anchor="middle"
              font-size="11"
              :fill="'var(--text-3)'"
            >
              {{ label.text }}
            </text>
          </svg>
          <EmptyState v-else compact title="暂无趋势数据" />

          <p class="hint mt-2 mb-0">横轴为日期，纵轴为当日新增数量（统计最近 7 天）。</p>
        </section>

        <section class="panel panel--pad">
          <div class="section-title">
            <h2>最新评论</h2>
            <el-button link size="small" @click="router.push('/comments')">全部评论</el-button>
          </div>

          <div v-if="recentComments.length" class="flex flex-col gap-1">
            <div
              v-for="comment in recentComments.slice(0, 5)"
              :key="comment.id"
              class="flex gap-2.5 rounded-[10px] px-1.5 py-2"
            >
              <span
                class="grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-semibold"
                :style="{ background: 'var(--brand-soft)', color: 'var(--brand)' }"
              >
                {{ comment.nickname.slice(0, 1).toUpperCase() }}
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-center justify-between gap-2">
                  <span class="truncate text-[12px] font-semibold" :style="{ color: 'var(--text)' }">
                    {{ comment.nickname }}
                  </span>
                  <span class="shrink-0 text-[11px]" :style="{ color: 'var(--text-3)' }">
                    {{ fromNow(comment.createdAt) }}
                  </span>
                </div>
                <p class="clamp-2 mt-0.5 mb-0 text-[12px] leading-relaxed" :style="{ color: 'var(--text-2)' }">
                  {{ truncate(comment.content, 70) }}
                </p>
                <div class="mt-1 flex items-center gap-2">
                  <el-tag size="small" effect="plain" disable-transitions>
                    {{ comment.targetType === 'article' ? '文章' : '说说' }}
                  </el-tag>
                  <StatusTag :status="comment.status" kind="review" />
                </div>
              </div>
            </div>
          </div>
          <EmptyState v-else compact title="还没有评论" description="等读者留下第一条留言吧。" />
        </section>
      </div>

      <section class="panel overflow-hidden">
        <div class="section-title px-5 pt-4">
          <h2>最近文章</h2>
          <el-button link size="small" @click="router.push('/articles')">文章管理</el-button>
        </div>

        <el-table v-if="recentArticles.length" :data="recentArticles" row-key="id" style="width: 100%">
          <el-table-column prop="title" label="标题" min-width="240">
            <template #default="{ row }">
              <button type="button" class="cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-medium text-[var(--text)] transition-colors hover:text-[var(--brand)]" @click="router.push(`/articles/${row.id}/edit`)">
                {{ row.title }}
              </button>
            </template>
          </el-table-column>
          <el-table-column label="分类" width="120">
            <template #default="{ row }">
              <span class="text-[12px]" :style="{ color: 'var(--text-2)' }">{{ row.category?.name ?? '未分类' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default="{ row }"><StatusTag :status="row.status" kind="article" /></template>
          </el-table-column>
          <el-table-column label="浏览" width="90" align="right">
            <template #default="{ row }">
              <span class="text-[12px] tabular-nums" :style="{ color: 'var(--text-2)' }">{{ formatNumber(row.views) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="更新时间" width="160">
            <template #default="{ row }">
              <span class="text-[12px]" :style="{ color: 'var(--text-2)' }">{{ fromNow(row.updatedAt) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="90" align="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="router.push(`/articles/${row.id}/edit`)">编辑</el-button>
            </template>
          </el-table-column>
        </el-table>
        <EmptyState v-else compact title="还没有文章" description="从第一篇开始记录吧。">
          <el-button type="primary" @click="router.push('/articles/create')">写文章</el-button>
        </EmptyState>
      </section>
    </template>
  </div>
</template>
