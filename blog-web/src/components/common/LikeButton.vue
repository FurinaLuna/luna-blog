<script setup lang="ts">
withDefaults(
  defineProps<{
    count: number
    liked: boolean
    pending?: boolean
    label?: string
    size?: 'sm' | 'lg'
  }>(),
  { pending: false, label: '点赞', size: 'sm' },
)

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="like-btn"
    :class="[`like-btn--${size}`, { 'is-liked': liked }]"
    :aria-label="`${label}，当前 ${count} 个赞`"
    :aria-pressed="liked"
    :disabled="pending || liked"
    @click.stop="emit('toggle')"
  >
    <svg
      viewBox="0 0 24 24"
      :fill="liked ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      :class="['like-icon', { 'like-pop': liked }]"
      aria-hidden="true"
    >
      <path d="M12 20.5s-7.5-4.6-7.5-9.6A4.4 4.4 0 0 1 12 7.5a4.4 4.4 0 0 1 7.5 3.4c0 5-7.5 9.6-7.5 9.6Z" />
    </svg>
    <span class="tabular-nums">{{ count }}</span>
  </button>
</template>

<style scoped>
.like-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border: 0;
  background: transparent;
  color: var(--meta-color);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    color 0.18s ease,
    transform 0.18s ease;
}

.like-btn--sm {
  padding: 0.1rem 0.2rem;
}

.like-btn--lg {
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.4rem 0.8rem;
  font-size: 0.95rem;
}

.like-btn--lg .like-icon {
  width: 1.6rem;
  height: 1.6rem;
}

.like-btn--sm .like-icon {
  width: 1rem;
  height: 1rem;
}

.like-btn:hover:not(:disabled) {
  color: var(--top);
  transform: scale(1.08);
}

.like-btn.is-liked,
.like-btn:disabled {
  color: var(--top);
  cursor: default;
}

.like-pop {
  animation: like-pop 0.35s ease;
}

@keyframes like-pop {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.35);
  }

  100% {
    transform: scale(1);
  }
}
</style>
