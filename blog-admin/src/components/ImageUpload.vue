<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { UploadRequestOptions } from 'element-plus'
import { Plus, Delete, Loading } from '@element-plus/icons-vue'
import { uploadFile } from '@/api/upload'
import { resolveAssetUrl } from '@/utils/format'

const props = withDefaults(
  defineProps<{
    modelValue: string | string[]
    multiple?: boolean
    limit?: number
    size?: number
    accept?: string
    maxSizeMb?: number
    disabled?: boolean
    tip?: string
  }>(),
  {
    multiple: false,
    limit: 9,
    size: 96,
    accept: 'image/*',
    maxSizeMb: 5,
    disabled: false,
    tip: '',
  },
)

const emit = defineEmits<{ 'update:modelValue': [value: string | string[]] }>()

interface UploadTask {
  uid: number
  name: string
  percent: number
}

const tasks = ref<UploadTask[]>([])
const previewIndex = ref(-1)

const urls = computed<string[]>(() => {
  const value = props.modelValue
  if (Array.isArray(value)) return value.filter(Boolean)
  return value ? [value] : []
})

const reachedLimit = computed(() => urls.value.length + tasks.value.length >= props.limit)
const canAdd = computed(() => !props.disabled && !reachedLimit.value)
const tileStyle = computed(() => ({ width: `${props.size}px`, height: `${props.size}px` }))

function commit(next: string[]): void {
  emit('update:modelValue', props.multiple ? next : (next[0] ?? ''))
}

function removeAt(index: number): void {
  const next = [...urls.value]
  next.splice(index, 1)
  commit(next)
}

function beforeUpload(file: File): boolean {
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    ElMessage.error(`图片大小不能超过 ${props.maxSizeMb}MB`)
    return false
  }
  return true
}

async function customUpload(options: UploadRequestOptions): Promise<void> {
  const task: UploadTask = { uid: options.file.uid, name: options.file.name, percent: 0 }
  tasks.value = [...tasks.value, task]

  try {
    const result = await uploadFile(options.file, (percent) => {
      task.percent = percent
    })
    commit([...urls.value, result.url])
    options.onSuccess(result)
  } catch (error) {
    options.onError(error as Error & { status: number; method: string; url: string })
  } finally {
    tasks.value = tasks.value.filter((item) => item.uid !== task.uid)
  }
}

function openPreview(index: number): void {
  previewIndex.value = index
}
</script>

<template>
  <div class="upload">
    <div class="upload__grid" :style="{ gap: '10px' }">
      <div
        v-for="(url, index) in urls"
        :key="`${url}-${index}`"
        class="group relative overflow-hidden rounded-[10px] border"
        :style="{ ...tileStyle, borderColor: 'var(--border)', background: 'var(--bg-soft)' }"
      >
        <img
          :src="resolveAssetUrl(url)"
          :alt="`图片 ${index + 1}`"
          class="h-full w-full cursor-zoom-in object-cover"
          @click="openPreview(index)"
        />
        <button
          v-if="!disabled"
          type="button"
          class="absolute top-1 right-1 grid h-6 w-6 cursor-pointer place-items-center rounded-md border-0 bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100"
          aria-label="删除图片"
          @click.stop="removeAt(index)"
        >
          <el-icon :size="13"><Delete /></el-icon>
        </button>
      </div>

      <div
        v-for="task in tasks"
        :key="`task-${task.uid}`"
        class="grid place-items-center rounded-[10px] border border-dashed"
        :style="{ ...tileStyle, borderColor: 'var(--border-strong)', background: 'var(--bg-soft)' }"
      >
        <div class="text-center">
          <el-icon class="animate-spin" :size="18" :style="{ color: 'var(--brand)' }"><Loading /></el-icon>
          <p class="mt-1 max-w-[80px] truncate text-[11px]" :style="{ color: 'var(--text-3)' }">{{ task.name }}</p>
          <p class="text-[11px]" :style="{ color: 'var(--brand)' }">{{ task.percent }}%</p>
        </div>
      </div>

      <el-upload
        v-if="canAdd"
        :http-request="customUpload"
        :show-file-list="false"
        :multiple="multiple"
        :accept="accept"
        :before-upload="beforeUpload"
        :disabled="!canAdd"
      >
        <button
          type="button"
          class="grid cursor-pointer place-items-center rounded-[10px] border border-dashed text-center transition-colors hover:border-[var(--brand)] hover:bg-[var(--brand-soft)]"
          :style="{ ...tileStyle, borderColor: 'var(--border-strong)', background: 'transparent', color: 'var(--text-3)' }"
        >
          <span>
            <el-icon :size="20"><Plus /></el-icon>
            <span class="mt-1 block text-[11px]">上传图片</span>
          </span>
        </button>
      </el-upload>
    </div>

    <p v-if="tip" class="hint mt-1.5">{{ tip }}</p>

    <el-image-viewer
      v-if="previewIndex >= 0"
      :url-list="urls.map((url) => resolveAssetUrl(url))"
      :initial-index="previewIndex"
      teleported
      hide-on-click-modal
      @close="previewIndex = -1"
    />
  </div>
</template>

<style scoped>
.upload__grid {
  display: flex;
  flex-wrap: wrap;
}
</style>
