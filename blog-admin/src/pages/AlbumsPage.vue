<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Picture, Plus, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { createAlbum, deleteAlbum, getAlbums, updateAlbum } from '@/api/albums'
import { ApiError } from '@/api/http'
import { formatDateTime, resolveAssetUrl } from '@/utils/format'
import type { Album } from '@/api/types'

interface AlbumForm {
  name: string
  description: string
  cover: string
}

const router = useRouter()
const loading = ref(false)
const rows = ref<Album[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editing = ref<Album | null>(null)
const formRef = ref<FormInstance>()

const form = reactive<AlbumForm>({ name: '', description: '', cover: '' })

const rules: FormRules<AlbumForm> = {
  name: [
    { required: true, message: '请输入相册名称', trigger: 'blur' },
    { max: 40, message: '名称不能超过 40 字', trigger: 'blur' },
  ],
}

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await getAlbums()
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  dialogError.value = ''
  form.name = ''
  form.description = ''
  form.cover = ''
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function openEdit(row: Album): void {
  editing.value = row
  dialogError.value = ''
  form.name = row.name
  form.description = row.description ?? ''
  form.cover = row.cover ?? ''
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload = {
    name: form.name.trim(),
    ...(form.description.trim() ? { description: form.description.trim() } : {}),
    ...(form.cover ? { cover: form.cover } : {}),
  }

  saving.value = true
  dialogError.value = ''
  try {
    if (editing.value) {
      await updateAlbum(editing.value.id, payload)
      ElMessage.success('相册已更新')
    } else {
      await createAlbum(payload)
      ElMessage.success('相册已创建')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) dialogError.value = error.message
  } finally {
    saving.value = false
  }
}

function openDetail(row: Album): void {
  void router.push({ name: 'AlbumDetail', params: { id: row.id } })
}

async function handleDelete(row: Album): Promise<void> {
  try {
    await ElMessageBox.confirm(
      row.photoCount > 0
        ? `相册「${row.name}」中有 ${row.photoCount} 张照片，删除后照片也会一并移除，确定删除吗？`
        : `确定删除相册「${row.name}」吗？`,
      '删除相册',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteAlbum(row.id)
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
    <el-card shadow="never" class="admin-card admin-card--auto">
      <template #header>
        <PageHeader title="相册" description="按主题整理照片，封面会展示在相册列表">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建相册</el-button>
        </PageHeader>
      </template>

      <div v-loading="loading" class="min-h-[200px]">
        <div v-if="rows.length > 0" class="album-grid">
          <div v-for="row in rows" :key="row.id" class="album-card">
            <div class="album-card__head">
              <button type="button" class="album-card__title" @click="openDetail(row)">{{ row.name }}</button>
              <div class="flex shrink-0 items-center">
                <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </div>
            </div>
            <p class="album-card__desc">
              {{ row.description || `${row.photoCount} 张照片 · ${formatDateTime(row.createdAt)}` }}
            </p>
            <div class="album-card__cover" @click="openDetail(row)">
              <el-image
                v-if="row.cover"
                :src="resolveAssetUrl(row.cover)"
                :alt="row.name"
                fit="cover"
                :preview-src-list="[resolveAssetUrl(row.cover)]"
                preview-teleported
                hide-on-click-modal
              />
              <div v-else class="album-card__cover-empty">
                <el-icon :size="34"><Picture /></el-icon>
                <span>暂无封面</span>
              </div>
            </div>
          </div>
        </div>

        <EmptyState v-else-if="!loading" title="还没有相册" description="把同一主题的照片放进一个相册，读者可以从相册页浏览。">
          <el-button type="primary" size="small" @click="openCreate">新建相册</el-button>
        </EmptyState>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑相册' : '新建相册'"
      width="500px"
      draggable
      destroy-on-close
    >
      <el-alert v-if="dialogError" :title="dialogError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="相册名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：2026 的春天" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" maxlength="160" show-word-limit placeholder="这组照片的故事" />
        </el-form-item>
        <el-form-item label="封面">
          <ImageUpload v-model="form.cover" :size="110" tip="建议横向封面，留空则使用第一张照片" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.album-card__cover {
  cursor: pointer;
}
</style>
