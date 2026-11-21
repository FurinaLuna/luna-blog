<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { MdEditor } from 'md-editor-v3'
import { ArrowLeft } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { createArticle, getAdminArticle, updateArticle } from '@/api/articles'
import { getCategories } from '@/api/categories'
import { getTags } from '@/api/tags'
import { uploadFile } from '@/api/upload'
import { useThemeStore } from '@/stores/theme'
import type { ArticlePayload, ArticleStatus, Category, Tag } from '@/api/types'
import { plainText } from '@/utils/format'

interface ArticleForm {
  title: string
  summary: string
  content: string
  cover: string
  categoryId: number | null
  tagIds: number[]
  status: ArticleStatus
  isRecommend: boolean
  isTop: boolean
  readingTime: number | null
}

const route = useRoute()
const router = useRouter()
const theme = useThemeStore()

const articleId = computed<number>(() => {
  const raw = route.params.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
})
const isEdit = computed(() => articleId.value > 0)

const formRef = ref<FormInstance>()
const loading = ref(false)
const loadFailed = ref(false)
const saving = ref<'' | ArticleStatus>('')
const categories = ref<Category[]>([])
const tags = ref<Tag[]>([])
const dirty = ref(false)
let initializing = false

const form = reactive<ArticleForm>({
  title: '',
  summary: '',
  content: '',
  cover: '',
  categoryId: null,
  tagIds: [],
  status: 'draft',
  isRecommend: false,
  isTop: false,
  readingTime: null,
})

const rules: FormRules<ArticleForm> = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { max: 100, message: '标题不能超过 100 字', trigger: 'blur' },
  ],
  content: [{ required: true, message: '正文不能为空', trigger: 'blur' }],
  summary: [{ max: 200, message: '摘要不能超过 200 字', trigger: 'blur' }],
}

const autoReadingTime = computed<number>(() => {
  const length = plainText(form.content).length
  return Math.max(1, Math.round(length / 400))
})

const charCount = computed(() => plainText(form.content).length)

const editorTheme = computed<'light' | 'dark'>(() => (theme.isDark ? 'dark' : 'light'))
const previewTheme = computed(() => (theme.isDark ? 'vuepress' : 'github'))
const codeTheme = computed(() => (theme.isDark ? 'atom' : 'github'))

function resetForm(): void {
  initializing = true
  form.title = ''
  form.summary = ''
  form.content = ''
  form.cover = ''
  form.categoryId = null
  form.tagIds = []
  form.status = 'draft'
  form.isRecommend = false
  form.isTop = false
  form.readingTime = null
  dirty.value = false
  void nextTick(() => {
    initializing = false
    dirty.value = false
  })
}

function fillForm(data: {
  title: string
  summary: string
  content: string
  cover: string | null
  categoryId: number | null
  tags: Array<{ id: number }>
  status: ArticleStatus
  isRecommend: boolean
  isTop: boolean
  readingTime: number
}): void {
  initializing = true
  form.title = data.title
  form.summary = data.summary ?? ''
  form.content = data.content ?? ''
  form.cover = data.cover ?? ''
  form.categoryId = data.categoryId
  form.tagIds = data.tags.map((tag) => tag.id)
  form.status = data.status
  form.isRecommend = data.isRecommend
  form.isTop = data.isTop
  form.readingTime = data.readingTime || null
  dirty.value = false
  void nextTick(() => {
    initializing = false
    dirty.value = false
  })
}

async function loadOptions(): Promise<void> {
  try {
    const [categoryList, tagList] = await Promise.all([getCategories(), getTags()])
    categories.value = categoryList
    tags.value = tagList
  } catch {
    categories.value = []
    tags.value = []
  }
}

