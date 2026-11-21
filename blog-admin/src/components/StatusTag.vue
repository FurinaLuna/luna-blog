<script setup lang="ts">
import { computed } from 'vue'
import type { ArticleStatus, ReviewStatus } from '@/api/types'

type TagType = 'primary' | 'success' | 'info' | 'warning' | 'danger'

const props = withDefaults(
  defineProps<{
    status: ArticleStatus | ReviewStatus | 'draft' | 'published' | 'pending' | 'approved' | 'rejected'
    kind?: 'article' | 'review'
  }>(),
  { kind: 'review' },
)

const label = computed(() => {
  switch (props.status) {
    case 'published':
      return '已发布'
    case 'draft':
      return '草稿'
    case 'approved':
      return '已通过'
    case 'rejected':
      return '已拒绝'
    default:
      return '待审核'
  }
})

const type = computed<TagType>(() => {
  switch (props.status) {
    case 'published':
      return 'success'
    case 'draft':
      return 'info'
    case 'approved':
      return 'success'
    case 'rejected':
      return 'danger'
    default:
      return 'warning'
  }
})
</script>

<template>
  <el-tag :type="type" size="small" effect="light" disable-transitions>{{ label }}</el-tag>
</template>
