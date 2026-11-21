<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { deleteArticle, getAdminArticles, updateArticleFlags } from '@/api/articles'
import { getCategories } from '@/api/categories'
import type { ArticleFlags, ArticleStatus, ArticleSummary, Category, PageResult } from '@/api/types'
import { formatNumber, fromNow, resolveAssetUrl } from '@/utils/format'

const router = useRouter()

const loading = ref(false)
const total = ref(0)
const rows = ref<ArticleSummary[]>([])
const categories = ref<Category[]>([])
const busyKey = ref('')

const query = reactive({
  status: '' as ArticleStatus | '',
  categoryId: null as number | null,
  keyword: '',
  page: 1,
  pageSize: 10,
})

async function load(): Promise<void> {
  loading.value = true
  try {
    const params: {
      page: number
      pageSize: number
      status?: ArticleStatus
      categoryId?: number
      keyword?: string
    } = { page: query.page, pageSize: query.pageSize }
    if (query.status) params.status = query.status
    if (query.categoryId !== null) params.categoryId = query.categoryId
    const keyword = query.keyword.trim()
    if (keyword) params.keyword = keyword

    const result: PageResult<ArticleSummary> = await getAdminArticles(params)
    rows.value = result.list
    total.value = result.total
  } finally {
    loading.value = false
  }
}

async function loadCategories(): Promise<void> {
  try {
    categories.value = await getCategories()
  } catch {
    categories.value = []
  }
}

function handleSearch(): void {
  query.page = 1
  void load()
}

function handleReset(): void {
  query.status = ''
  query.categoryId = null
  query.keyword = ''
  query.page = 1
  void load()
}

function handleFilterChange(): void {
  query.page = 1
  void load()
}

function handleSizeChange(): void {
  query.page = 1
  void load()
}

function handlePageChange(): void {
  void load()
}

async function toggleFlag(row: ArticleSummary, key: 'isRecommend' | 'isTop', value: boolean): Promise<void> {
  const patch: ArticleFlags = {}
  patch[key] = value
  busyKey.value = `${row.id}-${key}`
  try {
    await updateArticleFlags(row.id, patch)
    if (key === 'isRecommend') row.isRecommend = value
    else row.isTop = value
    ElMessage.success(key === 'isRecommend' ? (value ? '已推荐' : '已取消推荐') : value ? '已置顶' : '已取消置顶')
  } finally {
    busyKey.value = ''
  }
}

/**
 * el-switch 用 v-model 直接改 row 上的布尔值，这里按 row 当前状态提交，
 * 失败时回滚，避免模板里出现无类型标注的箭头函数参数。
 */
async function onSwitchChange(row: ArticleSummary, key: 'isRecommend' | 'isTop'): Promise<void> {
  const next = key === 'isRecommend' ? row.isRecommend : row.isTop
  try {
    await toggleFlag(row, key, next)
  } catch {
    if (key === 'isRecommend') row.isRecommend = !next
    else row.isTop = !next
  }
}