async function init(): Promise<void> {
  loading.value = true
  loadFailed.value = false
  resetForm()
  try {
    if (isEdit.value) {
      const article = await getAdminArticle(articleId.value)
      fillForm(article)
    }
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

watch(
  () => route.params.id,
  () => {
    if (!route.name || (route.name !== 'ArticleCreate' && route.name !== 'ArticleEdit')) return
    if (!isEdit.value) resetForm()
    void init()
  },
)

watch(
  form,
  () => {
    if (!initializing) dirty.value = true
  },
  { deep: true },
)

async function onUploadImg(
  files: File[],
  callback: (urls: string[] | Array<{ url: string; alt: string; title: string }>) => void,
): Promise<void> {
  try {
    const results = await Promise.all(files.map((file) => uploadFile(file)))
    callback(results.map((item) => item.url))
  } catch {
    ElMessage.error('图片上传失败')
    callback([])
  }
}

async function save(status: ArticleStatus): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) {
    ElMessage.warning('请先补全必填内容')
    return
  }

  form.status = status
  const payload: ArticlePayload = {
    title: form.title.trim(),
    summary: form.summary.trim(),
    content: form.content,
    cover: form.cover,
    categoryId: form.categoryId,
    tagIds: [...form.tagIds],
    status,
    isRecommend: form.isRecommend,
    isTop: form.isTop,
  }
  const readingTime = form.readingTime ?? autoReadingTime.value
  if (readingTime > 0) payload.readingTime = readingTime

  saving.value = status
  try {
    if (isEdit.value) {
      await updateArticle(articleId.value, payload)
      ElMessage.success(status === 'published' ? '已发布' : '草稿已保存')
      dirty.value = false
    } else {
      const created = await createArticle(payload)
      ElMessage.success(status === 'published' ? '已发布' : '草稿已保存')
      dirty.value = false
      await router.replace({ name: 'ArticleEdit', params: { id: created.id } })
    }
  } catch {
    // 请求层已提示具体错误
  } finally {
    saving.value = ''
  }
}

async function handleBack(): Promise<void> {
  if (dirty.value) {
    try {
      await ElMessageBox.confirm('当前内容尚未保存，确定离开吗？', '离开编辑页', {
        confirmButtonText: '离开',
        cancelButtonText: '继续编辑',
        type: 'warning',
      })
    } catch {
      return
    }
  }
  await router.push({ name: 'Articles' })
}

onBeforeRouteLeave(async () => {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('当前内容尚未保存，确定离开吗？', '离开编辑页', {
      confirmButtonText: '离开',
      cancelButtonText: '继续编辑',
      type: 'warning',
    })
    return true
  } catch {
    return false
  }
})

