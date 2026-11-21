<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { ChatLineRound, Refresh } from '@element-plus/icons-vue'
import Danmaku from 'vue3-danmaku'
import 'vue3-danmaku/dist/vue3-danmaku.css'
import EmptyState from '@/components/common/EmptyState.vue'
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
const COLOR_PALETTE = ['#2f8f83', '#e07a3f', '#4c7bd9', '#a35fd1', '#3f9d68', '#d95f8a']

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
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><ChatLineRound /></el-icon>
        Message
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">留言板</h1>
      <p class="mt-2 text-sm" style="color: var(--text-2)">
        想说什么都可以留下，{{ formatCompact(total) }} 条留言正在这里发光。
      </p>
    </header>

    <div class="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div class="order-2 lg:order-1">
        <div class="flex items-center justify-between gap-3">
          <div class="inline-flex rounded-lg border p-1" style="border-color: var(--border); background: var(--bg-soft)">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :style="mode === 'card' ? { background: 'var(--card)', color: 'var(--brand)' } : { color: 'var(--text-2)' }"
              :aria-pressed="mode === 'card'"
              @click="switchMode('card')"
            >
              卡片模式
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
              :style="mode === 'danmaku' ? { background: 'var(--card)', color: 'var(--brand)' } : { color: 'var(--text-2)' }"
              :aria-pressed="mode === 'danmaku'"
              @click="switchMode('danmaku')"
            >
              弹幕模式
            </button>
          </div>

          <button
            type="button"
            class="inline-flex items-center gap-1 text-xs transition-colors hover:text-[var(--brand)]"
            style="color: var(--text-2)"
            aria-label="刷新留言"
            @click="loadMessages"
          >
            <el-icon :size="13"><Refresh /></el-icon>
            刷新
          </button>
        </div>

        <div v-if="loading" class="mt-5">
          <SkeletonList variant="card" :count="6" />
        </div>

        <EmptyState
          v-else-if="messages.length === 0"
          class="mt-5"
          icon="comment"
          title="还没有留言"
          description="写下第一条吧，让这块板子开始有温度。"
        />

        <template v-else>
          <div v-if="mode === 'danmaku'" class="danmaku-stage mt-5">
            <Danmaku
              :danmus="danmakuItems"
              :speeds="110"
              :font-size="16"
              :loop="true"
              class="h-full w-full"
            />
            <p class="danmaku-hint">弹幕仅展示已通过审核的留言</p>
          </div>

          <div v-else class="mt-5 grid gap-4 sm:grid-cols-2">
            <MessageCard v-for="message in messages" :key="message.id" :message="message" />
          </div>

          <Pagination
            v-if="mode === 'card'"
            :page="page"
            :total="total"
            :page-size="PAGE_SIZE"
            class="mt-6"
            @update:page="page = $event"
          />
        </template>
      </div>

      <div class="order-1 lg:order-2">
        <div class="card p-5 lg:sticky lg:top-[calc(var(--header-h)+1.5rem)]">
          <h2 class="text-base font-bold">写下留言</h2>
          <p class="mt-1 text-xs" style="color: var(--text-2)">访客免登录，提交后需要等站长审核。</p>

          <el-form
            ref="formRef"
            :model="form"
            :rules="rules"
            label-position="top"
            class="mt-4"
            @submit.prevent="submit"
          >
            <el-form-item label="昵称" prop="nickname">
              <el-input v-model="form.nickname" maxlength="20" placeholder="怎么称呼你" />
            </el-form-item>

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

            <el-form-item label="弹幕颜色">
              <div class="flex flex-wrap items-center gap-2">
                <button
                  v-for="color in COLOR_PALETTE"
                  :key="color"
                  type="button"
                  class="h-6 w-6 rounded-full border-2 transition-transform"
                  :style="{
                    background: color,
                    borderColor: form.color === color ? 'var(--text)' : 'transparent',
                    transform: form.color === color ? 'scale(1.12)' : undefined,
                  }"
                  :aria-label="`选择颜色 ${color}`"
                  :aria-pressed="form.color === color"
                  @click="form.color = color"
                />
              </div>
            </el-form-item>

            <button type="submit" class="btn btn-primary mt-1 w-full" :disabled="submitting">
              {{ submitting ? '提交中…' : '提交留言' }}
            </button>
          </el-form>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.danmaku-stage {
  position: relative;
  height: 420px;
  overflow: hidden;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-soft);
}

.danmaku-hint {
  position: absolute;
  bottom: 8px;
  left: 12px;
  font-size: 11px;
  color: var(--text-2);
  opacity: 0.7;
}
</style>
