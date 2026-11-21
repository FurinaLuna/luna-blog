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
const accentStyle = computed(() => (props.message.color ? { color: props.message.color } : undefined))
</script>

<template>
  <article class="message-card">
    <div class="message-card__head">
      <div class="message-card__avatar" :style="avatarBoxStyle" aria-hidden="true">
        {{ initial }}
      </div>
      <div class="message-card__who">
        <p class="message-card__name" :style="accentStyle">{{ message.nickname }}</p>
        <p class="message-card__time">{{ formatRelative(message.createdAt) }}</p>
      </div>
    </div>

    <p class="message-card__body">{{ message.content }}</p>

    <div class="message-card__foot">
      <LikeButton :count="count" :liked="liked" :pending="pending" label="点赞留言" @toggle="toggle" />
    </div>
  </article>
</template>