onMounted(() => {
  void loadOptions()
  void init()
})
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="mb-3">
      <PageHeader
        :title="isEdit ? '编辑文章' : '写文章'"
        :description="isEdit ? `文章 ID #${articleId}` : '支持 Markdown 与图片上传，保存后可随时继续编辑'"
      >
        <el-button :icon="ArrowLeft" @click="handleBack">返回列表</el-button>
        <el-button :loading="saving === 'draft'" :disabled="saving !== ''" @click="save('draft')">
          保存草稿
        </el-button>
        <el-button type="primary" :loading="saving === 'published'" :disabled="saving !== ''" @click="save('published')">
          发布
        </el-button>
      </PageHeader>
    </el-card>

    <el-card v-if="loadFailed" shadow="never" class="admin-card--auto">
      <el-result icon="error" title="文章加载失败" sub-title="未能读取文章内容，请确认后端服务与接口是否可用。">
        <template #extra>
          <el-button @click="handleBack">返回列表</el-button>
          <el-button type="primary" @click="init">重新加载</el-button>
        </template>
      </el-result>
    </el-card>

    <div v-else v-loading="loading" class="grid grid-cols-1 items-start gap-3 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div class="flex min-w-0 flex-col gap-3">
        <el-card shadow="never">
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
            <el-form-item prop="title" class="mb-0!">
              <el-input
                v-model="form.title"
                size="large"
                maxlength="100"
                show-word-limit
                placeholder="请输入文章标题"
                class="article-title-input"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never" class="editor-card overflow-hidden">
          <div class="article-editor">
            <MdEditor
              v-model="form.content"
              :theme="editorTheme"
              :preview-theme="previewTheme"
              :code-theme="codeTheme"
              language="zh-CN"
              :toolbars-exclude="['github', 'save', 'catalog']"
              :on-upload-img="onUploadImg"
            />
          </div>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="text-[14px] font-semibold text-[var(--text-2)]">摘要</span>
              <span class="text-[12px] text-[var(--text-3)]">留空时会自动截取正文前 160 字</span>
            </div>
          </template>
          <el-input
            v-model="form.summary"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="一句话概括这篇文章，用于列表与分享卡片"
          />
          <p class="mt-2 mb-0 text-[12px] text-[var(--text-3)]">
            正文 {{ charCount }} 字 · 预计阅读 {{ autoReadingTime }} 分钟
          </p>
        </el-card>
      </div>

      <aside class="flex flex-col gap-3 xl:sticky xl:top-3">
        <el-card shadow="never">
          <template #header>
            <span class="text-[14px] font-semibold text-[var(--text-2)]">发布设置</span>
          </template>
          <el-form label-position="top">
            <el-form-item label="状态">
              <el-radio-group v-model="form.status">
                <el-radio-button value="draft">草稿</el-radio-button>
                <el-radio-button value="published">已发布</el-radio-button>
              </el-radio-group>
            </el-form-item>

            <div class="flex items-center justify-between py-1">
              <span class="text-[13px] text-[var(--text-2)]">推荐到首页</span>
              <el-switch v-model="form.isRecommend" />
            </div>
            <div class="flex items-center justify-between py-1">
              <span class="text-[13px] text-[var(--text-2)]">置顶文章</span>
              <el-switch v-model="form.isTop" />
            </div>

            <el-form-item label="阅读时长（分钟）" class="mt-3 mb-0!">
              <el-input-number
                v-model="form.readingTime"
                :min="1"
                :max="999"
                :value-on-clear="null"
                placeholder="自动"
                class="w-full"
              />
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <span class="text-[14px] font-semibold text-[var(--text-2)]">分类与标签</span>
          </template>
          <el-form label-position="top">
            <el-form-item label="分类">
              <el-select v-model="form.categoryId" placeholder="选择分类" clearable class="w-full">
                <el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" />
              </el-select>
            </el-form-item>
            <el-form-item label="标签" class="mb-0!">
              <el-select
                v-model="form.tagIds"
                multiple
                filterable
                collapse-tags
                collapse-tags-tooltip
                placeholder="选择标签（可多选）"
                class="w-full"
              >
                <el-option v-for="tag in tags" :key="tag.id" :label="tag.name" :value="tag.id">
                  <span class="flex items-center gap-2">
                    <span v-if="tag.color" class="h-2.5 w-2.5 rounded-full" :style="{ background: tag.color }" />
                    {{ tag.name }}
                  </span>
                </el-option>
              </el-select>
            </el-form-item>
          </el-form>
        </el-card>

        <el-card shadow="never">
          <template #header>
            <span class="text-[14px] font-semibold text-[var(--text-2)]">封面</span>
          </template>
          <ImageUpload v-model="form.cover" :limit="1" :size="140" tip="建议 16:9，大小不超过 5MB" />
        </el-card>
      </aside>
    </div>
  </div>
</template>

<style scoped>
:deep(.article-title-input .el-input__wrapper) {
  box-shadow: none;
  background: transparent;
  padding-left: 4px;
}

:deep(.article-title-input .el-input__inner) {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.article-editor :deep(.md-editor) {
  height: calc(100vh - 260px);
  min-height: 420px;
  border: 0;
}

.editor-card :deep(.el-card__body) {
  padding: 0;
}
</style>
