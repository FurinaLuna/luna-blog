<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { ChatDotRound, Delete, Edit, Plus, Refresh, Star } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { createTalk, deleteTalk, getTalks, updateTalk } from '@/api/talks'
import { ApiError } from '@/api/http'
import { formatDateTime, resolveAssetUrl } from '@/utils/format'
import type { Talk } from '@/api/types'

interface TalkForm {
  content: string
  images: string[]
}

const loading = ref(false)
const rows = ref<Talk[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editing = ref<Talk | null>(null)
const formRef = ref<FormInstance>()

const form = reactive<TalkForm>({ content: '', images: [] })

const rules: FormRules<TalkForm> = {
  content: [
    { required: true, message: '说点什么吧', trigger: 'blur' },
    { max: 1000, message: '内容不能超过 1000 字', trigger: 'blur' },
  ],
}

async function load(): Promise<void> {
  loading.value = true
  try {
    const result = await getTalks({ page: page.value, pageSize: pageSize.value })
    rows.value = result.list
    total.value = result.total
  } catch {
    rows.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSizeChange(): void {
  page.value = 1
  void load()
}

function openCreate(): void {
  editing.value = null
  dialogError.value = ''
  form.content = ''
  form.images = []
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function openEdit(row: Talk): void {
  editing.value = row
  dialogError.value = ''
  form.content = row.content
  form.images = [...row.images]
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  dialogError.value = ''
  try {
    const payload = { content: form.content.trim(), images: form.images }
    if (editing.value) {
      await updateTalk(editing.value.id, payload)
      ElMessage.success('说说已更新')
    } else {
      await createTalk(payload)
      ElMessage.success('说说已发布')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) dialogError.value = error.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: Talk): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后说说的点赞与评论也会一并移除，确定删除吗？', '删除说说', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteTalk(row.id)
    ElMessage.success('已删除')
    if (rows.value.length === 1 && page.value > 1) page.value -= 1
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
        <PageHeader title="说说" description="碎片化的短动态，支持最多 9 张图片">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">发布说说</el-button>
        </PageHeader>
      </template>

      <div v-loading="loading" class="talks-scroll">
        <div v-for="item in rows" :key="item.id" class="talk-item">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0 flex-1">
              <p class="mb-0 whitespace-pre-wrap text-[13px] leading-6 text-[var(--text)]">{{ item.content }}</p>
              <div v-if="item.images.length > 0" class="mt-3 flex flex-wrap gap-1.5">
                <el-image
                  v-for="(url, index) in item.images"
                  :key="`${item.id}-${index}`"
                  :src="resolveAssetUrl(url)"
                  :preview-src-list="item.images.map(resolveAssetUrl)"
                  :initial-index="index"
                  fit="cover"
                  class="h-[108px] w-[108px] rounded"
                  preview-teleported
                  hide-on-click-modal
                />
              </div>
              <div class="mt-2.5 flex flex-wrap items-center gap-4 text-[12px] text-[var(--text-3)]">
                <span>{{ formatDateTime(item.createdAt) }}</span>
                <span class="inline-flex items-center gap-1"><el-icon><Star /></el-icon>{{ item.likeCount }}</span>
                <span class="inline-flex items-center gap-1">
                  <el-icon><ChatDotRound /></el-icon>{{ item.commentCount }}
                </span>
              </div>
            </div>
            <div class="flex shrink-0 items-center">
              <el-button link type="primary" size="small" :icon="Edit" @click="openEdit(item)">编辑</el-button>
              <el-button link type="danger" size="small" :icon="Delete" @click="handleDelete(item)">删除</el-button>
            </div>
          </div>
        </div>

        <EmptyState v-if="!loading && rows.length === 0" title="还没有说说" description="随手记录一点此刻的想法，会展示在博客说说页。">
          <el-button type="primary" size="small" @click="openCreate">发布说说</el-button>
        </EmptyState>
      </div>

      <div v-if="total > 0" class="pager">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 30]"
          layout="total, sizes, prev, pager, next"
          background
          @current-change="load"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑说说' : '发布说说'"
      width="580px"
      draggable
      destroy-on-close
    >
      <el-alert v-if="dialogError" :title="dialogError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="5"
            maxlength="1000"
            show-word-limit
            placeholder="现在的心情、随手拍的风景…"
          />
        </el-form-item>
        <el-form-item label="图片（最多 9 张）">
          <ImageUpload v-model="form.images" multiple :limit="9" :size="84" tip="支持 jpg/png/webp/gif，单张不超过 5MB" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">{{ editing ? '保存' : '发布' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.talks-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.talk-item {
  padding: 14px 16px;
  background-color: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

.talk-item + .talk-item {
  margin-top: 10px;
}

.talk-item:hover {
  border-color: var(--el-color-primary-light-7);
}
</style>
