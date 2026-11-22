<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Plus } from '@element-plus/icons-vue'
import PageHeader from '@/components/common/PageHeader.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import DanmakuStage from '@/components/message/DanmakuStage.vue'
import MessageCard from '@/components/message/MessageCard.vue'
import MessagePublishDialog from '@/components/message/MessagePublishDialog.vue'
import { getMessages } from '@/api/message'
import type { Message } from '@/api/types'

type MessageMode = 'card' | 'danmaku'

const CARD_PAGE_SIZE = 10
const DANMAKU_PAGE_SIZE = 50

const mode = ref<MessageMode>('card')
const messages = ref<Message[]>([])
const page = ref(1)
const totalPages = ref(1)
const loadingFirst = ref(true)
const loadingMore = ref(false)
const danmakuMessages = ref<Message[]>([])
const danmakuLoading = ref(false)
const publishVisible = ref(false)

const sentinelRef = ref<HTMLDivElement | null>(null)
let observer: IntersectionObserver | null = null

const ended = computed(() => messages.value.length > 0 && page.value >= totalPages.value)

function scrollTop(): void {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function switchMode(): void {
  mode.value = mode.value === 'card' ? 'danmaku' : 'card'
  scrollTop()
}

function openPublish(): void {
  publishVisible.value = true
}

async function loadFirstPage(): Promise<void> {
  loadingFirst.value = true
  try {
    const result = await getMessages({ page: 1, pageSize: CARD_PAGE_SIZE })
    messages.value = result.list
    page.value = 1
    totalPages.value = Math.max(1, result.totalPages)
  } finally {
    loadingFirst.value = false
  }
}

async function loadMore(): Promise<void> {
  if (loadingFirst.value || loadingMore.value || page.value >= totalPages.value) return
  loadingMore.value = true
  try {
    const nextPage = page.value + 1
    const result = await getMessages({ page: nextPage, pageSize: CARD_PAGE_SIZE })
    const known = new Set(messages.value.map((item) => item.id))
    messages.value = [...messages.value, ...result.list.filter((item) => !known.has(item.id))]
    page.value = nextPage
    totalPages.value = Math.max(1, result.totalPages)
  } finally {
    loadingMore.value = false
  }
}

function stopObserver(): void {
  observer?.disconnect()
  observer = null
}

function observeSentinel(el: HTMLDivElement | null): void {
  stopObserver()
  if (!el || typeof IntersectionObserver === 'undefined') return
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0]?.isIntersecting) void loadMore()
    },
    { rootMargin: '0px 0px 300px 0px' },
  )
  observer.observe(el)
}

async function loadDanmaku(): Promise<void> {
  danmakuLoading.value = true
  try {
    const result = await getMessages({ page: 1, pageSize: DANMAKU_PAGE_SIZE }, { silent: true })
    danmakuMessages.value = result.list
  } finally {
    danmakuLoading.value = false
  }
}

function handlePublished(): void {
  ElMessage.success('留言已提交，等待站长审核')
  void loadFirstPage()
  if (mode.value === 'danmaku') void loadDanmaku()
}

function handleDanmakuPublished(): void {
  void loadDanmaku()
}

watch(mode, (next) => {
  if (next === 'danmaku') void loadDanmaku()
})

watch(sentinelRef, (el) => {
  observeSentinel(el)
})

onMounted(() => {
  void loadFirstPage()
})

onBeforeUnmount(() => {
  stopObserver()
})
</script>

