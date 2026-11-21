<script setup lang="ts">
import PrototypeWaves from '@/components/common/PrototypeWaves.vue'

/**
 * 原型内页 banner：天空+云层背景（纯 CSS，离线可看）→ 暗色遮罩 → 居中标题 → 底部波浪。
 * 文章详情等页面用默认插槽自定义内容（标题 / meta / 按钮）。
 */
withDefaults(
  defineProps<{
    title?: string
    subtitle?: string
  }>(),
  { title: '', subtitle: '' },
)
</script>

<template>
  <header class="page-header">
    <div class="page-header__sky" aria-hidden="true"></div>
    <div class="page-header__clouds" aria-hidden="true"></div>

    <div v-if="$slots.default" class="page-header__body">
      <slot />
    </div>
    <div v-else class="route-font">
      <div>{{ title }}</div>
      <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>
    </div>

    <PrototypeWaves variant="header" />
  </header>
</template>

<style scoped>
.page-header__subtitle {
  margin-top: 0.2rem;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.95rem;
  font-weight: 400;
  line-height: 1.6;
  letter-spacing: 0.04em;
}
</style>
