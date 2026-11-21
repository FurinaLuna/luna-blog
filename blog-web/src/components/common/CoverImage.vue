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
}

const props = withDefaults(defineProps<Props>(), {
  src: null,
  seed: '',
  ratio: '16 / 9',
  rounded: 'rounded-[13px]',
  imgClass: '',
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

/** 根据文本哈希挑一个低饱和渐变，保证占位不破图也不喧宾夺主 */
const palette = computed(() => {
  const source = props.seed || props.alt
  let hash = 0
  for (const char of source) {
    hash = (hash + (char.codePointAt(0) ?? 0)) % 997
  }
  const variants = [
    'linear-gradient(135deg, color-mix(in srgb, var(--brand) 24%, var(--bg-soft)), color-mix(in srgb, var(--brand) 9%, var(--card)))',
    'linear-gradient(135deg, color-mix(in srgb, var(--accent) 22%, var(--bg-soft)), color-mix(in srgb, var(--accent) 8%, var(--card)))',
    'linear-gradient(135deg, color-mix(in srgb, #7f95b8 22%, var(--bg-soft)), color-mix(in srgb, #7f95b8 8%, var(--card)))',
  ]
  return variants[hash % variants.length]
})
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
      class="flex h-full w-full items-center justify-center"
      :style="{ backgroundImage: palette }"
      aria-hidden="true"
    >
      <span
        class="select-none text-2xl font-bold tracking-tight"
        style="color: color-mix(in srgb, var(--text) 32%, transparent)"
      >
        {{ initial }}
      </span>
    </div>
  </div>
</template>
