<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import Danmaku from 'vue3-danmaku'
import 'vue3-danmaku/dist/vue3-danmaku.css'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import Pagination from '@/components/common/Pagination.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import MessageCard from '@/components/message/MessageCard.vue'
import { createMessage, getMessages } from '@/api/message'
import type { Message } from '@/api/types'
import { formatCompact } from '@/utils/format'
import { loadVisitor, saveVisitor } from '@/utils/visitor'

type ViewMode = 'card' | 'danmaku'

interface MessageForm {
  nickname: string
  content: string
  color: string
}

const PAGE_SIZE = 9
const DANMAKU_PAGE_SIZE = 50
const COLOR_PALETTE = ['#49b1f5', '#ff7242', '#4c7bd9', '#a35fd1', '#3f9d68', '#d95f8a']

const mode = ref<ViewMode>('card')
const messages = ref<Message[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const visitor = loadVisitor()
const form = reactive<MessageForm>({
  nickname: visitor.nickname,
  content: '',
  color: COLOR_PALETTE[0],
})

const rules: FormRules<MessageForm> = {
  nickname: [
    { required: true, message: '请填写昵称', trigger: 'blur' },
    { min: 1, max: 20, message: '昵称长度为 1-20 个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请填写留言内容', trigger: 'blur' },
    { min: 1, max: 200, message: '留言长度为 1-200 个字符', trigger: 'blur' },
  ],
}

const escapedHtml = computed(() => {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return entities
})

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => escapedHtml.value[char] ?? char)
}

