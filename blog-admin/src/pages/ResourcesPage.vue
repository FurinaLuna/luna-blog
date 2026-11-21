<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { createResource, deleteResource, getResources, updateResource } from '@/api/resources'
import { ApiError } from '@/api/http'
import { resolveAssetUrl } from '@/utils/format'
import type { Resource, ResourcePayload } from '@/api/types'

interface ResourceForm {
  name: string
  url: string
  description: string
  icon: string
  category: string
  sort: number
}

type IconMode = 'emoji' | 'image'

const loading = ref(false)
const rows = ref<Resource[]>([])
const keyword = ref('')
const categoryFilter = ref('')
const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editing = ref<Resource | null>(null)
const formRef = ref<FormInstance>()
const iconMode = ref<IconMode>('emoji')

const form = reactive<ResourceForm>({
  name: '',
  url: '',
  description: '',
  icon: '',
  category: '',
  sort: 0,
})

const rules: FormRules<ResourceForm> = {
  name: [{ required: true, message: '请输入资源名称', trigger: 'blur' }],
  url: [
    { required: true, message: '请输入资源地址', trigger: 'blur' },
    { pattern: /^https?:\/\/.+/, message: '请输入以 http(s):// 开头的完整地址', trigger: 'blur' },
  ],
}

const categories = computed<string[]>(() => {
  const set = new Set<string>()
  for (const item of rows.value) {
    if (item.category) set.add(item.category)
  }
  return [...set]
})

const filtered = computed<Resource[]>(() => {
  const q = keyword.value.trim().toLowerCase()
  return rows.value.filter((item) => {
    if (categoryFilter.value && item.category !== categoryFilter.value) return false
    if (!q) return true
    return (
      item.name.toLowerCase().includes(q) ||
      item.url.toLowerCase().includes(q) ||
      (item.description ?? '').toLowerCase().includes(q)
    )
  })
})

function isImageIcon(icon: string | null): boolean {
  if (!icon) return false
  return icon.startsWith('/') || icon.startsWith('http') || icon.startsWith('data:')
}

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await getResources()
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  dialogError.value = ''
  form.name = ''
  form.url = ''
  form.description = ''
  form.icon = ''
  form.category = categoryFilter.value
  form.sort = rows.value.length
  iconMode.value = 'emoji'
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function openEdit(row: Resource): void {
  editing.value = row
  dialogError.value = ''
  form.name = row.name
  form.url = row.url
  form.description = row.description ?? ''
  form.icon = row.icon ?? ''
  form.category = row.category ?? ''
  form.sort = row.sort
  iconMode.value = isImageIcon(row.icon) ? 'image' : 'emoji'
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function switchIconMode(mode: IconMode): void {
  if (iconMode.value === mode) return
  iconMode.value = mode
  form.icon = ''
}

function onIconModeChange(value: string | number | boolean): void {
  switchIconMode(value === 'image' ? 'image' : 'emoji')
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: ResourcePayload = {
    name: form.name.trim(),
    url: form.url.trim(),
    sort: form.sort,
  }
  if (form.description.trim()) payload.description = form.description.trim()
  if (form.icon.trim()) payload.icon = form.icon.trim()
  if (form.category.trim()) payload.category = form.category.trim()

  saving.value = true
  dialogError.value = ''
  try {
    if (editing.value) {
      await updateResource(editing.value.id, payload)
      ElMessage.success('资源已更新')
    } else {
      await createResource(payload)
      ElMessage.success('资源已创建')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) dialogError.value = error.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: Resource): Promise<void> {
  try {
    await ElMessageBox.confirm(`确定删除资源「${row.name}」吗？`, '删除资源', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  try {
    await deleteResource(row.id)
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
    <PageHeader title="资源推荐" description="收藏的站点与工具，按分类展示在博客资源页">
      <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新增资源</el-button>
    </PageHeader>

    <div class="panel panel--pad">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          class="w-[240px]"
          placeholder="搜索名称 / 地址 / 描述"
          clearable
          :prefix-icon="Search"
        />
        <el-select v-model="categoryFilter" class="w-[160px]" placeholder="全部分类" clearable>
          <el-option v-for="item in categories" :key="item" :label="item" :value="item" />
        </el-select>
        <span class="hint ml-auto">{{ filtered.length }} 条</span>
      </div>

      <el-table v-loading="loading" :data="filtered" row-key="id" style="width: 100%">
        <el-table-column label="图标" width="76" align="center">
          <template #default="{ row }">
            <img
              v-if="isImageIcon(row.icon)"
              :src="resolveAssetUrl(row.icon)"
              alt=""
              class="mx-auto h-8 w-8 rounded-md object-cover"
            />
            <span v-else class="text-[18px]">{{ row.icon || '🔗' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="名称" min-width="180">
          <template #default="{ row }">
            <a
              class="text-[13px] font-medium hover:underline"
              :style="{ color: 'var(--text)' }"
              :href="row.url"
              target="_blank"
              rel="noopener noreferrer"
            >{{ row.name }}</a>
          </template>
        </el-table-column>
        <el-table-column label="地址" min-width="220">
          <template #default="{ row }">
            <span class="clamp-1 text-[12px]" :style="{ color: 'var(--text-2)' }">{{ row.url }}</span>
          </template>
        </el-table-column>
        <el-table-column label="描述" min-width="220">
          <template #default="{ row }">
            <span class="clamp-1 text-[12px]" :style="{ color: 'var(--text-2)' }">{{ row.description || '—' }}</span>
          </template>
        </el-table-column>
        <el-table-column label="分类" width="120">
          <template #default="{ row }">
            <el-tag v-if="row.category" size="small" effect="plain" disable-transitions>{{ row.category }}</el-tag>
            <span v-else class="text-[12px]" :style="{ color: 'var(--text-3)' }">—</span>
          </template>
        </el-table-column>
        <el-table-column prop="sort" label="排序" width="76" align="center" />
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState
            :title="rows.length === 0 ? '还没有资源' : '没有匹配的资源'"
            description="把常去的站点和好用的工具整理到这里。"
          >
            <el-button v-if="rows.length === 0" type="primary" size="small" @click="openCreate">新增资源</el-button>
          </EmptyState>
        </template>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑资源' : '新增资源'" width="520px" destroy-on-close>
      <el-alert v-if="dialogError" :title="dialogError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <div class="grid grid-cols-2 gap-x-4">
          <el-form-item label="名称" prop="name">
            <el-input v-model="form.name" placeholder="资源名称" maxlength="40" />
          </el-form-item>
          <el-form-item label="分类">
            <el-input v-model="form.category" placeholder="例如：设计工具" maxlength="20" />
          </el-form-item>
        </div>
        <el-form-item label="地址" prop="url">
          <el-input v-model="form.url" placeholder="example.com" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="2" maxlength="120" show-word-limit placeholder="一句话说明这个资源" />
        </el-form-item>
        <el-form-item label="图标">
          <div class="w-full">
            <el-radio-group :model-value="iconMode" size="small" class="mb-2" @change="onIconModeChange">
              <el-radio-button value="emoji">Emoji</el-radio-button>
              <el-radio-button value="image">图片</el-radio-button>
            </el-radio-group>
            <div v-if="iconMode === 'emoji'" class="flex items-center gap-3">
              <el-input v-model="form.icon" class="w-[140px]" placeholder="🔗" maxlength="8" />
              <span class="hint">输入一个 emoji，例如 🔗 📚 🎨</span>
            </div>
            <ImageUpload v-else v-model="form.icon" :size="72" tip="建议 1:1 小图标" />
          </div>
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="9999" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
