<script setup lang="ts">
export type EmptyIcon = 'inbox' | 'search' | 'comment' | 'image' | 'music' | 'error'

withDefaults(
  defineProps<{
    title?: string
    description?: string
    icon?: EmptyIcon
    actionText?: string
  }>(),
  {
    title: '这里还什么都没有',
    description: '',
    icon: 'inbox',
    actionText: '',
  },
)

const emit = defineEmits<{ action: [] }>()
</script>

<template>
  <div class="empty-box">
    <div class="empty-box__icon" aria-hidden="true">
      <svg
        v-if="icon === 'search'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-6 w-6"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
      <svg
        v-else-if="icon === 'comment'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-6 w-6"
      >
        <path d="M21 12a8 8 0 0 1-8 8H7l-4 3v-7a8 8 0 0 1 8-8h2a8 8 0 0 1 8 4Z" />
      </svg>
      <svg
        v-else-if="icon === 'image'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-6 w-6"
      >
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m4 17 5-4 4 3 3-2 4 3" />
      </svg>
      <svg
        v-else-if="icon === 'music'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-6 w-6"
      >
        <path d="M9 18V6l11-2v12" />
        <circle cx="6" cy="18" r="2.4" />
        <circle cx="17" cy="16" r="2.4" />
      </svg>
      <svg
        v-else-if="icon === 'error'"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-6 w-6"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v5M12 16.5v.5" />
      </svg>
      <svg
        v-else
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.6"
        stroke-linecap="round"
        stroke-linejoin="round"
        class="h-6 w-6"
      >
        <path d="M4 7h16v13H4z" />
        <path d="M4 7l8 6 8-6" />
      </svg>
    </div>

    <p class="empty-box__title">{{ title }}</p>
    <p v-if="description" class="max-w-sm text-xs leading-relaxed">{{ description }}</p>

    <button v-if="actionText" type="button" class="btn btn-primary mt-1" @click="emit('action')">
      {{ actionText }}
    </button>
  </div>
</template>
