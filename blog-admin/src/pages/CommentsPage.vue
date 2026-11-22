<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatLineRound, Refresh, Search } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import { batchComments, deleteComment, getAdminComments, replyComment, reviewComment } from '@/api/comments'
import { formatDateTime } from '@/utils/format'
import type { Comment, CommentTargetType, ReviewStatus } from '@/api/types'

interface CommentFilter {
  status: '' | ReviewStatus
  targetType: '' | CommentTargetType
  keyword: string
  page: number
  pageSize: number
}

const TABS: Array<{ label: string; value: '' | ReviewStatus }> = [
  { label: '待审核', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已拒绝', value: 'rejected' },
  { label: '全部', value: '' },
]

const query = reactive<CommentFilter>({
  status: 'pending',
  targetType: '',
  keyword: '',
  page: 1,
  pageSize: 10,
})

const loading = ref(false)
const rows = ref<Comment[]>([])
const total = ref(0)
const replyVisible = ref(false)
const replyTarget = ref<Comment | null>(null)
const replyContent = ref('')
const replying = ref(false)
const selected = ref<Comment[]>([])

const hasRows = computed(() => rows.value.length > 0)

function targetLabel(row: Comment): string {
  if (row.targetType === 'article') return row.articleId ? `文章 #${row.articleId}` : '文章'
  return row.talkId ? `说说 #${row.talkId}` : '说说'
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await getAdminComments({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.status ? { status: query.status } : {}),
      ...(query.targetType ? { targetType: query.targetType } : {}),
      ...(query.keyword.trim() ? { keyword: query.keyword.trim() } : {}),
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

function onSelectionChange(rows: Comment[]): void {
  selected.value = rows
}

async function runBatch(action: 'approve' | 'reject' | 'delete'): Promise<void> {
  const ids = selected.value.map((row) => row.id)
  if (!ids.length) {
    ElMessage.warning('请先勾选要操作的评论')
    return
  }
  const label = action === 'approve' ? '通过' : action === 'reject' ? '拒绝' : '删除'
  try {
    await ElMessageBox.confirm(
      action === 'delete'
        ? `将删除选中的 ${ids.length} 条评论（含其下回复），删除后无法恢复，确定继续吗？`
        : `确定${label}选中的 ${ids.length} 条评论吗？`,
      `批量${label}`,
      { confirmButtonText: label, cancelButtonText: '取消', type: action === 'approve' ? 'info' : 'warning' },
    )
  } catch {
    return
  }
  try {
    const result = await batchComments(ids, action)
    ElMessage.success(`已${label} ${result.affected} 条评论`)
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

function handleSearch(): void {
  query.page = 1
  void load()
}

function handleReset(): void {
  query.status = 'pending'
  query.targetType = ''
  query.keyword = ''
  query.page = 1
  void load()
}

function handleSizeChange(): void {
  query.page = 1
  void load()
}

async function review(row: Comment, status: ReviewStatus): Promise<void> {
  const action = status === 'approved' ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(`确定${action} ${row.nickname} 的这条评论吗？`, `${action}评论`, {
      confirmButtonText: action,
      cancelButtonText: '取消',
      type: status === 'rejected' ? 'warning' : 'info',
    })
  } catch {
    return
  }

  try {
    await reviewComment(row.id, status)
    ElMessage.success(`已${action}`)
    await load()
  } catch {
    // 请求层已提示
  }
}

function openReply(row: Comment): void {
  replyTarget.value = row
  replyContent.value = ''
  replyVisible.value = true
}

async function submitReply(): Promise<void> {
  if (!replyTarget.value) return
  const content = replyContent.value.trim()
  if (!content) {
    ElMessage.warning('请输入回复内容')
    return
  }

  replying.value = true
  try {
    await replyComment(replyTarget.value.id, content)
    ElMessage.success('回复已提交')
    replyVisible.value = false
    await load()
  } catch {
    // 请求层已提示
  } finally {
    replying.value = false
  }
}

async function handleDelete(row: Comment): Promise<void> {
  try {
    await ElMessageBox.confirm(
      row.replies && row.replies.length > 0
        ? `这条评论下有 ${row.replies.length} 条回复，删除后将一并移除，确定删除吗？`
        : '删除后无法恢复，确定删除这条评论吗？',
      '删除评论',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteComment(row.id)
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
        <PageHeader title="评论管理" description="审核读者评论，回复后会自动以管理员身份展示">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        </PageHeader>
      </template>

      <div class="table-toolbar">
        <el-tabs :model-value="query.status" class="min-w-0 flex-1" @tab-change="onTabChange">
          <el-tab-pane v-for="tab in TABS" :key="tab.value || 'all'" :label="tab.label" :name="tab.value" />
        </el-tabs>
        <div class="flex flex-wrap items-center gap-2">
          <el-select v-model="query.targetType" class="w-[132px]" placeholder="全部来源" clearable @change="handleSearch">
            <el-option label="文章评论" value="article" />
            <el-option label="说说评论" value="talk" />
          </el-select>
          <el-input
            v-model="query.keyword"
            class="w-[200px]"
            placeholder="昵称 / 邮箱 / 内容"
            clearable
            :prefix-icon="Search"
            @keyup.enter="handleSearch"
            @clear="handleSearch"
          />
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button type="success" plain :disabled="selected.length === 0" @click="runBatch('approve')">批量通过</el-button>
          <el-button type="warning" plain :disabled="selected.length === 0" @click="runBatch('reject')">批量拒绝</el-button>
          <el-button type="danger" plain :disabled="selected.length === 0" @click="runBatch('delete')">批量删除</el-button>
        </div>
      </div>

      <div class="table-flex">
        <el-table v-loading="loading" :data="rows" row-key="id" height="100%" border style="width: 100%" @selection-change="onSelectionChange">
          <el-table-column type="selection" width="44" align="center" />
          <el-table-column label="评论内容" min-width="300">
            <template #default="{ row }">
              <div class="py-1">
                <p class="clamp-2 text-[13px] leading-5 text-[var(--text)]">{{ row.content }}</p>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-[var(--text-2)]">
                  <span>{{ row.nickname }}</span>
                  <span v-if="row.replyTo" class="opacity-80">回复 {{ row.replyTo.nickname }}</span>
                  <el-tag v-if="row.isAdmin" size="small" type="success" effect="plain" disable-transitions>管理员</el-tag>
                  <span v-if="row.replies && row.replies.length > 0" class="opacity-80">
                    · {{ row.replies.length }} 条回复
                  </span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="作者" min-width="170">
            <template #default="{ row }">
              <div class="text-[12px] leading-5">
                <div class="text-[var(--text)]">{{ row.nickname }}</div>
                <div class="text-[var(--text-3)]">{{ row.email }}</div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="所属" width="110" align="center">
            <template #default="{ row }">
              <span class="text-[12px] text-[var(--text-2)]">{{ targetLabel(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <StatusTag :status="row.status" />
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
          <el-table-column label="操作" width="188" align="center" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status !== 'approved'" link type="success" size="small" @click="review(row, 'approved')">通过</el-button>
              <el-button v-if="row.status !== 'rejected'" link type="warning" size="small" @click="review(row, 'rejected')">拒绝</el-button>
              <el-button link type="primary" size="small" :icon="ChatLineRound" @click="openReply(row)">回复</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <EmptyState
              :title="hasRows ? '暂无匹配评论' : '暂无评论'"
              :description="query.status === 'pending' ? '所有评论都处理完了，做得不错。' : '读者评论会出现在这里。'"
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

    <el-dialog v-model="replyVisible" title="回复评论" width="520px" draggable destroy-on-close>
      <div
        v-if="replyTarget"
        class="mb-3 rounded px-3 py-2 text-[12px] leading-5 text-[var(--text-2)]"
        style="background: var(--bg-soft)"
      >
        <span class="font-medium text-[var(--text)]">{{ replyTarget.nickname }}</span>
        <p class="clamp-2 mt-1">{{ replyTarget.content }}</p>
      </div>
      <el-input
        v-model="replyContent"
        type="textarea"
        :rows="5"
        maxlength="500"
        show-word-limit
        placeholder="以管理员身份回复，会展示在评论下方"
      />
      <template #footer>
        <el-button @click="replyVisible = false">取消</el-button>
        <el-button type="primary" :loading="replying" @click="submitReply">提交回复</el-button>
      </template>
    </el-dialog>
  </div>
</template>
