<script setup lang="ts">
import { computed, ref } from 'vue'
import { ChatDotRound } from '@element-plus/icons-vue'
import CommentSection from '@/components/comment/CommentSection.vue'
import LikeButton from '@/components/common/LikeButton.vue'
import { likeTalk } from '@/api/talk'
import type { Talk } from '@/api/types'
import { useSiteStore } from '@/stores/site'
import { avatarInitial, avatarStyle } from '@/utils/avatar'
import { formatRelative } from '@/utils/format'
import { useLikeTarget } from '@/utils/like'

const props = defineProps<{ talk: Talk }>()

const site = useSiteStore()
const commentsOpen = ref(false)
const avatarFailed = ref(false)

const { liked, count, pending, toggle } = useLikeTarget({
  key: () => `talk:${props.talk.id}`,
  initialCount: () => props.talk.likeCount,
  action: () => likeTalk(props.talk.id),
})

const authorStyle = computed(() => avatarStyle(site.author, true))
const authorInitial = computed(() => avatarInitial(site.author))
const imageGridClass = computed(() => {
  const length = props.talk.images.length
  if (length === 1) return 'talk-grid--single'
  if (length === 2) return 'talk-grid--double'
  return ''
})
</script>

<template>
  <article class="talk-item">
    <div class="talk-avatar">
      <img
        v-if="site.avatar && !avatarFailed"
        :src="site.avatar"
        :alt="`${site.author} 的头像`"
        loading="lazy"
        decoding="async"
        @error="avatarFailed = true"
      />
      <span v-else :style="authorStyle" aria-hidden="true">{{ authorInitial }}</span>
    </div>

    <div class="talk-main">
      <p class="talk-name">{{ site.author }}</p>
      <p class="talk-content">{{ talk.content }}</p>

      <div v-if="talk.images.length > 0" class="talk-grid" :class="imageGridClass">
        <el-image
          v-for="(image, index) in talk.images"
          :key="image"
          :src="image"
          :alt="`说说配图 ${index + 1}`"
          fit="cover"
          lazy
          :preview-src-list="talk.images"
          :initial-index="index"
          preview-teleported
          class="talk-grid__img"
        >
          <template #error>
            <div class="talk-grid__error">图片加载失败</div>
          </template>
        </el-image>
      </div>

      <div class="talk-foot">
        <span class="talk-time">{{ formatRelative(talk.createdAt) }}</span>
        <LikeButton :count="count" :liked="liked" :pending="pending" label="点赞说说" @toggle="toggle" />
        <button
          type="button"
          class="talk-comment-toggle"
          :aria-expanded="commentsOpen"
          @click="commentsOpen = !commentsOpen"
        >
          <el-icon :size="14"><ChatDotRound /></el-icon>
          评论 {{ talk.commentCount }}
        </button>
      </div>

      <CommentSection
        v-if="commentsOpen"
        :target-type="'talk'"
        :target-id="talk.id"
        title="评论"
        :page-size="5"
      />
    </div>
  </article>
</template>
