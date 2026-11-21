<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface Props {
  src?: string | null
  alt: string
  /** 无封面时用于生成首字与占位色 */
  seed?: string
  /** CSS aspect-ratio，例如 '16 / 9' */
  ratio?: string
  rounded?: string
  imgClass?: string
  /** 无封面时只保留渐变底，不显示首字占位（当上层还有标题遮罩时用） */
  plainFallback?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  seed: '',
  ratio: '16 / 9',
  rounded: 'rounded-[8px]',
  imgClass: '',
  plainFallback: false,
})

const failed = ref(false)
const loaded = ref(false)

watch(
  () => props.src,
  () => {
    failed.value = false
    loaded.value = false
  },
)

const showImage = computed(() => Boolean(props.src) && !failed.value)

const initial = computed(() => {
  const source = (props.seed || props.alt || 'L').trim()
  return source.charAt(0).toUpperCase()
})

/** 无封面时的渐变兜底：按标题哈希取一种蓝色系渐变，保持站内调性统一 */
const palette = computed(() => {
  const source = props.seed || props.alt
  let hash = 0
  for (const char of source) {
    hash = (hash + (char.codePointAt(0) ?? 0)) % 997
  }
  const variants = [
    'linear-gradient(135deg, #7ec8f8 0%, #49b1f5 55%, #2f8fd8 100%)',
    'linear-gradient(135deg, #a4d8fa 0%, #6cbcf7 50%, #3f9ee0 100%)',
    'linear-gradient(135deg, #9face6 0%, #74c6e8 55%, #49b1f5 100%)',
    'linear-gradient(135deg, #b7d3ea 0%, #7fb6e2 55%, #4a9fd6 100%)',
  ]
  return variants[hash % variants.length]
})

/** 用首字 + 博客名做纹理感占位，避免大面积纯色块 */
const watermark = computed(() => (props.seed || props.alt || '').slice(0, 2))
</script>

<template>
  <div
    class="relative overflow-hidden"
    :class="rounded"
    :style="{ aspectRatio: ratio, backgroundColor: 'var(--bg-soft)' }"
  >
    <img
      v-if="showImage"
      :src="src ?? undefined"
      :alt="alt"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover transition-opacity duration-500"
      :class="[loaded ? 'opacity-100' : 'opacity-0', imgClass]"
      @load="loaded = true"
      @error="failed = true"
    />
    <div
      v-else
      class="cover-placeholder"
      :style="{ backgroundImage: palette }"
      aria-hidden="true"
    >
      <template v-if="!plainFallback">
        <span class="cover-placeholder__text">{{ watermark }}</span>
        <span class="cover-placeholder__initial">{{ initial }}</span>
      </template>
    </div>
  </div>
</template>

<style scoped>
.cover-placeholder {
  display: flex;
  width: 100%;
  height: 100%;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.92);
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.18);
}

.cover-placeholder__text {
  font-size: 0.8rem;
  letter-spacing: 0.3em;
  opacity: 0.75;
}

.cover-placeholder__initial {
  margin-top: 0.2rem;
  font-size: 2rem;
  font-weight: 800;
  line-height: 1;
}
</style>
