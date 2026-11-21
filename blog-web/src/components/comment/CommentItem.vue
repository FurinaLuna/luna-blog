<script setup lang="ts">
import { computed } from 'vue'
import { Link } from '@element-plus/icons-vue'
import LikeButton from '@/components/common/LikeButton.vue'
import { likeComment } from '@/api/comment'
import type { Comment } from '@/api/types'
import { avatarInitial, avatarStyle } from '@/utils/avatar'
import { formatRelative } from '@/utils/format'
import { useLikeTarget } from '@/utils/like'

const props = withDefaults(defineProps<{ comment: Comment; depth?: 0 | 1 }>(), { depth: 0 })

const emit = defineEmits<{ reply: [comment: Comment] }>()

const { liked, count, pending, toggle } = useLikeTarget({
  key: () => `comment:${props.comment.id}`,
  initialCount: () => props.comment.likeCount,
  action: () => likeComment(props.comment.id),
})

const avatarBoxStyle = computed(() => avatarStyle(props.comment.nickname, props.comment.isAdmin))
const initial = computed(() => avatarInitial(props.comment.nickname))

const websiteHref = computed(() => {
  const url = props.comment.website
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
})

const isReply = computed(() => props.depth > 0)
</script>

<template>
  <article class="comment-box__item" :class="{ 'comment-box__item--reply': isReply }">
    <div class="comment-box__avatar" :style="avatarBoxStyle" aria-hidden="true">
      {{ initial }}
    </div>

    <div class="comment-box__main">
      <div class="comment-box__head">
        <span class="comment-box__name">{{ comment.nickname }}</span>
        <span v-if="comment.isAdmin" class="comment-box__badge">博主</span>
        <a
          v-if="websiteHref"
          :href="websiteHref"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="comment-box__site"
          :aria-label="`访问 ${comment.nickname} 的个人网站`"
        >
          <el-icon :size="12"><Link /></el-icon>
        </a>
        <span class="comment-box__time">{{ formatRelative(comment.createdAt) }}</span>
      </div>

      <div class="comment-box__content">
        <p v-if="comment.replyTo" class="comment-box__reply-to">
          回复 <span>@{{ comment.replyTo.nickname }}</span>
        </p>
        <p class="comment-box__text">{{ comment.content }}</p>
      </div>

      <div class="comment-box__actions">
        <button
          type="button"
          class="comment-box__action"
          :aria-label="`回复 ${comment.nickname}`"
          @click="emit('reply', comment)"
        >
          回复
        </button>
        <LikeButton
          :count="count"
          :liked="liked"
          :pending="pending"
          label="点赞评论"
          @toggle="toggle"
        />
      </div>

      <div v-if="!isReply && comment.replies.length > 0" class="comment-box__replies">
        <CommentItem
          v-for="reply in comment.replies"
          :key="reply.id"
          :comment="reply"
          :depth="1"
          @reply="emit('reply', $event)"
        />
      </div>
    </div>
  </article>
</template>
