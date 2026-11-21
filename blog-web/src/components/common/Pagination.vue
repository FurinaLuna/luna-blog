<script setup lang="ts">
withDefaults(
  defineProps<{
    page: number
    total: number
    pageSize?: number
    pagerCount?: number
  }>(),
  { pageSize: 10, pagerCount: 7 },
)

const emit = defineEmits<{ 'update:page': [value: number] }>()

function handleChange(value: number): void {
  emit('update:page', value)
}
</script>

<template>
  <div v-if="total > pageSize" class="pagination-wrap">
    <el-pagination
      background
      layout="prev, pager, next"
      :current-page="page"
      :page-size="pageSize"
      :total="total"
      :pager-count="pagerCount"
      hide-on-single-page
      @current-change="handleChange"
    />
  </div>
</template>
