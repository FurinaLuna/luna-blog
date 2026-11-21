<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { createTag, deleteTag, getTags, updateTag } from '@/api/tags'
import { ApiError } from '@/api/http'
import type { Tag, TagPayload } from '@/api/types'

interface TagForm {
  name: string
  slug: string
  color: string
}

const PRESET_COLORS = ['#2f8f83', '#e07a3f', '#5b8def', '#8a63d2', '#c0523c', '#3f8f5f', '#c98a35', '#6f6a62']

const loading = ref(false)
const rows = ref<Tag[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editing = ref<Tag | null>(null)
const formRef = ref<FormInstance>()

const form = reactive<TagForm>({ name: '', slug: '', color: PRESET_COLORS[0] })

const rules: FormRules<TagForm> = {
  name: [
    { required: true, message: '请输入标签名称', trigger: 'blur' },
    { max: 20, message: '名称不能超过 20 字', trigger: 'blur' },
  ],
}

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await getTags()
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  dialogError.value = ''
  form.name = ''
  form.slug = ''
  form.color = PRESET_COLORS[0]
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function openEdit(row: Tag): void {
  editing.value = row
  dialogError.value = ''
  form.name = row.name
  form.slug = row.slug
  form.color = row.color || PRESET_COLORS[0]
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: TagPayload = {
    name: form.name.trim(),
    color: form.color,
  }
  if (form.slug.trim()) payload.slug = form.slug.trim()

  saving.value = true
  dialogError.value = ''
  try {
    if (editing.value) {
      await updateTag(editing.value.id, payload)
      ElMessage.success('标签已更新')
    } else {
      await createTag(payload)
      ElMessage.success('标签已创建')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) dialogError.value = error.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: Tag): Promise<void> {
  try {
    await ElMessageBox.confirm(
      row.articleCount > 0
        ? `标签「${row.name}」被 ${row.articleCount} 篇文章使用，删除后这些文章将失去该标签，确定删除吗？`
        : `确定删除标签「${row.name}」吗？`,
      '删除标签',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteTag(row.id)
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
    <PageHeader title="标签管理" description="标签描述文章的具体主题，颜色会显示在前台标签上">
      <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
      <el-button type="primary" :icon="Plus" @click="openCreate">新建标签</el-button>
    </PageHeader>

    <div class="panel overflow-hidden">
      <el-table v-loading="loading" :data="rows" row-key="id" style="width: 100%">
        <el-table-column label="颜色" width="86" align="center">
          <template #default="{ row }">
            <span
              class="inline-block h-5 w-5 rounded-md border"
              :style="{ background: row.color || 'var(--border)', borderColor: 'var(--border)' }"
            />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="160">
          <template #default="{ row }">
            <el-tag
              size="default"
              effect="plain"
              disable-transitions
              :style="row.color ? { color: row.color, borderColor: row.color } : undefined"
            >
              {{ row.name }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="slug" label="别名" min-width="180">
          <template #default="{ row }">
            <code class="text-[12px]" :style="{ color: 'var(--text-2)' }">{{ row.slug || '—' }}</code>
          </template>
        </el-table-column>
        <el-table-column label="文章数" width="100" align="right">
          <template #default="{ row }">
            <span class="text-[12px] tabular-nums" :style="{ color: 'var(--text-2)' }">{{ row.articleCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <EmptyState title="还没有标签" description="给文章加几个标签，方便读者按主题浏览。">
            <el-button type="primary" size="small" @click="openCreate">新建标签</el-button>
          </EmptyState>
        </template>
      </el-table>
    </div>

    <el-dialog v-model="dialogVisible" :title="editing ? '编辑标签' : '新建标签'" width="440px" destroy-on-close>
      <el-alert v-if="dialogError" :title="dialogError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：Vue" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="别名（URL 使用）">
          <el-input v-model="form.slug" placeholder="留空自动生成，例如 vue" />
        </el-form-item>
        <el-form-item label="颜色">
          <div class="flex items-center gap-3">
            <el-color-picker v-model="form.color" :predefine="PRESET_COLORS" />
            <div class="flex flex-wrap gap-1.5">
              <button
                v-for="color in PRESET_COLORS"
                :key="color"
                type="button"
                class="h-6 w-6 cursor-pointer rounded-md border-2 transition-transform hover:scale-110"
                :style="{ background: color, borderColor: form.color === color ? 'var(--text)' : 'transparent' }"
                :aria-label="`选择颜色 ${color}`"
                @click="form.color = color"
              />
            </div>
          </div>
        </el-form-item>
        <div class="rounded-[10px] px-3 py-2" :style="{ background: 'var(--bg-soft)' }">
          <span class="hint mr-2">预览</span>
          <el-tag :style="{ color: form.color, borderColor: form.color }" effect="plain" disable-transitions>
            {{ form.name || '标签名称' }}
          </el-tag>
        </div>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="submit">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>