async function toggleStatus(row: ArticleSummary): Promise<void> {
  const next: ArticleStatus = row.status === 'published' ? 'draft' : 'published'
  try {
    await ElMessageBox.confirm(
      next === 'published' ? `确定发布《${row.title}》吗？` : `确定将《${row.title}》转为草稿吗？`,
      next === 'published' ? '发布文章' : '转为草稿',
      { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  busyKey.value = `${row.id}-status`
  try {
    await updateArticleFlags(row.id, { status: next })
    ElMessage.success(next === 'published' ? '已发布' : '已转为草稿')
    await load()
  } finally {
    busyKey.value = ''
  }
}

async function handleDelete(row: ArticleSummary): Promise<void> {
  try {
    await ElMessageBox.confirm(`删除后《${row.title}》及其评论将无法恢复，确定删除吗？`, '删除文章', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'error',
      confirmButtonClass: 'el-button--danger',
    })
  } catch {
    return
  }

  try {
    await deleteArticle(row.id)
    ElMessage.success('已删除')
    if (rows.value.length === 1 && query.page > 1) query.page -= 1
    await load()
  } catch {
    // 请求层已提示
  }
}

onMounted(() => {
  void loadCategories()
  void load()
})
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="admin-card">
      <template #header>
        <PageHeader title="文章管理" description="撰写、发布与整理站点的全部文章">
          <el-button type="primary" :icon="Plus" @click="router.push({ name: 'ArticleCreate' })">写文章</el-button>
        </PageHeader>
      </template>

      <div class="table-toolbar">
        <el-tabs v-model="query.status" class="min-w-[260px] flex-1" @tab-change="handleFilterChange">
          <el-tab-pane label="全部" name="" />
          <el-tab-pane label="已发布" name="published" />
          <el-tab-pane label="草稿" name="draft" />
        </el-tabs>

        <div class="flex flex-wrap items-center gap-2">
          <el-select
            v-model="query.categoryId"
            placeholder="全部分类"
            clearable
            class="w-[150px]"
            @change="handleFilterChange"
          >
            <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
          </el-select>

          <el-input
            v-model="query.keyword"
            placeholder="搜索标题或摘要"
            clearable
            :prefix-icon="Search"
            class="w-[220px]"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </div>
      </div>

      <div class="table-flex">
        <el-table v-loading="loading" :data="rows" row-key="id" height="100%" border style="width: 100%">
          <el-table-column label="封面" width="82" align="center">
            <template #default="{ row }">
              <div class="mx-auto h-10 w-14 overflow-hidden rounded" :style="{ background: 'var(--el-fill-color-light)' }">
                <img
                  v-if="row.cover"
                  :src="resolveAssetUrl(row.cover)"
                  :alt="row.title"
                  class="h-full w-full object-cover"
                />
                <div v-else class="grid h-full w-full place-items-center text-[10px] text-[var(--text-3)]">无封面</div>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="标题" min-width="240">
            <template #default="{ row }">
              <div class="flex items-start gap-1.5">
                <button
                  type="button"
                  class="clamp-1 cursor-pointer border-0 bg-transparent p-0 text-left text-[13px] font-semibold text-[var(--text)] transition-colors hover:text-[var(--el-color-primary)]"
                  @click="router.push(`/articles/${row.id}/edit`)"
                >
                  {{ row.title }}
                </button>
                <el-tag v-if="row.isTop" size="small" type="warning" effect="plain" disable-transitions>顶</el-tag>
                <el-tag v-if="row.isRecommend" size="small" effect="plain" disable-transitions>荐</el-tag>
              </div>
              <p class="clamp-1 mt-0.5 mb-0 text-[11px] text-[var(--text-3)]">{{ row.summary || '暂无摘要' }}</p>
            </template>
          </el-table-column>

          <el-table-column label="分类" width="100" align="center">
            <template #default="{ row }">
              <span class="text-[12px] text-[var(--text-2)]">{{ row.category?.name ?? '未分类' }}</span>
            </template>
          </el-table-column>

          <el-table-column label="标签" width="132" align="center">
            <template #default="{ row }">
              <div class="flex flex-wrap items-center justify-center gap-1">
                <el-tag
                  v-for="tag in row.tags.slice(0, 2)"
                  :key="tag.id"
                  size="small"
                  effect="plain"
                  disable-transitions
                  :style="tag.color ? { color: tag.color, borderColor: tag.color } : undefined"
                >
                  {{ tag.name }}
                </el-tag>
                <el-tag v-if="row.tags.length > 2" size="small" effect="plain" disable-transitions>
                  +{{ row.tags.length - 2 }}
                </el-tag>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="状态" width="90" align="center">
            <template #default="{ row }"><StatusTag :status="row.status" kind="article" /></template>
          </el-table-column>

          <el-table-column label="推荐 / 置顶" width="112" align="center">
            <template #default="{ row }">
              <div class="flex items-center justify-center gap-2.5">
                <el-tooltip content="推荐到首页" placement="top" :show-after="300">
                  <el-switch
                    v-model="row.isRecommend"
                    size="small"
                    :loading="busyKey === `${row.id}-isRecommend`"
                    @change="onSwitchChange(row, 'isRecommend')"
                  />
                </el-tooltip>
                <el-tooltip content="置顶" placement="top" :show-after="300">
                  <el-switch
                    v-model="row.isTop"
                    size="small"
                    :loading="busyKey === `${row.id}-isTop`"
                    @change="onSwitchChange(row, 'isTop')"
                  />
                </el-tooltip>
              </div>
            </template>
          </el-table-column>

          <el-table-column label="浏览" width="78" align="center">
            <template #default="{ row }">
              <span class="text-[12px] tabular-nums text-[var(--text-2)]">{{ formatNumber(row.views) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="更新时间" width="112" align="center">
            <template #default="{ row }">
              <span class="whitespace-nowrap text-[12px] text-[var(--text-2)]">{{ fromNow(row.updatedAt) }}</span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="168" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="router.push(`/articles/${row.id}/edit`)">
                编辑
              </el-button>
              <el-button
                link
                :type="row.status === 'published' ? 'info' : 'success'"
                size="small"
                :loading="busyKey === `${row.id}-status`"
                @click="toggleStatus(row)"
              >
                {{ row.status === 'published' ? '转草稿' : '发布' }}
              </el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>

          <template #empty>
            <EmptyState title="没有找到文章" description="调整筛选条件，或写下第一篇。">
              <el-button type="primary" size="small" @click="router.push({ name: 'ArticleCreate' })">写文章</el-button>
            </EmptyState>
          </template>
        </el-table>

        <div v-if="total > 0" class="pager">
          <el-pagination
            v-model:current-page="query.page"
            v-model:page-size="query.pageSize"
            :total="total"
            :page-sizes="[10, 20, 30, 50]"
            layout="total, sizes, prev, pager, next"
            background
            @current-change="handlePageChange"
            @size-change="handleSizeChange"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>
