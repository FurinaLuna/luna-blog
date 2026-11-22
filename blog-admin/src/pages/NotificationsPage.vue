<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
  batchDeleteNotifications,
  clearNotifications,
  deleteNotification,
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications'
import { formatDateTime } from '@/utils/format'
import type { NotificationItem, NotificationType } from '@/api/types'

const TYPE_META: Record<NotificationType, { label: string; type: 'primary' | 'success' | 'warning' | 'info' }> = {
  comment: { label: '评论', type: 'primary' },
  message: { label: '留言', type: 'success' },
  friendlink: { label: '友链', type: 'warning' },
  system: { label: '系统', type: 'info' },
}

const loading = ref(false)
const rows = ref<NotificationItem[]>([])
const total = ref(0)
const query = reactive({ page: 1, pageSize: 10, unreadOnly: false })

const unreadCount = computed(() => rows.value.filter((item) => !item.isRead).length)

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await getNotifications({
      page: query.page,
      pageSize: query.pageSize,
      ...(query.unreadOnly ? { unreadOnly: true } : {}),
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

async function markRead(item: NotificationItem): Promise<void> {
  if (item.isRead) return
  try {
    await markNotificationRead(item.id)
    item.isRead = true
    if (query.unreadOnly) {
      await load()
    }
  } catch {
    // 请求层已提示
  }
}

async function markAllRead(): Promise<void> {
  try {
    await ElMessageBox.confirm('确定把全部通知标记为已读吗？', '全部已读', {
      confirmButtonText: '标记已读',
      cancelButtonText: '取消',
      type: 'info',
    })
  } catch {
    return
  }

  try {
    await markAllNotificationsRead()
    ElMessage.success('已全部标记为已读')
    await load()
  } catch {
    // 请求层已提示
  }
}

function toggleUnreadOnly(value: string | number | boolean): void {
  query.unreadOnly = value === true || value === 'true'
  query.page = 1
  void load()
}

const selectedIds = ref<number[]>([])

const allSelected = computed(() => rows.value.length > 0 && selectedIds.value.length === rows.value.length)

function isSelected(id: number): boolean {
  return selectedIds.value.includes(id)
}

function toggleSelect(id: number): void {
  selectedIds.value = isSelected(id)
    ? selectedIds.value.filter((item) => item !== id)
    : [...selectedIds.value, id]
}

function toggleSelectAll(): void {
  selectedIds.value = allSelected.value ? [] : rows.value.map((item) => item.id)
}

async function deleteOne(item: NotificationItem): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除这条通知吗？删除后无法恢复。`, '删除通知', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteNotification(item.id)
    selectedIds.value = selectedIds.value.filter((id) => id !== item.id)
    ElMessage.success('已删除')
    if (rows.value.length === 1 && query.page > 1) query.page -= 1
    await load()
  } catch {
    // 请求层已提示
  }
}

async function deleteSelected(): Promise<void> {
  const ids = [...selectedIds.value]
  if (!ids.length) {
    ElMessage.warning('请先勾选要删除的通知')
    return
  }

  try {
    await ElMessageBox.confirm(`确定删除选中的 ${ids.length} 条通知吗？删除后无法恢复。`, '批量删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    const result = await batchDeleteNotifications(ids)
    selectedIds.value = []
    ElMessage.success(`已删除 ${result.affected} 条通知`)
    await load()
  } catch {
    // 请求层已提示
  }
}

async function clearScope(scope: 'read' | 'all'): Promise<void> {
  const label = scope === 'all' ? '全部通知' : '已读通知'
  try {
    await ElMessageBox.confirm(
      scope === 'all' ? '将清空全部通知（含未读），删除后无法恢复，确定继续吗？' : `将清空全部${label}，未读通知会保留，确定继续吗？`,
      scope === 'all' ? '清空全部通知' : '清空已读通知',
      { confirmButtonText: '清空', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  try {
    const result = await clearNotifications(scope)
    selectedIds.value = []
    ElMessage.success(`已清空 ${result.affected} 条通知`)
    query.page = 1
    await load()
  } catch {
    // 请求层已提示
  }
}

function handleSizeChange(): void {
  query.page = 1
  void load()
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="admin-card">
      <template #header>
        <PageHeader title="通知中心" description="评论、留言与友链申请产生的提醒">
          <el-switch :model-value="query.unreadOnly" active-text="只看未读" @change="toggleUnreadOnly" />
          <el-button :icon="Check" :disabled="unreadCount === 0" @click="markAllRead">全部已读</el-button>
          <el-button :disabled="total === 0" @click="clearScope('read')">清空已读</el-button>
          <el-button :disabled="total === 0" type="danger" plain @click="clearScope('all')">清空全部</el-button>
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        </PageHeader>
      </template>

      <div class="mb-3 flex flex-wrap items-center gap-3 text-[12px] text-[var(--text-2)]">
        <el-checkbox :model-value="allSelected" :indeterminate="selectedIds.length > 0 && !allSelected" @change="toggleSelectAll">
          全选本页
        </el-checkbox>
        <span>已选 {{ selectedIds.length }} 条</span>
        <el-button size="small" type="danger" plain :disabled="selectedIds.length === 0" @click="deleteSelected">删除勾选</el-button>
      </div>

      <div class="notice-scroll">
        <div v-loading="loading" class="flex flex-col gap-2">
          <div
            v-for="item in rows"
            :key="item.id"
            class="notice-item"
            :class="{ 'is-unread': !item.isRead }"
          >
            <el-checkbox
              :model-value="isSelected(item.id)"
              class="shrink-0"
              @change="toggleSelect(item.id)"
            />
            <span class="notice-item__dot" :class="{ 'is-visible': !item.isRead }" />
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <el-tag size="small" :type="TYPE_META[item.type].type" effect="light" disable-transitions>
                  {{ TYPE_META[item.type].label }}
                </el-tag>
                <span class="text-[13px] font-medium text-[var(--text)]">{{ item.title }}</span>
                <span class="text-[12px] text-[var(--text-3)]">{{ formatDateTime(item.createdAt) }}</span>
                <span v-if="!item.isRead" class="text-[11px] font-medium text-[var(--el-color-primary)]">未读</span>
              </div>
              <p class="mt-1 text-[12px] leading-5 text-[var(--text-2)]">{{ item.content }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <el-button
                v-if="!item.isRead"
                link
                type="primary"
                size="small"
                @click="markRead(item)"
              >标为已读</el-button>
              <el-button link type="danger" size="small" @click="deleteOne(item)">删除</el-button>
            </div>
          </div>

          <EmptyState
            v-if="!loading && rows.length === 0"
            :title="query.unreadOnly ? '没有未读通知' : '暂无通知'"
            description="有新的评论、留言或友链申请时会在这里提醒你。"
          />
        </div>
      </div>

      <div v-if="total > 0" class="pager">
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