<template>
  <div class="message-page">
    <template v-if="mode === 'card'">
      <PageHeader>
        <div class="message-page__heading">
          <el-popover placement="bottom" trigger="hover" :width="150">
            <template #reference>
              <button type="button" class="message-page__title" @click="switchMode">留言板</button>
            </template>
            <span>切换成弹幕模式</span>
          </el-popover>
          <p class="message-page__subtitle">生活原本沉闷，但跑起来就会有风</p>
        </div>
      </PageHeader>

      <div class="message-page__toolbar">
        <button type="button" class="message-page__publish" @click="openPublish">
          <el-icon :size="18"><Plus /></el-icon>
          <span>发布留言</span>
        </button>
      </div>

      <div class="center_box">
        <el-row v-if="loadingFirst" :gutter="20">
          <el-col v-for="item in 4" :key="item" :xs="24" :sm="12" class="message-page__cell">
            <el-skeleton animated>
              <template #template>
                <el-skeleton-item variant="rect" class="message-page__skeleton-panel" />
              </template>
            </el-skeleton>
          </el-col>
        </el-row>

        <EmptyState
          v-else-if="messages.length === 0"
          icon="comment"
          title="还没有留言"
          description="这里是一面留言墙，写下想说的话，站长审核通过后就会贴上来。"
          action-text="写一条留言"
          @action="openPublish"
        />

        <template v-else>
          <el-row :gutter="20">
            <el-col
              v-for="(message, index) in messages"
              :key="message.id"
              :xs="24"
              :sm="12"
              class="message-page__cell"
            >
              <MessageCard :message="message" :order="index + 1" />
            </el-col>
          </el-row>

          <div class="message-page__observer">
            <template v-if="loadingMore">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>加载中…</span>
            </template>
            <span v-else-if="ended">已经到底了~</span>
            <span v-else>下拉加载更多～</span>
          </div>

          <div ref="sentinelRef" class="message-page__sentinel" aria-hidden="true" />
        </template>
      </div>
    </template>

    <div v-else class="message-page__danmaku">
      <div class="message-page__danmaku-shell">
        <DanmakuStage
          :messages="danmakuMessages"
          :loading="danmakuLoading"
          @switch-mode="switchMode"
          @submitted="handleDanmakuPublished"
        />
      </div>
    </div>

    <MessagePublishDialog v-model="publishVisible" @submitted="handlePublished" />
  </div>
</template>

<style scoped>
.message-page__heading {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.message-page__title {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--router-color);
  font-size: 2.4rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  line-height: 1.2;
  cursor: pointer;
  transition:
    color 0.25s ease,
    text-shadow 0.25s ease;
}

.message-page__title:hover {
  color: #fff;
  text-shadow: 0 0 24px rgba(73, 177, 245, 0.75);
}

.message-page__subtitle {
  margin-top: 0.7rem;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  letter-spacing: 0.04em;
}

/* 头部下方浮起的胶囊发布入口 */
.message-page__toolbar {
  position: relative;
  z-index: 1200;
  display: flex;
  justify-content: center;
  margin-top: -1.6rem;
}

.message-page__publish {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.62rem 1.35rem;
  border: 0;
  border-radius: 999px;
  background-image: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
  box-shadow: 0 10px 24px -12px rgba(73, 177, 245, 0.9);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  cursor: pointer;
  transition:
    transform 0.22s ease,
    box-shadow 0.22s ease;
}

.message-page__publish:hover {
  box-shadow: 0 14px 28px -12px rgba(73, 177, 245, 1);
  transform: translateY(-2px);
}

.message-page__cell {
  margin-bottom: 20px;
}

.message-page__skeleton-panel {
  height: 22rem;
  border-radius: 8px;
}

.message-page__observer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  margin-top: 10px;
  color: var(--meta-color);
  font-size: 0.9rem;
  letter-spacing: 1px;
}

.message-page__sentinel {
  height: 1px;
}

/* 弹幕模式：深色从页面顶部铺满（透明顶栏白字才可读），舞台居中并对齐栅格 */
.message-page__danmaku {
  min-height: 100vh;
  padding: calc(var(--header-h) + 1.1rem) 10px 1.4rem;
  background: radial-gradient(ellipse at top, #10151f 0%, #090a0f 100%);
}

.message-page__danmaku-shell {
  max-width: 880px;
  margin: 0 auto;
}

@media (max-width: 768px) {
  .message-page__title {
    font-size: 1.9rem;
  }

  .message-page__subtitle {
    font-size: 0.85rem;
  }

  .message-page__danmaku {
    padding: calc(var(--header-h) + 0.8rem) 8px 1rem;
  }
}
</style>
