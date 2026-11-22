<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 5 })
</script>

<template>
  <div class="home-list" aria-hidden="true">
    <div
      v-for="index in count"
      :key="index"
      class="home-article home-article--skeleton"
      :class="{ 'home-article--reverse': index % 2 === 0 }"
    >
      <div class="skeleton home-article__cover home-article__cover--skeleton"></div>
      <div class="home-article__info home-article__info--skeleton">
        <div class="skeleton home-skeleton__title"></div>
        <div class="skeleton home-skeleton__meta"></div>
        <div class="skeleton home-skeleton__line"></div>
        <div class="skeleton home-skeleton__line home-skeleton__line--short"></div>
      </div>
    </div>
  </div>
</template>
