<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Promotion } from '@element-plus/icons-vue'
import Danmaku from 'vue3-danmaku'
import 'vue3-danmaku/dist/vue3-danmaku.css'
import { createMessage } from '@/api/message'
import type { Message } from '@/api/types'
import { loadVisitor } from '@/utils/visitor'
import { MESSAGE_COLORS, resolveMessageColor } from './colors'

const props = withDefaults(
  defineProps<{
    messages: Message[]
    loading?: boolean
  }>(),
  { loading: false },
)

const emit = defineEmits<{ 'switch-mode': []; submitted: [] }>()

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => HTML_ESCAPES[char] ?? char)
}

const value = ref('')
const expanded = ref(false)
const sending = ref(false)
const inputRef = ref<HTMLInputElement | null>(null)

const hasDanmaku = computed(() => !props.loading && props.messages.length > 0)

/** 留言少时一轮播完再重挂，避免同几条同时刷屏 */
const loopDanmaku = computed(() => props.messages.length > 100)
const playKey = ref(0)
let restartTimer = 0

function handlePlayEnd(): void {
  if (loopDanmaku.value) return
  window.clearTimeout(restartTimer)
  restartTimer = window.setTimeout(() => {
    playKey.value += 1
  }, 400)
}

watch(
  () => props.messages.length,
  () => {
    playKey.value += 1
  },
)

onBeforeUnmount(() => {
  window.clearTimeout(restartTimer)
})

/** vue3-danmaku 文本模式直接 innerHTML，必须自己转义后再拼头像 + 「昵称：内容」 */
const danmakuItems = computed<string[]>(() =>
  props.messages.map((message, index) => {
    const color = resolveMessageColor(message.color, index)
    const nickname = message.nickname.trim() || '匿名访客'
    const initial = nickname.charAt(0).toUpperCase()
    return [
      `<span style="display:inline-flex;align-items:center;justify-content:center;width:1.5em;height:1.5em;margin-right:.4em;border-radius:50%;background:${color};color:#fff;font-size:.68em;font-weight:700;vertical-align:-.2em">${escapeHtml(initial)}</span>`,
      `<span>${escapeHtml(nickname)}</span>`,
      `<span>：${escapeHtml(message.content)}</span>`,
    ].join('')
  }),
)

interface StarStyle {
  top: string
  left: string
  delay: string
  duration: string
}

/** 20 颗流星：随机的 top/left/延迟/时长（只在挂载时算一次） */
const stars: StarStyle[] = Array.from({ length: 20 }, () => ({
  top: `${(26 + Math.random() * 48).toFixed(2)}%`,
  left: `${(22 + Math.random() * 56).toFixed(2)}%`,
  delay: `${(Math.random() * 5).toFixed(2)}s`,
  duration: `${(4 + Math.random() * 4).toFixed(2)}s`,
}))

function expand(): void {
  if (expanded.value) return
  expanded.value = true
  void nextTick(() => inputRef.value?.focus())
}

function collapse(): void {
  if (value.value.trim()) return
  expanded.value = false
  inputRef.value?.blur()
}

async function send(): Promise<void> {
  const content = value.value.trim()
  if (content.length < 2) {
    ElMessage.warning('多说两个字吧')
    return
  }
  if (sending.value) return

  sending.value = true
  try {
    const nickname = loadVisitor().nickname.trim() || '匿名访客'
    const color = MESSAGE_COLORS[Math.floor(Math.random() * MESSAGE_COLORS.length)]
    await createMessage({ nickname: nickname.slice(0, 20), content: content.slice(0, 200), color })
    ElMessage.success('弹幕已提交，等待站长审核')
    value.value = ''
    expanded.value = false
    inputRef.value?.blur()
    emit('submitted')
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <section class="danmaku-stage" aria-label="弹幕留言墙">
    <div class="danmaku-stage__stars" aria-hidden="true">
      <div class="danmaku-stage__night">
        <span
          v-for="(star, index) in stars"
          :key="index"
          class="danmaku-stage__star"
          :style="{
            top: star.top,
            left: star.left,
            animationDelay: star.delay,
            animationDuration: star.duration,
          }"
        />
      </div>
    </div>

    <el-popover placement="bottom" trigger="hover" :width="150">
      <template #reference>
        <button type="button" class="danmaku-stage__title" @click="emit('switch-mode')">留言板</button>
      </template>
      <span class="danmaku-stage__tip">切换成卡片模式</span>
    </el-popover>

    <p class="danmaku-stage__hint">点击标题切回卡片模式 · 弹幕只显示已通过审核的留言</p>

    <div class="danmaku-stage__layer">
      <Danmaku
        v-if="hasDanmaku"
        :key="playKey"
        class="danmaku-stage__danmaku"
        :danmus="danmakuItems"
        :speeds="40"
        :font-size="20"
        :loop="loopDanmaku"
        extra-style="color: #fff"
        is-suspend
        @play-end="handlePlayEnd"
      />

      <p v-else-if="loading" class="danmaku-stage__state">
        <el-icon class="is-loading" :size="18"><Loading /></el-icon>
        弹幕加载中…
      </p>

      <p v-else class="danmaku-stage__state">还没有通过审核的留言，来发第一条吧</p>
    </div>

    <div
      class="danmaku-publish"
      :class="{ 'is-expanded': expanded }"
      @mouseenter="expand"
      @mouseleave="collapse"
    >
      <button
        v-show="!expanded"
        type="button"
        class="danmaku-publish__trigger"
        aria-label="发弹幕"
        @click="expand"
      >
        <el-icon :size="20"><Promotion /></el-icon>
      </button>

      <Transition name="danmaku-expand">
        <div v-if="expanded" class="danmaku-publish__box">
          <input
            ref="inputRef"
            v-model="value"
            class="danmaku-publish__input"
            type="text"
            :maxlength="200"
            aria-label="弹幕内容"
            placeholder="发一条弹幕，Enter 发送"
            @keydown.enter.prevent="send"
            @keydown.esc="expanded = false"
          />
          <button
            type="button"
            class="danmaku-publish__send"
            :disabled="sending"
            aria-label="发送弹幕"
            @click="send"
          >
            <el-icon :size="16"><Promotion /></el-icon>
          </button>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.danmaku-stage {
  position: relative;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  min-height: 560px;
  overflow: hidden;
  background: radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%);
}

