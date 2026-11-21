<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules, UploadUserFile } from 'element-plus'
import { ArrowLeft, Delete, Edit, Plus, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { addAlbumPhotos, deletePhoto, getAlbum, updateAlbum, updatePhoto } from '@/api/albums'
import { uploadFile } from '@/api/upload'
import { ApiError } from '@/api/http'
import { formatDateTime, resolveAssetUrl } from '@/utils/format'
import type { AlbumDetail, Photo } from '@/api/types'

interface AlbumForm {
  name: string
  description: string
  cover: string
}

const route = useRoute()
const router = useRouter()
const albumId = computed(() => Number(route.params.id) || 0)

const loading = ref(false)
const loadFailed = ref(false)
const album = ref<AlbumDetail | null>(null)

const fileList = ref<UploadUserFile[]>([])
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadTotal = ref(0)
const uploadDone = ref(0)

const albumDialogVisible = ref(false)
const albumSaving = ref(false)
const albumError = ref('')
const albumFormRef = ref<FormInstance>()
const albumForm = reactive<AlbumForm>({ name: '', description: '', cover: '' })

const photoDialogVisible = ref(false)
const photoSaving = ref(false)
const photoTarget = ref<Photo | null>(null)
const photoTitle = ref('')

const albumRules: FormRules<AlbumForm> = {
  name: [{ required: true, message: '请输入相册名称', trigger: 'blur' }],
}

async function load(): Promise<void> {
  if (!albumId.value) {
    loadFailed.value = true
    return
  }
  loading.value = true
  loadFailed.value = false
  try {
    album.value = await getAlbum(albumId.value)
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

async function uploadSelected(): Promise<void> {
  // UploadUserFile.raw 的类型是 UploadRawFile（File 的子类型），不能写 `raw is File`
  // 谓词（TS 认为谓词类型必须是参数类型的子集），这里用循环 + instanceof 收窄。
  const files: File[] = []
  for (const item of fileList.value) {
    const raw = item.raw
    if (raw instanceof File) files.push(raw)
  }

  if (files.length === 0) {
    ElMessage.warning('请先选择要上传的照片')
    return
  }

  uploading.value = true
  uploadTotal.value = files.length
  uploadDone.value = 0
  uploadProgress.value = 0

  try {
    const urls: string[] = []
    for (const file of files) {
      const result = await uploadFile(file)
      urls.push(result.url)
      uploadDone.value += 1
      uploadProgress.value = Math.round((uploadDone.value / uploadTotal.value) * 100)
    }
    await addAlbumPhotos(albumId.value, urls.map((url) => ({ url })))
    ElMessage.success(`已上传 ${urls.length} 张照片`)
    fileList.value = []
    await load()
  } catch {
    // 请求层已提示
  } finally {
    uploading.value = false
    uploadProgress.value = 0
  }
}

function onExceed(): void {
  ElMessage.warning('一次最多上传 20 张')
}

function clearSelection(): void {
  fileList.value = []
}

function openAlbumEdit(): void {
  if (!album.value) return
  albumError.value = ''
  albumForm.name = album.value.name
  albumForm.description = album.value.description ?? ''
  albumForm.cover = album.value.cover ?? ''
  albumDialogVisible.value = true
  void albumFormRef.value?.clearValidate()
}

async function submitAlbum(): Promise<void> {
  const valid = await albumFormRef.value?.validate().catch(() => false)
  if (!valid) return

  albumSaving.value = true
  albumError.value = ''
  try {
    await updateAlbum(albumId.value, {
      name: albumForm.name.trim(),
      ...(albumForm.description.trim() ? { description: albumForm.description.trim() } : {}),
      ...(albumForm.cover ? { cover: albumForm.cover } : {}),
    })
    ElMessage.success('相册信息已更新')
    albumDialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) albumError.value = error.message
  } finally {
    albumSaving.value = false
  }
}

function openPhotoEdit(photo: Photo): void {
  photoTarget.value = photo
  photoTitle.value = photo.title ?? ''
  photoDialogVisible.value = true
}

async function submitPhoto(): Promise<void> {
  if (!photoTarget.value) return
  photoSaving.value = true
  try {
    await updatePhoto(photoTarget.value.id, { title: photoTitle.value.trim() })
    ElMessage.success('标题已保存')
    photoDialogVisible.value = false
    await load()
  } catch {
    // 请求层已提示
  } finally {
    photoSaving.value = false
  }
}

async function handleDeletePhoto(photo: Photo): Promise<void> {
  try {
    await ElMessageBox.confirm('删除后照片将从相册中移除，确定删除吗？', '删除照片', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deletePhoto(photo.id)
    ElMessage.success('已删除')
    await load()
  } catch {
    // 请求层已提示
  }
}

function goBack(): void {
  void router.push({ name: 'Albums' })
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="mb-3">
      <PageHeader :title="album?.name ?? '相册详情'" :description="album?.description ?? '管理这个相册中的照片'">
        <el-button :icon="ArrowLeft" @click="goBack">返回相册</el-button>
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Edit" :disabled="!album" @click="openAlbumEdit">编辑相册</el-button>
      </PageHeader>
    </el-card>

    <el-card v-if="loading && !album" shadow="never">
      <el-skeleton :rows="6" animated />
    </el-card>

    <el-card v-else-if="loadFailed || !album" shadow="never">
      <el-result icon="error" title="相册加载失败" sub-title="相册可能已被删除，或后端服务不可用">
        <template #extra>
          <el-button @click="goBack">返回相册列表</el-button>
          <el-button type="primary" @click="load">重试</el-button>
        </template>
      </el-result>
    </el-card>

    <template v-else>
      <el-card shadow="never" class="mb-3">
        <template #header>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span class="text-[14px] font-semibold text-[var(--text-2)]">上传照片</span>
            <span class="text-[12px] text-[var(--text-3)]">
              {{ album.photoCount }} 张 · 创建于 {{ formatDateTime(album.createdAt) }}
            </span>
          </div>
        </template>

        <el-upload
          v-model:file-list="fileList"
          :auto-upload="false"
          :limit="20"
          multiple
          accept="image/*"
          list-type="picture-card"
          :on-exceed="onExceed"
        >
          <el-icon><Plus /></el-icon>
        </el-upload>

        <div class="mt-3 flex flex-wrap items-center gap-3">
          <el-button type="primary" :loading="uploading" :disabled="fileList.length === 0" @click="uploadSelected">
            {{ fileList.length > 0 ? `上传 ${fileList.length} 张` : '上传照片' }}
          </el-button>
          <el-button v-if="fileList.length > 0 && !uploading" @click="clearSelection">清空选择</el-button>
          <span v-if="uploading" class="text-[12px] text-[var(--text-2)]">
            正在上传 {{ uploadDone }} / {{ uploadTotal }}（{{ uploadProgress }}%）
          </span>
          <span v-else class="text-[12px] text-[var(--text-3)]">支持一次选择多张，单张不超过 5MB</span>
        </div>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <span class="text-[14px] font-semibold text-[var(--text-2)]">照片（{{ album.photos.length }}）</span>
        </template>

        <div v-if="album.photos.length > 0" class="photo-grid">
          <div v-for="(photo, index) in album.photos" :key="photo.id" class="photo-tile">
            <el-image
              :src="resolveAssetUrl(photo.url)"
              :preview-src-list="album.photos.map((item) => resolveAssetUrl(item.url))"
              :initial-index="index"
              fit="cover"
              preview-teleported
              hide-on-click-modal
            />
            <div class="photo-tile__title">{{ photo.title || `照片 #${photo.id}` }}</div>
            <div class="photo-tile__ops">
              <el-button size="small" circle :icon="Edit" @click.stop="openPhotoEdit(photo)" />
              <el-button size="small" circle type="danger" :icon="Delete" @click.stop="handleDeletePhoto(photo)" />
            </div>
          </div>
        </div>

        <EmptyState v-else title="相册还是空的" description="用上方选择器挑几张照片，上传后会按顺序展示。" />
      </el-card>
    </template>

    <el-dialog v-model="albumDialogVisible" title="编辑相册" width="500px" draggable destroy-on-close>
      <el-alert v-if="albumError" :title="albumError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="albumFormRef" :model="albumForm" :rules="albumRules" label-position="top" @submit.prevent="submitAlbum">
        <el-form-item label="相册名称" prop="name">
          <el-input v-model="albumForm.name" maxlength="40" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="albumForm.description" type="textarea" :rows="3" maxlength="160" show-word-limit />
        </el-form-item>
        <el-form-item label="封面">
          <ImageUpload v-model="albumForm.cover" :size="110" tip="建议横向封面，留空则使用第一张照片" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="albumDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="albumSaving" @click="submitAlbum">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="photoDialogVisible" title="照片标题" width="420px" draggable destroy-on-close>
      <el-input v-model="photoTitle" maxlength="60" show-word-limit placeholder="给这张照片起个名字（可留空）" />
      <template #footer>
        <el-button @click="photoDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="photoSaving" @click="submitPhoto">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
