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
  if (length === 1) return 'grid-cols-1'
  if (length === 2) return 'grid-cols-2'
  return 'grid-cols-3'
})
</script>

<template>
  <article class="card p-5 sm:p-6">
    <header class="flex items-center gap-3">
      <img
        v-if="site.avatar && !avatarFailed"
        :src="site.avatar"
        :alt="`${site.author} 的头像`"
        class="h-9 w-9 rounded-full border object-cover"
        style="border-color: var(--border)"
        loading="lazy"
        @error="avatarFailed = true"
      />
      <div
        v-else
        class="grid h-9 w-9 place-items-center rounded-full text-sm font-semibold"
        :style="authorStyle"
        aria-hidden="true"
      >
        {{ authorInitial }}
      </div>
      <div class="min-w-0">
        <p class="text-sm font-semibold">{{ site.author }}</p>
        <p class="text-[11px]" style="color: var(--text-2)">{{ formatRelative(talk.createdAt) }}</p>
      </div>
      <span
        class="ml-auto rounded-md px-1.5 py-0.5 text-[11px] font-medium"
        style="background: var(--brand-soft); color: var(--brand)"
      >
        说说
      </span>
    </header>

    <p class="mt-4 whitespace-pre-line text-[15px] leading-relaxed">{{ talk.content }}</p>

    <div v-if="talk.images.length > 0" class="mt-4 grid gap-1.5" :class="imageGridClass">
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
        class="w-full overflow-hidden rounded-lg"
        :class="talk.images.length === 1 ? 'max-h-96 aspect-[4/3]' : 'aspect-square'"
      >
        <template #error>
          <div
            class="grid h-full w-full place-items-center text-xs"
            style="background: var(--bg-soft); color: var(--text-2)"
          >
            图片加载失败
          </div>
        </template>
      </el-image>
    </div>

    <footer class="mt-4 flex items-center gap-4 border-t pt-3" style="border-color: var(--border)">
      <LikeButton :count="count" :liked="liked" :pending="pending" label="点赞说说" @toggle="toggle" />
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs transition-colors hover:text-[var(--brand)]"
        style="color: var(--text-2)"
        :aria-expanded="commentsOpen"
        @click="commentsOpen = !commentsOpen"
      >
        <el-icon :size="14"><ChatDotRound /></el-icon>
        评论 {{ talk.commentCount }}
      </button>
    </footer>

    <CommentSection
      v-if="commentsOpen"
      :target-type="'talk'"
      :target-id="talk.id"
      title="评论"
      :page-size="5"
    />
  </article>
</template>
