<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import StatusTag from '@/components/StatusTag.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import {
  createFriendLink,
  deleteFriendLink,
  getAdminFriendLinks,
  reviewFriendLink,
  updateFriendLink,
} from '@/api/friendLinks'
import { ApiError } from '@/api/http'
import { formatDateTime, resolveAssetUrl } from '@/utils/format'
import type { FriendLink, ReviewStatus } from '@/api/types'

interface LinkForm {
  name: string
  url: string
  avatar: string
  description: string
  sort: number
  status: ReviewStatus
}

const loading = ref(false)
const rows = ref<FriendLink[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editing = ref<FriendLink | null>(null)
const formRef = ref<FormInstance>()

const form = reactive<LinkForm>({
  name: '',
  url: '',
  avatar: '',
  description: '',
  sort: 0,
  status: 'approved',
})

const rules: FormRules<LinkForm> = {
  name: [{ required: true, message: '请输入站点名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入站点地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入以 http(s):// 开头的完整地址', trigger: 'blur' },
  ],
}

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await getAdminFriendLinks()
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  dialogError.value = ''
  form.name = ''
  form.url = ''
  form.avatar = ''
  form.description = ''
  form.sort = rows.value.length
  form.status = 'approved'
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function openEdit(row: FriendLink): void {
  editing.value = row
  dialogError.value = ''
  form.name = row.name
  form.url = row.url
  form.avatar = row.avatar ?? ''
  form.description = row.description ?? ''
  form.sort = row.sort
  form.status = row.status
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  dialogError.value = ''
  try {
    if (editing.value) {
      await updateFriendLink(editing.value.id, {
        name: form.name.trim(),
        url: form.url.trim(),
        avatar: form.avatar,
        description: form.description.trim(),
        sort: form.sort,
        status: form.status,
      })
      ElMessage.success('友链已更新')
    } else {
      await createFriendLink({
        name: form.name.trim(),
        url: form.url.trim(),
        avatar: form.avatar,
        description: form.description.trim(),
        sort: form.sort,
        status: form.status,
      })
      ElMessage.success(form.status === 'approved' ? '友链已新增并上线' : '友链已新增，等待审核')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) dialogError.value = error.message
  } finally {
    saving.value = false
  }
}

async function review(row: FriendLink, status: ReviewStatus): Promise<void> {
  const action = status === 'approved' ? '通过' : '拒绝'
  try {
    await ElMessageBox.confirm(`确定${action}友链「${row.name}」吗？`, `${action}友链`, {
      confirmButtonText: action,
      cancelButtonText: '取消',
      type: status === 'rejected' ? 'warning' : 'info',
    })
  } catch {
    return
  }

  try {
    await reviewFriendLink(row.id, status)
    ElMessage.success(`已${action}`)
    await load()
  } catch {
    // 请求层已提示
  }
}

async function handleDelete(row: FriendLink): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除友链「${row.name}」吗？删除后无法恢复。`, '删除友链', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteFriendLink(row.id)
    ElMessage.success('已删除')
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
        <PageHeader title="友情链接" description="通过审核的友链会展示在博客友链页">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">新增友链</el-button>
        </PageHeader>
      </template>

      <div class="table-toolbar">
        <span class="text-[12px] text-[var(--text-3)]">共 {{ rows.length }} 条友链</span>
      </div>

      <div class="table-flex">
        <el-table v-loading="loading" :data="rows" row-key="id" height="100%" border style="width: 100%">
          <el-table-column label="站点" min-width="220">
            <template #default="{ row }">
              <div class="flex items-center gap-3 py-1">
                <el-avatar :size="36" shape="square" :src="row.avatar ? resolveAssetUrl(row.avatar) : undefined">
                  {{ row.name.slice(0, 1) }}
                </el-avatar>
                <div class="min-w-0">
                  <div class="truncate text-[13px] font-medium text-[var(--text)]">{{ row.name }}</div>
                  <a
                    class="block max-w-[220px] truncate text-[12px] text-[var(--brand)] hover:underline"
                    :href="row.url"
                    target="_blank"
                    rel="noopener noreferrer"
                  >{{ row.url }}</a>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="描述" min-width="240">
            <template #default="{ row }">
              <span class="clamp-2 text-[12px] leading-5 text-[var(--text-2)]">{{ row.description || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="96" align="center">
            <template #default="{ row }">
              <StatusTag :status="row.status" />
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column label="申请时间" width="150" align="center">
            <template #default="{ row }">
              <span class="text-[12px] text-[var(--text-2)]">{{ formatDateTime(row.createdAt) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="220" align="center" fixed="right">
            <template #default="{ row }">
              <el-button v-if="row.status !== 'approved'" link type="success" size="small" @click="review(row, 'approved')">通过</el-button>
              <el-button v-if="row.status !== 'rejected'" link type="warning" size="small" @click="review(row, 'rejected')">拒绝</el-button>
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <EmptyState title="还没有友链" description="读者可以在前台提交友链申请，这里会显示待审核记录。">
              <el-button type="primary" size="small" @click="openCreate">新增友链</el-button>
            </EmptyState>
          </template>
        </el-table>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑友链' : '新增友链'"
      width="520px"
      draggable
      destroy-on-close
    >
      <el-alert v-if="dialogError" :title="dialogError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="站点名称" prop="name">
            <el-input v-model="form.name" placeholder="Luna 的小站" maxlength="40" />
          </el-form-item>
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
          </el-form-item>
        </div>
        <el-form-item label="站点地址" prop="url">
          <el-input v-model="form.url" placeholder="example.com" />
        </el-form-item>
        <el-form-item label="头像">
          <ImageUpload v-model="form.avatar" :size="88" tip="建议正方形，留空则显示首字" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="120" show-word-limit placeholder="一句话介绍这个站点" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio-button value="approved">通过</el-radio-button>
            <el-radio-button value="pending">待审核</el-radio-button>
            <el-radio-button value="rejected">拒绝</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
