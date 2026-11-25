<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormItemRule, type FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import CommentItem from '@/components/comment/CommentItem.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { createComment, getComments } from '@/api/comment'
import type { Comment, TargetType } from '@/api/types'
import { useSiteStore } from '@/stores/site'
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
/** 点进输入框才展开昵称/邮箱/网址，未展开时只有一个输入条 */
const composerOpen = ref(false)

const site = useSiteStore()
void site.ensureLoaded()

const visitor = loadVisitor()
const form = reactive<CommentForm>({
  nickname: visitor.nickname,
  email: visitor.email,
  website: visitor.website,
  content: '',
})

const urlPlaceholder = 'https://example.com'

const avatarInitial = computed(() => (form.nickname.trim() || '访').slice(0, 1))

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
  composerOpen.value = true
  form.content = ''
  scrollToForm()
}

function cancelReply(): void {
  replyTarget.value = null
}

/** 「取消发布」：收起输入区并清空草稿 */
function closeComposer(): void {
  composerOpen.value = false
  replyTarget.value = null
  form.content = ''
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
    composerOpen.value = false
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
    composerOpen.value = false
    void loadComments()
  },
)
</script>

<template>
  <section id="comment-form" class="comment-area" aria-label="评论区">
    <div class="comment-area__bar">
      <span class="comment-area__count">评论 {{ total }}</span>
      <div class="comment-area__bar-actions">
        <button
          v-if="composerOpen"
          type="button"
          class="comment-area__cancel"
          @click="closeComposer"
        >
          取消发布
        </button>
        <button type="button" class="comment-area__refresh" aria-label="刷新评论" @click="loadComments">
          <el-icon :size="13"><Refresh /></el-icon>
        </button>
      </div>
    </div>

    <div class="comment-area__composer">
      <div class="comment-area__avatar" aria-hidden="true">
        <img v-if="site.avatar" :src="site.avatar" alt="" />
        <span v-else>{{ avatarInitial }}</span>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="comment-area__editor"
        @submit.prevent="submit"
      >
        <p v-if="replyTarget" class="comment-area__reply">
          回复 <span>@{{ replyTarget.nickname }}</span>
          <button type="button" @click="cancelReply">取消</button>
        </p>

        <el-form-item prop="content" class="comment-area__content-item">
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="composerOpen ? 3 : 1"
            maxlength="500"
            :show-word-limit="composerOpen"
            :placeholder="composerOpen ? '友善交流，让想法流动起来…' : '期待能留下你的脚印~'"
            resize="none"
            @focus="composerOpen = true"
          />
        </el-form-item>

        <div v-if="composerOpen" class="comment-area__fields">
          <el-form-item prop="nickname">
            <el-input v-model="form.nickname" maxlength="20" placeholder="昵称" autocomplete="nickname" />
          </el-form-item>
          <el-form-item prop="email">
            <el-input
              v-model="form.email"
              maxlength="80"
              placeholder="邮箱（不会公开）"
              autocomplete="email"
            />
          </el-form-item>
          <el-form-item prop="website">
            <el-input
              v-model="form.website"
              maxlength="200"
              :placeholder="`网址（可选）${urlPlaceholder}`"
              autocomplete="url"
            />
          </el-form-item>
          <button type="submit" class="apply-button comment-area__submit" :disabled="submitting">
            {{ submitting ? '提交中…' : '发布' }}
          </button>
        </div>
      </el-form>
    </div>

    <div v-if="loading" class="comment-area__loading">
      <SkeletonList variant="list" :count="2" />
    </div>

    <p v-else-if="comments.length === 0" class="comment-area__empty">还没有评论，来留下第一条吧。</p>

    <div v-else class="comment-area__list">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        @reply="startReply"
      />
    </div>

    <Pagination
      v-if="!loading && total > pageSize"
      class="comment-area__pagination"
      :page="page"
      :total="total"
      :page-size="pageSize"
      @update:page="handlePageChange"
    />
  </section>
</template>

<style scoped>
.comment-area {
  margin-top: 0.4rem;
}

.comment-area__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0 0.2rem 0.5rem;
}

.comment-area__count {
  color: var(--text-2);
  font-size: 0.9rem;
  font-weight: 500;
}

.comment-area__bar-actions {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.comment-area__cancel {
  padding: 0;
  border: 0;
  background: none;
  color: var(--meta-color);
  font-size: 0.84rem;
  cursor: pointer;
  transition: color 0.2s ease;
}

.comment-area__cancel:hover {
  color: var(--primary-ink);
}

.comment-area__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--meta-color);
  cursor: pointer;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;
}

.comment-area__refresh:hover {
  background: var(--card-2, rgba(127, 127, 127, 0.12));
  color: var(--primary-ink);
}

.comment-area__composer {
  display: flex;
  gap: 0.85rem;
  padding: 1rem 1.1rem;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--card);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.comment-area__composer:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 14%, transparent);
}

.comment-area__avatar {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 2.4rem;
  height: 2.4rem;
  overflow: hidden;
  border-radius: 50%;
  background: var(--cover-grad-1);
  color: #fff;
  font-size: 0.95rem;
  font-weight: 600;
}

.comment-area__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-area__editor {
  min-width: 0;
  flex: 1;
}

.comment-area__reply {
  margin-bottom: 0.5rem;
  color: var(--meta-color);
  font-size: 0.82rem;
}

.comment-area__reply span {
  color: var(--primary-ink);
}

.comment-area__reply button {
  margin-left: 0.4rem;
  padding: 0;
  border: 0;
  background: none;
  color: var(--meta-color);
  font-size: 0.82rem;
  text-decoration: underline;
  cursor: pointer;
}

.comment-area__content-item {
  margin-bottom: 0;
}

.comment-area__content-item :deep(.el-textarea__inner) {
  min-height: 2.4rem !important;
  padding: 0.55rem 0.7rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  box-shadow: none;
  color: var(--font-color);
  font-size: 0.95rem;
}

.comment-area__content-item :deep(.el-textarea__inner:focus) {
  box-shadow: none;
}

.comment-area__fields {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.4fr) auto;
  gap: 0.6rem;
  align-items: start;
  margin-top: 0.7rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--border);
}

.comment-area__fields :deep(.el-form-item) {
  margin-bottom: 0;
}

.comment-area__submit {
  align-self: center;
  white-space: nowrap;
}

.comment-area__loading,
.comment-area__empty,
.comment-area__pagination {
  margin-top: 1rem;
}

.comment-area__empty {
  padding: 0.6rem 0.2rem;
  color: var(--meta-color);
  font-size: 0.88rem;
}

.comment-area__list {
  margin-top: 1.1rem;
}

@media (max-width: 768px) {
  .comment-area__fields {
    grid-template-columns: minmax(0, 1fr);
  }

  .comment-area__submit {
    width: 100%;
  }
}
</style>
