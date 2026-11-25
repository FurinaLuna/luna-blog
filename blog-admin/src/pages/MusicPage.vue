<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Headset, Plus, Refresh, UploadFilled, VideoPlay, VideoPause, Sort } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { createMusic, deleteMusic, getAdminMusic, reorderMusic, updateMusic } from '@/api/music'
import type { Music, MusicPayload } from '@/api/music'
import { uploadFile } from '@/api/upload'
import { ApiError } from '@/api/http'
import { resolveAssetUrl } from '@/utils/format'

interface MusicForm {
  title: string
  artist: string
  album: string
  cover: string
  url: string
  lrc: string
  sort: number
  enabled: boolean
}

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const rows = ref<Music[]>([])
const keyword = ref('')
const dialogVisible = ref(false)
const dialogError = ref('')
const editing = ref<Music | null>(null)
const formRef = ref<FormInstance>()
const audioInput = ref<HTMLInputElement>()

const previewId = ref<number | null>(null)
const previewAudio = ref<HTMLAudioElement>()

const form = ref<MusicForm>({
  title: '',
  artist: '',
  album: '',
  cover: '',
  url: '',
  lrc: '',
  sort: 0,
  enabled: true,
})

const rules: FormRules<MusicForm> = {
  title: [{ required: true, message: '请输入歌名', trigger: 'blur' }],
  url: [{ required: true, message: '请上传音频或填写音频地址', trigger: 'change' }],
}

const filtered = computed<Music[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.artist.toLowerCase().includes(q) ||
      item.album.toLowerCase().includes(q),
  )
})

