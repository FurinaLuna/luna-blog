<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { batchMessages, deleteMessage, getAdminMessages, reviewMessage } from '@/api/messages'
import { formatDateTime } from '@/utils/format'
import type { MessageItem, ReviewStatus } from '@/api/types'

interface MessageFilter {
  status: '' | ReviewStatus
  page: number
  pageSize: number
}

const TABS: Array<{ label: string; value: '' | ReviewStatus }> = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '全部', value: '' },
]

const query = reactive<MessageFilter>({ status: 'pending', page: 1, pageSize: 10 })
const loading = ref(false)
const rows = ref<MessageItem[]>([])
const total = ref(0)
const selected = ref<MessageItem[]>([])

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await getAdminMessages({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
    })
    rows.value = result.list
    total.value = result.total
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onSelectionChange(rows: MessageItem[]): void {
  selected.value = rows
}

async function runBatch(action: 'approve' | 'reject' | 'delete'): Promise<void> {
  const ids = selected.value.map((row) => row.id)
  if (!ids.length) {
    ElMessage.warning('请先勾选要操作的留言')
    return
  }
  const label = action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : '删除'
  try {
    await ElMessageBox.confirm(`确定${label}选中的 ${ids.length} 条留言吗？`, `批量${label}`, {
      confirmButtonText: label,
      cancelButtonText: '取消',
      type: action === 'approve' ? 'info' : 'warning',
    })
  } catch {
    return
  }
  try {
    const result = await batchMessages(ids, action)
    ElMessage.success(`已${label} ${result.affected} 条留言`)
    selected.value = []
    await load()
  } catch {
    // 请求层已提示
  }
}

function onTabChange(name: string | number): void {
  query.status = name === 'pending' || name === 'approved' || name === 'rejected' ? name : ''
  query.page = 1
  void load()
}

function handleSizeChange(): void {
  query.page = 1
  void load()
}

async function review(row: MessageItem, status: ReviewStatus): Promise<void> {
  const action = status === 'approved' ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(`确定${action} ${row.nickname} 的这条留言吗？`, `${action}留言`, {
      confirmButtonText: action,
      cancelButtonText: '取消',
      type: status === 'rejected' ? 'warning' : 'info',
    })
  } catch {
    return
  }

  try {
    await reviewMessage(row.id, status)
    ElMessage.success(`已${action}`)
    await load()
  } catch {
    // 请求层已提示
  }
}

async function handleDelete(row: MessageItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除 ${row.nickname} 的留言吗？删除后无法恢复。`, '删除留言', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteMessage(row.id)
    ElMessage.success('已删除')
    if (rows.value.length === 1 && query.page > 1) query.page -= 1
    await load()
  } catch {
    // 请求层已提示
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="admin-card">
      <template #header>
        <PageHeader title="留言管理" description="留言板上的短消息，审核通过后才会公开展示">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        </PageHeader>
      </template>

      <div class="table-toolbar">
        <el-tabs :model-value="query.status" class="min-w-0 flex-1" @tab-change="onTabChange">
          <el-tab-pane v-for="tab in TABS" :key="tab.value || 'all'" :label="tab.label" :name="tab.value" />
        </el-tabs>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-[12px] text-[var(--text-3)]">共 {{ total }} 条</span>
          <el-button type="success" plain :disabled="selected.length === 0" @click="runBatch('approve')">批量通过</el-button>
          <el-button type="warning" plain :disabled="selected.length === 0" @click="runBatch('reject')">批量拒绝</el-button>
          <el-button type="danger" plain :disabled="selected.length === 0" @click="runBatch('delete')">批量删除</el-button>
        </div>
      </div>

      <div class="table-flex">
        <el-table v-loading="loading" :data="rows" row-key="id" height="100%" border style="width: 100%" @selection-change="onSelectionChange">
          <el-table-column type="selection" width="44" align="center" />
          <el-table-column label="留言内容" min-width="320">
            <template #default="{ row }">
              <p class="clamp-2 py-1 text-[13px] leading-5 text-[var(--text)]">{{ row.content }}</p>
            </template>
          </el-table-column>
          <el-table-column label="昵称" min-width="140" align="center">
            <template #default="{ row }">
              <span
                class="inline-flex items-center gap-1.5 text-[13px]"
                :style="{ color: row.color || 'var(--text)' }"
              >
                <span
                  class="inline-block h-2 w-2 rounded-full"
                  :style="{ background: row.color || 'var(--el-color-primary)' }"
                />
                {{ row.nickname }}
              </span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <StatusTag :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column label="点赞" width="80" align="center">
            <template #default="{ row }">
              <span class="text-[12px] tabular-nums text-[var(--text-2)]">{{ row.likeCount }}</span>
            </template>
          </el-table-column>
          <el-table-column label="IP" width="130" align="center">
            <template #default="{ row }">
              <span class="text-[12px] tabular-nums text-[var(--text-2)]">{{ row.ip || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="时间" width="150" align="center">
            <template #default="{ row }">
              <span class="text-[12px] text-[var(--text-2)]">{{ formatDateTime(row.createdAt) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="160" align="center" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status !== 'approved'" link type="success" size="small" @click="review(row, 'approved')">通过</el-button>
              <el-button v-if="row.status !== 'rejected'" link type="warning" size="small" @click="review(row, 'rejected')">拒绝</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <EmptyState
              :title="query.status === 'pending' ? '没有待审核的留言' : '暂无留言'"
              description="访客在留言板写下的内容会出现在这里。"
            />
          </template>
        </el-table>
      </div>

      <div class="pager">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>
  </div>
</template>
