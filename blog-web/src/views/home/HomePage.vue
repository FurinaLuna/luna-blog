<script setup lang="ts">
import { computed, ref } from 'vue'
import { useQuery } from '@pinia/colada'
import {
  ArrowRight,
  ChatDotRound,
  Collection,
  Document,
  Picture,
  PriceTag,
  View,
} from '@element-plus/icons-vue'
import ArticleCard from '@/components/article/ArticleCard.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SectionTitle from '@/components/common/SectionTitle.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import SocialLinks from '@/components/common/SocialLinks.vue'
import TagChip from '@/components/common/TagChip.vue'
import { getArticles, getRecommendArticles } from '@/api/article'
import { useSiteStore } from '@/stores/site'
import { formatCompact, formatDate } from '@/utils/format'

const PAGE_SIZE = 8

const site = useSiteStore()
const page = ref(1)
const avatarFailed = ref(false)

const {
  data: articlesData,
  isLoading: articlesLoading,
  error: articlesError,
  refetch: refetchArticles,
} = useQuery({
  key: () => ['articles', page.value, PAGE_SIZE],
  query: () => getArticles({ page: page.value, pageSize: PAGE_SIZE }),
  staleTime: 60_000,
})

const { data: recommendData } = useQuery({
  key: () => ['articles-recommend', 2],
  query: () => getRecommendArticles(2),
  staleTime: 5 * 60_000,
})

const { data: latestData } = useQuery({
  key: () => ['articles-latest-sidebar'],
  query: () => getArticles({ page: 1, pageSize: 5 }),
  staleTime: 60_000,
})

const latestSidebar = computed(() => latestData.value?.list ?? [])

const list = computed(() => articlesData.value?.list ?? [])
const total = computed(() => articlesData.value?.total ?? 0)
const recommendations = computed(() => recommendData.value ?? [])

const heroTitle = computed(() => site.config?.heroTitle || '在代码与生活之间散步')
const heroSubtitle = computed(
  () => site.config?.heroSubtitle || site.siteDescription || '记录技术、阅读与日常的片段。',
)

const topStats = computed(() => {
  const stats = site.stats
  if (!stats) {
    return { article: 0, views: 0, comment: 0 }
  }
  return { article: stats.article, views: stats.views, comment: stats.comment }
})

const statCards = computed(() => {
  const stats = site.stats
  return [
    { label: '文章', value: stats ? String(stats.article) : '—', icon: Document },
    { label: '分类', value: stats ? String(stats.category) : '—', icon: Collection },
    { label: '标签', value: stats ? String(stats.tag) : '—', icon: PriceTag },
    { label: '评论', value: stats ? String(stats.comment) : '—', icon: ChatDotRound },
    { label: '说说', value: stats ? String(stats.talk) : '—', icon: ChatDotRound },
    { label: '照片', value: stats ? String(stats.photo) : '—', icon: Picture },
  ]
})

