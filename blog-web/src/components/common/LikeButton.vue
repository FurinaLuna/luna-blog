<script setup lang="ts">
withDefaults(
  defineProps<{
    count: number
    liked: boolean
    pending?: boolean
    label?: string
  }>(),
  { pending: false, label: '点赞' },
)

const emit = defineEmits<{ toggle: [] }>()
</script>

<template>
  <button
    type="button"
    class="like-btn"
    :class="{ 'is-liked': liked }"
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
      class="h-3.5 w-3.5"
      :class="{ 'like-pop': liked }"
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
  padding: 0.3rem 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-2);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  transition:
    color 0.18s ease,
    border-color 0.18s ease,
    background-color 0.18s ease;
}

.like-btn:hover:not(:disabled) {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
}

.like-btn.is-liked,
.like-btn:disabled {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 40%, var(--border));
  background: var(--accent-soft);
  cursor: default;
}

.like-pop {
  animation: luna-pop 0.35s ease;
}
</style>
