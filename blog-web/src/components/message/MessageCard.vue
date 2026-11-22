<script setup lang="ts">
import { computed } from 'vue'
import { likeMessage } from '@/api/message'
import type { Message } from '@/api/types'
import { formatArchiveTime } from '@/utils/format'
import { useLikeTarget } from '@/utils/like'
import { mixColor, resolveMessageColor } from './colors'

const props = defineProps<{
  message: Message
  /** 在留言墙中的序号（跨分页连续），用于 #序号 标签 */
  order: number
}>()

const { liked, count, pending, toggle } = useLikeTarget({
  key: () => `message:${props.message.id}`,
  initialCount: () => props.message.likeCount,
  action: () => likeMessage(props.message.id),
})

const baseColor = computed(() => resolveMessageColor(props.message.color, props.order))
const initial = computed(() => {
  const nickname = props.message.nickname.trim()
  return (nickname.charAt(0) || '匿').toUpperCase()
})

/**
 * 卡片整块彩色面板：同色系提亮 → 原色 → 压暗，
 * 再叠一层左上角径向高光，白色正文在深浅两种主题下都可读。
 */
const panelBackground = computed(() => {
  const base = baseColor.value
  const highlight = mixColor(base, 255, 0.18)
  const shade = mixColor(base, 0, 0.24)
  return [
    'radial-gradient(120% 94% at 16% 0%, rgba(255, 255, 255, 0.26) 0%, rgba(255, 255, 255, 0) 58%)',
    `linear-gradient(140deg, ${highlight} 0%, ${base} 54%, ${shade} 100%)`,
  ].join(', ')
})
</script>

<template>
  <article class="message-card" :style="{ backgroundImage: panelBackground }">
    <div class="message-card__head">
      <span class="message-card__avatar" aria-hidden="true">{{ initial }}</span>
      <span class="message-card__nick">{{ message.nickname }}</span>
      <span v-if="order > 0" class="message-card__index">#{{ order }}</span>
    </div>

    <p class="message-card__content">{{ message.content }}</p>

    <div class="message-card__bottom">
      <span class="message-card__time">{{ formatArchiveTime(message.createdAt) }}</span>

      <button
        type="button"
        class="message-card__like"
        :class="{ 'is-liked': liked }"
        :disabled="liked || pending"
        :aria-label="`点赞留言，当前 ${count} 个赞`"
        :aria-pressed="liked"
        @click.stop="toggle"
      >
        <svg
          viewBox="0 0 24 24"
          :fill="liked ? 'currentColor' : 'none'"
          stroke="currentColor"
          stroke-width="1.7"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="message-card__like-icon"
          aria-hidden="true"
        >
          <path d="M12 20.5s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.5a4.4 4.4 0 0 1 7.5 3.4c0 5-7.5 9.6-7.5 9.6Z" />
        </svg>
        <span>{{ count }}</span>
      </button>
    </div>
  </article>
</template>

<style scoped>
.message-card {
  display: flex;
  height: 22rem;
  flex-direction: column;
  padding: 0.65rem 0.7rem 0.55rem;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: var(--message-card-shadow), inset 0 0 0 1px var(--message-card-ring);
  color: #fff;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.message-card:hover {
  box-shadow: var(--message-card-shadow-hover), inset 0 0 0 1px var(--message-card-ring);
  transform: translateY(-4px);
}

.message-card__head {
  display: flex;
  flex: 0 0 4rem;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.message-card__avatar {
  display: grid;
  flex: 0 0 2.15rem;
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border: 1px solid rgba(255, 255, 255, 0.42);
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.24);
  color: #fff;
  font-size: 0.9rem;
  font-weight: 700;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
}

.message-card__nick {
  min-width: 0;
  padding: 3px 8px;
  overflow: hidden;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 0.86rem;
  letter-spacing: 1px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-card__index {
  flex: 0 0 auto;
  margin-left: auto;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.06em;
}

.message-card__content {
  flex: 1 1 auto;
  min-height: 0;
  margin: 0.25rem 0 0;
  padding-right: 0.15rem;
  overflow: auto;
  color: #fff;
  font-size: 0.92rem;
  line-height: 1.85;
  white-space: pre-line;
  word-break: break-all;
  scrollbar-width: none;
}

.message-card__content::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.message-card__bottom {
  display: flex;
  flex: 0 0 2rem;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.3rem;
}

.message-card__time,
.message-card__like {
  padding: 3px 8px;
  border: 0;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.2);
  color: #fff;
  font-size: 0.75rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: 1px;
}

.message-card__like {
  display: inline-flex;
  align-items: center;
  gap: 0.28rem;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.message-card__like:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.34);
}

.message-card__like:disabled {
  cursor: default;
}

.message-card__like.is-liked {
  color: #ffd9d9;
}

.message-card__like-icon {
  width: 0.85rem;
  height: 0.85rem;
}
</style>
