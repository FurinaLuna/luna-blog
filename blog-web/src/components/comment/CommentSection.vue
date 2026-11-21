<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormItemRule, type FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import CommentItem from '@/components/comment/CommentItem.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { createComment, getComments } from '@/api/comment'
import type { Comment, TargetType } from '@/api/types'
import { loadVisitor, saveVisitor } from '@/utils/visitor'

interface CommentForm {
  nickname: string
  email: string
  website: string
  content: string
}

const props = withDefaults(
  defineProps<{
    targetType: TargetType
    targetId: number
    title?: string
    pageSize?: number
  }>(),
  { title: '评论', pageSize: 5 },
)

const comments = ref<Comment[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const submitting = ref(false)
const replyTarget = ref<Comment | null>(null)
const formRef = ref<FormInstance>()

const visitor = loadVisitor()
const form = reactive<CommentForm>({
  nickname: visitor.nickname,
  email: visitor.email,
  website: visitor.website,
  content: '',
})

const urlPlaceholder = 'https://example.com'

const websiteRule: FormItemRule = {  validator: (_rule, value: string, callback) => {
    if (!value.trim()) {
      callback()
      return
    }
    if (!/^https?:\/\/[^\s]+$/i.test(value.trim())) {
      callback(new Error('网址需以 http:// 或 https:// 开头'))
      return
    }
    callback()
  },
  trigger: 'blur',
}

const contentRule: FormItemRule = {
  validator: (_rule, value: string, callback) => {
    const length = value.trim().length
    if (length < 2) {
      callback(new Error('评论内容至少 2 个字'))
      return
    }
    if (length > 500) {
      callback(new Error('评论内容不能超过 500 个字'))
      return
    }
    callback()
  },
  trigger: 'blur',
}

const rules: FormRules<CommentForm> = {
  nickname: [
    { required: true, message: '请填写昵称', trigger: 'blur' },
    { min: 1, max: 20, message: '昵称长度为 1-20 个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请填写邮箱', trigger: 'blur' },
    { type: 'email', message: '邮箱格式不正确', trigger: 'blur' },
  ],
  website: [websiteRule],
  content: [
    { required: true, message: '请填写评论内容', trigger: 'blur' },
    contentRule,
  ],
}

async function loadComments(): Promise<void> {
  loading.value = true
  try {
    const data = await getComments(
      {
        targetType: props.targetType,
        targetId: props.targetId,
        page: page.value,
        pageSize: props.pageSize,
      },
      { silent: true },
    )
    comments.value = data.list
    total.value = data.total
  } catch {
    comments.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange(next: number): void {
  page.value = next
  void loadComments()
}

function scrollToForm(): void {
  void nextTick(() => {
    document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function startReply(comment: Comment): void {
  replyTarget.value = comment
  form.content = ''
  scrollToForm()
}

function cancelReply(): void {
  replyTarget.value = null
}

async function submit(): Promise<void> {
  const instance = formRef.value
  if (!instance) return
  const valid = await instance.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    const payload = {
      targetType: props.targetType,
      nickname: form.nickname.trim(),
      email: form.email.trim(),
      website: form.website.trim() || undefined,
      content: form.content.trim(),
      parentId: replyTarget.value?.id,
      ...(props.targetType === 'article' ? { articleId: props.targetId } : { talkId: props.targetId }),
    }
    await createComment(payload)
    ElMessage.success('评论已提交，审核通过后展示')
    saveVisitor({
      nickname: form.nickname.trim(),
      email: form.email.trim(),
      website: form.website.trim(),
    })
    form.content = ''
    replyTarget.value = null
    page.value = 1
    await loadComments()
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void loadComments()
})

watch(
  () => [props.targetType, props.targetId] as const,
  () => {
    page.value = 1
    replyTarget.value = null
    void loadComments()
  },
)
</script>

<template>
  <section class="mt-12" aria-label="评论区">
    <div class="mb-4 flex items-end justify-between gap-3">
      <h2 class="flex items-center gap-2 text-lg font-bold">
        {{ title }}
        <span
          class="rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums"
          style="background: var(--brand-soft); color: var(--brand)"
        >
          {{ total }}
        </span>
      </h2>
      <button
        type="button"
        class="inline-flex items-center gap-1 text-xs transition-colors hover:text-[var(--brand)]"
        style="color: var(--text-2)"
        aria-label="刷新评论"
        @click="loadComments"
      >
        <el-icon :size="13"><Refresh /></el-icon>
        刷新
      </button>
    </div>

    <div v-if="loading" class="space-y-5 py-2">
      <SkeletonList variant="list" :count="2" />
    </div>

    <EmptyState
      v-else-if="comments.length === 0"
      icon="comment"
      title="还没有评论"
      description="成为第一个留下想法的人吧。"
    />

    <div v-else class="space-y-6">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        @reply="startReply"
      />
    </div>

    <Pagination
      v-if="!loading && total > pageSize"
      :page="page"
      :total="total"
      :page-size="pageSize"
      class="mt-6"
      @update:page="handlePageChange"
    />

    <div id="comment-form" class="card mt-8 scroll-mt-24 p-5 sm:p-6">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="text-base font-bold">发表评论</h3>
        <p v-if="replyTarget" class="flex items-center gap-2 text-xs" style="color: var(--text-2)">
          回复
          <span style="color: var(--brand)">@{{ replyTarget.nickname }}</span>
          <button
            type="button"
            class="underline decoration-dotted underline-offset-2 hover:text-[var(--brand)]"
            @click="cancelReply"
          >
            取消
          </button>
        </p>
      </div>

      <p class="mt-1.5 text-xs" style="color: var(--text-2)">访客可直接评论，邮箱仅用于接收回复提醒，不会公开。</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        class="mt-4"
        @submit.prevent="submit"
      >
        <div class="grid gap-x-3 sm:grid-cols-3">
          <el-form-item label="昵称" prop="nickname">
            <el-input v-model="form.nickname" maxlength="20" placeholder="怎么称呼你" autocomplete="nickname" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" maxlength="80" placeholder="you@example.com" autocomplete="email" />
          </el-form-item>
          <el-form-item label="网址（可选）" prop="website">
            <el-input v-model="form.website" maxlength="200" :placeholder="urlPlaceholder" autocomplete="url" />
          </el-form-item>
        </div>

        <el-form-item label="评论内容" prop="content">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="4"
            maxlength="500"
            show-word-limit
            placeholder="友善交流，让想法流动起来…"
            resize="vertical"
          />
        </el-form-item>

        <div class="flex items-center justify-end">
          <button type="submit" class="btn btn-primary min-w-[7rem]" :disabled="submitting">
            {{ submitting ? '提交中…' : '提交评论' }}
          </button>
        </div>
      </el-form>
    </div>
  </section>
</template>

<style scoped>
:deep(.el-form-item) {
  margin-bottom: 1rem;
}
</style>