/* 顶栏区域压一层暗色渐变，弹幕飘到顶栏下面时逐渐隐去 */
.danmaku-stage::after {
  position: absolute;
  top: 0;
  right: 0;
  left: 0;
  z-index: 3;
  height: calc(var(--header-h) + 1.4rem);
  background: linear-gradient(180deg, rgb(9 10 15 / 92%) 0%, rgb(9 10 15 / 0%) 100%);
  pointer-events: none;
  content: '';
}

/* 流星：45° 旋转的夜空层 + 长尾渐变，tail 拉宽 / shooting 位移 */
.danmaku-stage__stars {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.danmaku-stage__night {
  position: absolute;
  inset: -50%;
  transform: rotateZ(45deg);
}

.danmaku-stage__star {
  position: absolute;
  width: 0;
  height: 2px;
  border-radius: 999px;
  background: linear-gradient(-45deg, rgba(95, 145, 255, 1), rgba(0, 0, 255, 0));
  filter: drop-shadow(0 0 6px rgba(105, 155, 255, 1));
  animation-name: message-star-tail, message-star-shooting;
  animation-timing-function: ease-in-out;
  animation-iteration-count: infinite;
}

@keyframes message-star-tail {
  0% {
    width: 0;
  }

  30% {
    width: 100px;
  }

  100% {
    width: 0;
  }
}

@keyframes message-star-shooting {
  0% {
    transform: translateX(0);
  }

  100% {
    transform: translateX(760px);
  }
}

.danmaku-stage__title {
  position: absolute;
  top: 30%;
  left: 50%;
  z-index: 4;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--router-color);
  font-size: 2.4rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  white-space: nowrap;
  text-shadow: 0 4px 26px rgba(0, 0, 0, 0.9);
  cursor: pointer;
  transform: translateX(-50%);
  transition:
    color 0.25s ease,
    text-shadow 0.25s ease;
}

.danmaku-stage__title:hover {
  color: #fff;
  text-shadow: 0 0 26px rgba(105, 155, 255, 0.85);
}

.danmaku-stage__hint {
  position: absolute;
  top: calc(30% + 3.6rem);
  left: 50%;
  z-index: 4;
  margin: 0;
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.8rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
  transform: translateX(-50%);
  pointer-events: none;
}

.danmaku-stage__layer {
  position: absolute;
  top: calc(var(--header-h) + 0.6rem);
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 2;
}

.danmaku-stage__danmaku {
  width: 100%;
  height: 100%;
}

.danmaku-stage__state {
  position: absolute;
  top: 50%;
  left: 50%;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.92rem;
  letter-spacing: 0.06em;
  white-space: nowrap;
  transform: translate(-50%, -50%);
}

.danmaku-publish {
  position: absolute;
  right: 0;
  bottom: 1.6rem;
  left: 0;
  z-index: 5;
  display: flex;
  justify-content: center;
}

.danmaku-publish__trigger {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition:
    transform 0.25s ease,
    background-color 0.25s ease;
}

.danmaku-publish__trigger:hover {
  background: rgba(255, 255, 255, 0.24);
  transform: scale(1.06);
}

.danmaku-publish__box {
  display: flex;
  width: min(320px, calc(100% - 2rem));
  height: 60px;
  align-items: center;
  gap: 0.5rem;
  padding: 0 10px 0 18px;
  border-radius: 60px;
  background: #676767;
  box-shadow: 0 10px 26px -12px rgba(0, 0, 0, 0.9);
}

.danmaku-publish__input {
  flex: 1;
  min-width: 0;
  border: 0;
  background: transparent;
  color: #fff;
  font-size: 0.92rem;
  outline: none;
}

.danmaku-publish__input::placeholder {
  color: rgba(255, 255, 255, 0.55);
}

.danmaku-publish__send {
  display: grid;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--primary);
  color: #fff;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.danmaku-publish__send:hover:not(:disabled) {
  background: var(--primary-hover);
}

.danmaku-publish__send:disabled {
  cursor: default;
  opacity: 0.6;
}

.danmaku-expand-enter-active,
.danmaku-expand-leave-active {
  transition:
    opacity 0.24s ease,
    transform 0.24s ease;
}

.danmaku-expand-enter-from,
.danmaku-expand-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.96);
}

@media (max-width: 640px) {
  .danmaku-stage__title {
    font-size: 1.9rem;
  }

  .danmaku-stage__hint {
    top: calc(30% + 2.9rem);
    font-size: 0.72rem;
  }

  .danmaku-publish__box {
    width: calc(100% - 2rem);
  }
}
</style>
