<script setup lang="ts">
import { computed } from 'vue'
import LikeButton from '@/components/common/LikeButton.vue'
import { likeMessage } from '@/api/message'
import type { Message } from '@/api/types'
import { avatarInitial, avatarStyle } from '@/utils/avatar'
import { formatRelative } from '@/utils/format'
import { useLikeTarget } from '@/utils/like'

const props = defineProps<{ message: Message }>()

const { liked, count, pending, toggle } = useLikeTarget({
  key: () => `message:${props.message.id}`,
  initialCount: () => props.message.likeCount,
  action: () => likeMessage(props.message.id),
})

const avatarBoxStyle = computed(() => avatarStyle(props.message.nickname))
const initial = computed(() => avatarInitial(props.message.nickname))
</script>

<template>
  <article
    class="card p-4 transition-shadow duration-200 hover:shadow-[var(--shadow)]"
    :style="message.color ? { borderLeft: `3px solid ${message.color}` } : undefined"
  >
    <header class="flex items-center gap-2.5">
      <div
        class="grid h-9 w-9 shrink-0 place-items-center rounded-full border text-sm font-semibold"
        :style="avatarBoxStyle"
        aria-hidden="true"
      >
        {{ initial }}
      </div>
      <div class="min-w-0">
        <p class="truncate text-sm font-semibold">{{ message.nickname }}</p>
        <p class="text-[11px]" style="color: var(--text-2)">{{ formatRelative(message.createdAt) }}</p>
      </div>
      <span
        v-if="message.color"
        class="ml-auto h-2.5 w-2.5 shrink-0 rounded-full"
        :style="{ background: message.color }"
        aria-hidden="true"
      />
    </header>

    <p class="mt-3 whitespace-pre-line break-words text-sm leading-relaxed">{{ message.content }}</p>

    <div class="mt-2 flex justify-end">
      <LikeButton :count="count" :liked="liked" :pending="pending" label="点赞留言" @toggle="toggle" />
    </div>
  </article>
</template>
