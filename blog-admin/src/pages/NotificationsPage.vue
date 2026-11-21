<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import {
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
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        </PageHeader>
      </template>

      <div class="notice-scroll">
        <div v-loading="loading" class="flex flex-col gap-2">
          <div
            v-for="item in rows"
            :key="item.id"
            class="notice-item"
            :class="{ 'is-unread': !item.isRead }"
          >
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
            <el-button
              v-if="!item.isRead"
              link
              type="primary"
              size="small"
              class="shrink-0"
              @click="markRead(item)"
            >标为已读</el-button>
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