const enabledCount = computed(() => rows.value.filter((item) => item.enabled).length)

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await getAdminMusic()
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  dialogError.value = ''
  form.value.title = ''
  form.value.artist = ''
  form.value.album = ''
  form.value.cover = ''
  form.value.url = ''
  form.value.lrc = ''
  form.value.sort = rows.value.length
  form.value.enabled = true
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function openEdit(row: Music): void {
  editing.value = row
  dialogError.value = ''
  form.value.title = row.title
  form.value.artist = row.artist
  form.value.album = row.album
  form.value.cover = row.cover
  form.value.url = row.url
  form.value.lrc = row.lrc
  form.value.sort = row.sort
  form.value.enabled = row.enabled
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function pickAudio(): void {
  audioInput.value?.click()
}

async function onAudioPicked(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  if (file.size > 20 * 1024 * 1024) {
    ElMessage.error('音频请控制在 20MB 以内')
    return
  }

  uploading.value = true
  try {
    const result = await uploadFile(file)
    form.value.url = result.url
    if (!form.value.title) form.value.title = file.name.replace(/\.[^.]+$/, '')
    ElMessage.success('音频已上传')
  } catch (error) {
    if (error instanceof ApiError) ElMessage.error(error.message)
  } finally {
    uploading.value = false
  }
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: MusicPayload = {
    title: form.value.title.trim(),
    url: form.value.url.trim(),
    sort: form.value.sort,
    enabled: form.value.enabled,
  }
  if (form.value.artist.trim()) payload.artist = form.value.artist.trim()
  if (form.value.album.trim()) payload.album = form.value.album.trim()
  if (form.value.cover.trim()) payload.cover = form.value.cover.trim()
  if (form.value.lrc.trim()) payload.lrc = form.value.lrc.trim()

  saving.value = true
  dialogError.value = ''
  try {
    if (editing.value) {
      await updateMusic(editing.value.id, payload)
      ElMessage.success('歌曲已更新')
    } else {
      await createMusic(payload)
      ElMessage.success('歌曲已添加')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) dialogError.value = error.message
  } finally {
    saving.value = false
  }
}

async function onToggle(row: Music): Promise<void> {
  const next = row.enabled
  try {
    await updateMusic(row.id, {
      title: row.title,
      artist: row.artist,
      album: row.album,
      cover: row.cover,
      url: row.url,
      lrc: row.lrc,
      sort: row.sort,
      enabled: next,
    })
    ElMessage.success(next ? '已启用' : '已停用')
  } catch {
    row.enabled = !next
  }
}

async function move(index: number, delta: number): Promise<void> {
  const target = index + delta
  if (target < 0 || target >= rows.value.length) return

  const next = [...rows.value]
  const [item] = next.splice(index, 1)
  next.splice(target, 0, item)

  rows.value = next
  try {
    rows.value = await reorderMusic(next.map((row, i) => ({ id: row.id, sort: i })))
  } catch {
    await load()
  }
}

async function handleDelete(row: Music): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除歌曲「${row.title}」吗？`, '删除歌曲', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteMusic(row.id)
    ElMessage.success('已删除')
    await load()
  } catch {
    // 请求层已提示
  }
}

function togglePreview(row: Music): void {
  const audio = previewAudio.value
  if (!audio) return

  if (previewId.value === row.id) {
    audio.pause()
    previewId.value = null
    return
  }

  audio.src = resolveAssetUrl(row.url)
  audio.currentTime = 0
  previewId.value = row.id
  void audio.play().catch(() => {
    ElMessage.error('无法播放这首歌，请检查音频地址')
    previewId.value = null
  })
}

onBeforeUnmount(() => {
  previewAudio.value?.pause()
})

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="admin-card">
      <template #header>
        <PageHeader title="音乐管理" description="站内自建歌单：上传音频后前台左侧唱片球按此顺序播放">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">添加歌曲</el-button>
        </PageHeader>
      </template>

      <div class="table-toolbar">
        <div class="flex flex-wrap items-center gap-3">
          <el-input v-model="keyword" class="w-[260px]" placeholder="搜索歌名 / 歌手 / 专辑" clearable />
          <span class="text-[12px] text-[var(--text-3)]">
            共 {{ rows.length }} 首 · 启用 {{ enabledCount }} 首
          </span>
        </div>
        <span class="text-[12px] text-[var(--text-3)]">前台音源在「站点配置 → 音乐」切换</span>
      </div>

      <div class="table-flex">
        <el-table v-loading="loading" :data="filtered" row-key="id" height="100%" border style="width: 100%">
          <el-table-column label="封面" width="72" align="center">
            <template #default="{ row }">
              <img
                v-if="row.cover"
                :src="resolveAssetUrl(row.cover)"
                alt=""
                class="mx-auto h-10 w-10 rounded object-cover"
              />
              <div v-else class="mx-auto flex h-10 w-10 items-center justify-center rounded bg-[var(--fill-2)]">
                <el-icon class="text-[16px] text-[var(--text-3)]"><Headset /></el-icon>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="歌名" min-width="180">
            <template #default="{ row }">
              <div class="text-[13px] font-medium text-[var(--text)]">{{ row.title }}</div>
              <div class="clamp-1 text-[11px] text-[var(--text-3)]">{{ row.url }}</div>
            </template>
          </el-table-column>
          <el-table-column label="歌手" width="150">
            <template #default="{ row }">
              <span class="text-[12px] text-[var(--text-2)]">{{ row.artist || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="专辑" width="150">
            <template #default="{ row }">
              <span class="clamp-1 text-[12px] text-[var(--text-2)]">{{ row.album || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="启用" width="88" align="center">
            <template #default="{ row }">
              <el-switch v-model="row.enabled" @change="onToggle(row)" />
            </template>
          </el-table-column>
          <el-table-column label="排序" width="110" align="center">
            <template #default="{ $index }">
              <el-button link :icon="Sort" size="small" :disabled="$index === 0" @click="move($index, -1)" />
              <el-button
                link
                :icon="Sort"
                size="small"
                :disabled="$index === rows.length - 1"
                @click="move($index, 1)"
              />
            </template>
          </el-table-column>
          <el-table-column label="试听" width="76" align="center">
            <template #default="{ row }">
              <el-button
                link
                type="primary"
                size="small"
                :icon="previewId === row.id ? VideoPause : VideoPlay"
                @click="togglePreview(row)"
              />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="140" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <EmptyState
              :title="rows.length === 0 ? '歌单还是空的' : '没有匹配的歌曲'"
              description="上传 mp3 / m4a 后，前台左侧唱片球就会出现。"
            >
              <el-button v-if="rows.length === 0" type="primary" size="small" @click="openCreate">添加歌曲</el-button>
            </EmptyState>
          </template>
        </el-table>
      </div>
    </el-card>

    <audio ref="previewAudio" class="hidden" @ended="previewId = null" />
    <input ref="audioInput" type="file" accept="audio/*" class="hidden" @change="onAudioPicked" />

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑歌曲' : '添加歌曲'" width="560px" draggable destroy-on-close>
      <el-alert v-if="dialogError" :title="dialogError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="歌名" prop="title">
            <el-input v-model="form.title" placeholder="歌曲名称" maxlength="150" />
          </el-form-item>
          <el-form-item label="歌手">
            <el-input v-model="form.artist" placeholder="歌手 / 演奏者" maxlength="120" />
          </el-form-item>
        </div>
        <el-form-item label="专辑">
          <el-input v-model="form.album" placeholder="可选" maxlength="120" />
        </el-form-item>
        <el-form-item label="音频文件" prop="url">
          <div class="w-full">
            <div class="flex items-center gap-2">
              <el-button :icon="UploadFilled" :loading="uploading" @click="pickAudio">上传音频</el-button>
              <span class="text-[12px] text-[var(--text-3)]">mp3 / m4a / aac / wav / ogg，建议 ≤10MB</span>
            </div>
            <el-input v-model="form.url" class="mt-2" placeholder="/uploads/... 或 https:// 直链" />
          </div>
        </el-form-item>
        <el-form-item label="封面">
          <ImageUpload v-model="form.cover" :size="88" tip="建议 1:1（可留空，前台用渐变占位）" />
        </el-form-item>
        <el-form-item label="歌词链接（可选）">
          <el-input v-model="form.lrc" placeholder="/uploads/xxx.lrc，留空则只显示歌名" maxlength="500" />
        </el-form-item>
        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="排序">
            <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
          </el-form-item>
          <el-form-item label="启用">
            <el-switch v-model="form.enabled" />
          </el-form-item>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.hidden {
  display: none;
}
</style>
