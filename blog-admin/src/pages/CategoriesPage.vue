<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import EmptyState from '@/components/EmptyState.vue'
import { createCategory, deleteCategory, getCategories, updateCategory } from '@/api/categories'
import { ApiError } from '@/api/http'
import type { Category, CategoryPayload } from '@/api/types'

interface CategoryForm {
  name: string
  slug: string
  description: string
  sort: number
}

const loading = ref(false)
const rows = ref<Category[]>([])
const dialogVisible = ref(false)
const saving = ref(false)
const dialogError = ref('')
const editing = ref<Category | null>(null)
const formRef = ref<FormInstance>()

const form = reactive<CategoryForm>({ name: '', slug: '', description: '', sort: 0 })

const rules: FormRules<CategoryForm> = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { max: 30, message: '名称不能超过 30 字', trigger: 'blur' },
  ],
}

async function load(): Promise<void> {
  loading.value = true
  try {
    rows.value = await getCategories()
  } finally {
    loading.value = false
  }
}

function openCreate(): void {
  editing.value = null
  dialogError.value = ''
  form.name = ''
  form.slug = ''
  form.description = ''
  form.sort = rows.value.length
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

function openEdit(row: Category): void {
  editing.value = row
  dialogError.value = ''
  form.name = row.name
  form.slug = row.slug
  form.description = row.description ?? ''
  form.sort = row.sort
  dialogVisible.value = true
  void formRef.value?.clearValidate()
}

async function submit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload: CategoryPayload = {
    name: form.name.trim(),
    sort: form.sort,
  }
  if (form.slug.trim()) payload.slug = form.slug.trim()
  if (form.description.trim()) payload.description = form.description.trim()

  saving.value = true
  dialogError.value = ''
  try {
    if (editing.value) {
      await updateCategory(editing.value.id, payload)
      ElMessage.success('分类已更新')
    } else {
      await createCategory(payload)
      ElMessage.success('分类已创建')
    }
    dialogVisible.value = false
    await load()
  } catch (error) {
    if (error instanceof ApiError) dialogError.value = error.message
  } finally {
    saving.value = false
  }
}

async function handleDelete(row: Category): Promise<void> {
  try {
    await ElMessageBox.confirm(
      row.articleCount > 0
        ? `分类「${row.name}」下有 ${row.articleCount} 篇文章，删除后这些文章将变为未分类，确定删除吗？`
        : `确定删除分类「${row.name}」吗？`,
      '删除分类',
      { confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning' },
    )
  } catch {
    return
  }

  try {
    await deleteCategory(row.id)
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
        <PageHeader title="分类管理" description="为文章建立清晰的归类，数量少的分类更适合作为主题">
          <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="openCreate">新建分类</el-button>
        </PageHeader>
      </template>

      <div class="table-flex">
        <el-table v-loading="loading" :data="rows" row-key="id" height="100%" border style="width: 100%">
          <el-table-column prop="name" label="名称" min-width="180">
            <template #default="{ row }">
              <span class="text-[13px] font-medium text-[var(--text)]">{{ row.name }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="slug" label="别名" min-width="160" align="center">
            <template #default="{ row }">
              <code class="text-[12px] text-[var(--text-2)]">{{ row.slug || '—' }}</code>
            </template>
          </el-table-column>
          <el-table-column prop="description" label="描述" min-width="240">
            <template #default="{ row }">
              <span class="clamp-1 text-[12px] text-[var(--text-2)]">{{ row.description || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="文章数" width="90" align="center">
            <template #default="{ row }">
              <span class="text-[12px] tabular-nums text-[var(--text-2)]">{{ row.articleCount }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column label="操作" width="130" align="center" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
          <template #empty>
            <EmptyState title="还没有分类" description="创建几个分类，让文章更有条理。">
              <el-button type="primary" size="small" @click="openCreate">新建分类</el-button>
            </EmptyState>
          </template>
        </el-table>
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? '编辑分类' : '新建分类'"
      width="480px"
      draggable
      destroy-on-close
    >
      <el-alert v-if="dialogError" :title="dialogError" type="error" show-icon :closable="false" class="mb-4" />
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="例如：前端笔记" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item label="别名（URL 使用）">
          <el-input v-model="form.slug" placeholder="留空自动生成，例如 frontend" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="这个分类收录哪些文章" />
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
