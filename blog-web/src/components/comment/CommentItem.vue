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
  <article class="flex gap-3">
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
      :class="isReply ? 'h-8 w-8 text-xs' : ''"
      :style="avatarBoxStyle"
      aria-hidden="true"
    >
      {{ initial }}
    </div>

    <div class="min-w-0 flex-1">
      <div class="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span class="text-sm font-semibold" :class="isReply ? 'text-[13px]' : ''">
          {{ comment.nickname }}
        </span>
        <span v-if="comment.isAdmin" class="admin-badge">博主</span>
        <a
          v-if="websiteHref"
          :href="websiteHref"
          target="_blank"
          rel="noopener noreferrer nofollow"
          class="inline-flex items-center transition-colors hover:text-[var(--brand)]"
          style="color: var(--text-2)"
          :aria-label="`访问 ${comment.nickname} 的个人网站`"
        >
          <el-icon :size="13"><Link /></el-icon>
        </a>
        <span class="ml-auto whitespace-nowrap text-[11px]" style="color: var(--text-2)">
          {{ formatRelative(comment.createdAt) }}
        </span>
      </div>

      <p v-if="comment.replyTo" class="mt-1 text-xs" style="color: var(--text-2)">
        回复
        <span style="color: var(--brand)">@{{ comment.replyTo.nickname }}</span>
      </p>

      <p
        class="mt-1.5 whitespace-pre-line text-sm leading-relaxed"
        :class="isReply ? 'text-[13px]' : ''"
      >
        {{ comment.content }}
      </p>

      <div class="mt-2 flex items-center gap-3">
        <button
          type="button"
          class="text-xs transition-colors hover:text-[var(--brand)]"
          style="color: var(--text-2)"
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

      <div
        v-if="!isReply && comment.replies.length > 0"
        class="mt-3.5 space-y-4 border-l-2 pl-4"
        style="border-color: var(--border)"
      >
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

<style scoped>
.admin-badge {
  display: inline-flex;
  align-items: center;
  padding: 0 0.35rem;
  border-radius: 5px;
  font-size: 0.65rem;
  font-weight: 600;
  line-height: 1.5;
  color: var(--brand-contrast);
  background: var(--brand);
}
</style>