function changePage(next: number): void {
  page.value = next
  document.getElementById('latest')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <div>
    <!-- Hero -->
    <section class="relative overflow-hidden border-b" style="border-color: var(--border)">
      <div class="hero-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div class="container-page relative py-16 sm:py-20 lg:py-24">
        <p
          class="mb-4 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]"
          style="color: var(--brand)"
        >
          <span class="inline-block h-1.5 w-1.5 rounded-full" style="background: var(--brand)" />
          {{ site.siteDescription }}
        </p>

        <h1 class="max-w-3xl text-4xl font-bold leading-[1.14] sm:text-5xl lg:text-[3.4rem]">
          {{ heroTitle }}
        </h1>

        <p class="mt-5 max-w-2xl text-base leading-relaxed" style="color: var(--text-2)">
          {{ heroSubtitle }}
        </p>

        <div class="mt-8 flex flex-wrap items-center gap-3">
          <a href="#latest" class="btn btn-primary">
            开始阅读
            <el-icon :size="15"><ArrowRight /></el-icon>
          </a>
          <RouterLink to="/about" class="btn btn-ghost">关于我</RouterLink>
        </div>

        <dl class="mt-10 flex flex-wrap items-center gap-x-10 gap-y-4">
          <div>
            <dt class="text-[11px] uppercase tracking-wider" style="color: var(--text-2)">文章</dt>
            <dd class="stat-num text-2xl font-bold">{{ topStats.article }}</dd>
          </div>
          <div>
            <dt class="text-[11px] uppercase tracking-wider" style="color: var(--text-2)">累计阅读</dt>
            <dd class="stat-num text-2xl font-bold">{{ formatCompact(topStats.views) }}</dd>
          </div>
          <div>
            <dt class="text-[11px] uppercase tracking-wider" style="color: var(--text-2)">评论</dt>
            <dd class="stat-num text-2xl font-bold">{{ topStats.comment }}</dd>
          </div>
        </dl>
      </div>
    </section>

    <div v-if="site.announcement" class="container-page mt-8">
      <div
        class="flex items-start gap-3 rounded-[14px] border px-4 py-3 text-sm"
        style="border-color: var(--border); background: var(--card)"
      >
        <span class="mt-0.5 inline-block h-2 w-2 shrink-0 rounded-full" style="background: var(--accent)" />
        <p class="leading-relaxed" style="color: var(--text-2)">{{ site.announcement }}</p>
      </div>
    </div>

    <!-- 推荐 -->
    <section v-if="recommendations.length > 0" class="container-page pt-12">
      <SectionTitle title="推荐阅读" subtitle="值得慢慢读的几篇" />
      <div class="mt-5 grid gap-5 md:grid-cols-2">
        <ArticleCard
          v-for="item in recommendations"
          :key="item.id"
          :article="item"
          variant="feature"
        />
      </div>
    </section>

    <!-- 列表 + 侧栏 -->
    <div id="latest" class="container-page mt-12 scroll-mt-24">
      <div class="grid gap-10 md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]">
        <div class="min-w-0">
          <SectionTitle title="最新文章" subtitle="持续记录，慢慢生长" />

          <div v-if="articlesLoading" class="mt-6">
            <SkeletonList variant="list" :count="4" />
          </div>

          <EmptyState
            v-else-if="articlesError && list.length === 0"
            class="mt-6"
            icon="error"
            title="文章加载失败"
            description="后端服务可能还没启动，稍后再试试。"
            action-text="重新加载"
            @action="refetchArticles"
          />

          <EmptyState
            v-else-if="list.length === 0"
            class="mt-6"
            icon="inbox"
            title="还没有发布文章"
            description="第一篇正在路上。"
          />

          <div v-else class="mt-6 space-y-4">
            <ArticleCard v-for="item in list" :key="item.id" :article="item" />
          </div>

          <Pagination
            :page="page"
            :total="total"
            :page-size="PAGE_SIZE"
            class="mt-8"
            @update:page="changePage"
          />
        </div>

        <aside class="space-y-5 md:sticky md:top-[calc(var(--header-h)+1.5rem)] md:self-start">
          <!-- 作者 -->
          <div class="card p-5 text-center">
            <img
              v-if="site.avatar && !avatarFailed"
              :src="site.avatar"
              :alt="`${site.author} 的头像`"
              class="mx-auto h-16 w-16 rounded-full border object-cover"
              style="border-color: var(--border)"
              loading="lazy"
              @error="avatarFailed = true"
            />
            <div
              v-else
              class="mx-auto grid h-16 w-16 place-items-center rounded-full text-xl font-bold"
              style="background: var(--brand); color: var(--brand-contrast)"
              aria-hidden="true"
            >
              {{ site.author.charAt(0) }}
            </div>
            <h3 class="mt-3 text-base font-bold">{{ site.author }}</h3>
            <p class="mt-1.5 text-xs leading-relaxed" style="color: var(--text-2)">
              {{ site.siteDescription }}
            </p>
            <div class="mt-4 flex justify-center">
              <SocialLinks :links="site.resolvedSocialLinks" size="sm" />
            </div>
          </div>

          <!-- 最新文章 -->
          <div v-if="latestSidebar.length > 0" class="card p-5">
            <h3 class="flex items-center gap-2 text-sm font-bold">
              <el-icon :size="15" style="color: var(--brand)"><Document /></el-icon>
              最近更新
            </h3>
            <ul class="mt-3 space-y-2.5">
              <li v-for="article in latestSidebar" :key="article.id">
                <RouterLink
                  :to="`/article/${article.id}`"
                  class="group block text-sm leading-snug transition-colors hover:text-[var(--brand)]"
                >
                  <span class="line-clamp-2">{{ article.title }}</span>
                  <span class="mt-0.5 block text-[11px] tabular-nums" style="color: var(--text-2)">
                    {{ formatDate(article.publishedAt || article.createdAt) }}
                  </span>
                </RouterLink>
              </li>
            </ul>
          </div>

          <!-- 分类 -->
          <div class="card p-5">
            <h3 class="flex items-center gap-2 text-sm font-bold">
              <el-icon :size="15" style="color: var(--brand)"><Collection /></el-icon>
              分类
            </h3>
            <ul v-if="site.categories.length > 0" class="mt-3 space-y-0.5">
              <li v-for="category in site.categories" :key="category.id">
                <RouterLink
                  :to="`/category/${category.id}`"
                  class="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-[var(--bg-soft)] hover:text-[var(--brand)]"
                >
                  <span class="truncate">{{ category.name }}</span>
                  <span class="text-xs tabular-nums" style="color: var(--text-2)">
                    {{ category.articleCount }}
                  </span>
                </RouterLink>
              </li>
            </ul>
            <p v-else class="mt-3 text-xs" style="color: var(--text-2)">暂无分类</p>
          </div>

          <!-- 标签云 -->
          <div class="card p-5">
            <h3 class="flex items-center gap-2 text-sm font-bold">
              <el-icon :size="15" style="color: var(--brand)"><PriceTag /></el-icon>
              标签
            </h3>
            <div v-if="site.tags.length > 0" class="mt-3 flex flex-wrap gap-1.5">
              <TagChip
                v-for="tag in site.tags.slice(0, 18)"
                :key="tag.id"
                :id="tag.id"
                :name="tag.name"
                :color="tag.color"
              />
            </div>
            <p v-else class="mt-3 text-xs" style="color: var(--text-2)">暂无标签</p>
          </div>

          <!-- 统计 -->
          <div class="card p-5">
            <h3 class="flex items-center gap-2 text-sm font-bold">
              <el-icon :size="15" style="color: var(--brand)"><View /></el-icon>
              站点统计
            </h3>
            <div class="mt-3 grid grid-cols-2 gap-3">
              <div v-for="item in statCards" :key="item.label" class="rounded-lg px-3 py-2" style="background: var(--bg-soft)">
                <p class="text-[11px]" style="color: var(--text-2)">{{ item.label }}</p>
                <p class="stat-num text-lg font-bold leading-tight">{{ item.value }}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