function safeColor(color: string | null, index: number): string {
  if (color && /^#[0-9a-f]{3,8}$/i.test(color)) return color
  return COLOR_PALETTE[index % COLOR_PALETTE.length]
}

const danmakuItems = computed(() =>
  messages.value.map((message, index) => {
    const color = safeColor(message.color, index)
    const nickname = escapeHtml(message.nickname)
    const content = escapeHtml(message.content)
    return `<span style="color:${color};font-weight:600">${nickname}</span><span style="color:${color};margin-left:.45em">${content}</span>`
  }),
)

async function loadMessages(): Promise<void> {
  loading.value = true
  try {
    const pageSize = mode.value === 'danmaku' ? DANMAKU_PAGE_SIZE : PAGE_SIZE
    const currentPage = mode.value === 'danmaku' ? 1 : page.value
    const data = await getMessages({ page: currentPage, pageSize }, { silent: true })
    messages.value = data.list
    total.value = data.total
  } catch {
    messages.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function switchMode(next: ViewMode): void {
  if (mode.value === next) return
  mode.value = next
  page.value = 1
}

async function submit(): Promise<void> {
  const instance = formRef.value
  if (!instance) return
  const valid = await instance.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await createMessage({
      nickname: form.nickname.trim(),
      content: form.content.trim(),
      color: form.color,
    })
    ElMessage.success('留言已提交，审核通过后展示')
    saveVisitor({ nickname: form.nickname.trim(), email: '', website: '' })
    form.content = ''
    page.value = 1
    await loadMessages()
  } finally {
    submitting.value = false
  }
}

watch([mode, page], () => {
  void loadMessages()
})

onMounted(() => {
  void loadMessages()
})
</script>

<template>
  <div>
    <PageHeader
      title="留言板"
      :subtitle="`想说什么都可以留下 · ${formatCompact(total)} 条留言正在这里发光`"
    />

    <div class="center_box">
      <div class="card message-panel">
        <div class="message-panel__bar">
          <div class="mode-tabs">
            <button
              type="button"
              class="mode-tab"
              :class="{ 'is-active': mode === 'card' }"
              :aria-pressed="mode === 'card'"
              @click="switchMode('card')"
            >
              卡片模式
            </button>
            <button
              type="button"
              class="mode-tab"
              :class="{ 'is-active': mode === 'danmaku' }"
              :aria-pressed="mode === 'danmaku'"
              @click="switchMode('danmaku')"
            >
              弹幕模式
            </button>
          </div>

          <button type="button" class="message-panel__refresh" aria-label="刷新留言" @click="loadMessages">
            <el-icon :size="13"><Refresh /></el-icon>
            刷新
          </button>
        </div>

        <SkeletonList v-if="loading" variant="card" :count="6" />

        <EmptyState
          v-else-if="messages.length === 0"
          icon="comment"
          title="还没有留言"
          description="写下第一条吧，让这块板子开始有温度。"
        />

        <template v-else>
          <div v-if="mode === 'danmaku'" class="danmaku-stage">
            <div class="danmaku-layer">
              <Danmaku :danmus="danmakuItems" :speeds="120" :font-size="20" :loop="true" class="danmaku-layer__inner" />
            </div>
            <p class="danmaku-stage__title">弹幕仅展示已通过审核的留言</p>
          </div>

          <div v-else class="message-grid">
            <MessageCard v-for="message in messages" :key="message.id" :message="message" />
          </div>

          <Pagination
            v-if="mode === 'card'"
            :page="page"
            :total="total"
            :page-size="PAGE_SIZE"
            @update:page="page = $event"
          />
        </template>
      </div>

      <div class="card message-form-card">
        <h2 class="message-form-card__title">写下留言</h2>
        <p class="message-form-card__hint">访客免登录，提交后需要等站长审核。</p>

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          label-position="top"
          class="message-form"
          @submit.prevent="submit"
        >
          <div class="message-form__row">
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" maxlength="20" placeholder="怎么称呼你" />
            </el-form-item>

            <el-form-item label="弹幕颜色">
              <div class="message-form__colors">
                <button
                  v-for="color in COLOR_PALETTE"
                  :key="color"
                  type="button"
                  class="message-form__color"
                  :class="{ 'is-active': form.color === color }"
                  :style="{ background: color }"
                  :aria-label="`选择颜色 ${color}`"
                  :aria-pressed="form.color === color"
                  @click="form.color = color"
                />
              </div>
            </el-form-item>
          </div>

          <el-form-item label="留言内容" prop="content">
            <el-input
              v-model="form.content"
              type="textarea"
              :rows="4"
              maxlength="200"
              show-word-limit
              placeholder="想说的话…"
              resize="vertical"
            />
          </el-form-item>

          <button type="submit" class="apply-button message-form__submit" :disabled="submitting">
            {{ submitting ? '提交中…' : '提交留言' }}
          </button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message-panel {
  padding: 1.6rem clamp(1rem, 3vw, 2rem) 2rem;
}

.message-panel__bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  margin-bottom: 1.2rem;
}

.message-panel__refresh {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  border: 0;
  background: transparent;
  color: var(--meta-color);
  font-size: 0.82rem;
  transition: color 0.2s ease;
}

.message-panel__refresh:hover {
  color: var(--primary);
}

.message-form-card {
  margin-top: 1.2rem;
  padding: 1.6rem clamp(1rem, 3vw, 2rem) 2rem;
}

.message-form-card__title {
  color: var(--font-color);
  font-size: 1.2rem;
  font-weight: 600;
}

.message-form-card__hint {
  margin-top: 0.2rem;
  color: var(--meta-color);
  font-size: 0.82rem;
}

.message-form {
  margin-top: 0.6rem;
}

.message-form__row {
  display: grid;
  gap: 0 1.2rem;
}

@media (min-width: 768px) {
  .message-form__row {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }
}

.message-form :deep(.el-form-item) {
  margin-bottom: 1rem;
}

.message-form__colors {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  height: 32px;
}

.message-form__color {
  width: 22px;
  height: 22px;
  border: 2px solid transparent;
  border-radius: 50%;
  transition: transform 0.2s ease;
}

.message-form__color.is-active {
  border-color: var(--font-color);
  transform: scale(1.15);
}

.message-form__submit {
  width: 100%;
  margin-top: 0.2rem;
}

.danmaku-layer {
  position: absolute;
  inset: 0;
}

.danmaku-layer__inner {
  width: 100%;
  height: 100%;
}
</style>
