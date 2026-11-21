import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { LikeResult } from '@/api/types'

const STORAGE_PREFIX = 'luna-liked:'

export function hasLiked(key: string): boolean {
  try {
    return localStorage.getItem(STORAGE_PREFIX + key) === '1'
  } catch {
    return false
  }
}

function markLiked(key: string): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, '1')
  } catch {
    /* 隐私模式下忽略 */
  }
}

export interface LikeTargetOptions {
  /** 唯一 key，如 `article:12` / `comment:34` */
  key: () => string
  /** 服务端返回的点赞数（响应式 getter） */
  initialCount: () => number
  /** 点赞请求 */
  action: () => Promise<LikeResult>
}

export interface LikeTargetState {
  liked: Ref<boolean>
  count: ComputedRef<number>
  pending: Ref<boolean>
  toggle: () => Promise<void>
}

/**
 * 点赞交互：乐观更新 + 本地记录已赞（同一 IP 重复点击由后端幂等保证）。
 * 失败时回滚到服务端状态。
 */
export function useLikeTarget(options: LikeTargetOptions): LikeTargetState {
  const liked = ref(hasLiked(options.key()))
  const pending = ref(false)
  const optimisticCount = ref<number | null>(null)
  const count = computed(() => optimisticCount.value ?? Math.max(0, options.initialCount()))

  async function toggle(): Promise<void> {
    if (pending.value || liked.value) return

    pending.value = true
    liked.value = true
    optimisticCount.value = count.value + 1

    try {
      const result = await options.action()
      optimisticCount.value = Math.max(0, result.likeCount)
      liked.value = true
      markLiked(options.key())
    } catch {
      liked.value = hasLiked(options.key())
      optimisticCount.value = null
    } finally {
      pending.value = false
    }
  }

  return { liked, count, pending, toggle }
}
