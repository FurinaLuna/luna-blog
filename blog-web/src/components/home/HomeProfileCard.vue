<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SocialLinks from '@/components/common/SocialLinks.vue'
import { useSiteStore } from '@/stores/site'
import { avatarInitial } from '@/utils/avatar'
import { formatCompact } from '@/utils/format'

const site = useSiteStore()

const avatarFailed = ref(false)
watch(
  () => site.avatar,
  () => {
    avatarFailed.value = false
  },
)

/** 资料卡横幅：优先用后台给首页配的横幅，否则用渐变兜底 */
const bannerUrl = computed(() => (site.config?.pageBanners?.home ?? '').trim())
const bannerStyle = computed(() =>
  bannerUrl.value ? { backgroundImage: `url("${bannerUrl.value}")` } : undefined,
)

const showAvatar = computed(() => Boolean(site.avatar) && !avatarFailed.value)
const initial = computed(() => avatarInitial(site.siteName))
const socialLinks = computed(() => site.resolvedSocialLinks)

const stats = computed(() => [
  { key: 'article', label: '文章', value: formatCompact(site.stats?.article ?? 0) },
  { key: 'category', label: '分类', value: formatCompact(site.stats?.category ?? 0) },
  { key: 'tag', label: '标签', value: formatCompact(site.stats?.tag ?? 0) },
])
</script>

<template>
  <section class="card home-profile">
    <div
      class="home-profile__banner"
      :class="{ 'home-profile__banner--fallback': !bannerUrl }"
      :style="bannerStyle"
      aria-hidden="true"
    ></div>

    <div class="home-profile__head">
      <RouterLink
        to="/about"
        class="home-profile__avatar"
        :class="{ 'home-profile__avatar--fallback': !showAvatar }"
        :aria-label="`关于 ${site.siteName}`"
      >
        <img
          v-if="showAvatar"
          :src="site.avatar"
          :alt="site.siteName"
          @error="avatarFailed = true"
        />
        <span v-else>{{ initial }}</span>
      </RouterLink>
      <span class="home-profile__name">{{ site.siteName }}</span>
    </div>

    <p class="home-profile__desc">{{ site.siteDescription }}</p>

    <div class="home-profile__stats">
      <div v-for="item in stats" :key="item.key" class="home-profile__stat">
        <span class="home-profile__stat-value">{{ item.value }}</span>
        <span class="home-profile__stat-label">{{ item.label }}</span>
      </div>
    </div>

    <div class="home-profile__actions">
      <RouterLink to="/about" class="btn btn-primary home-profile__about">关于我</RouterLink>
      <SocialLinks v-if="socialLinks.length > 0" :links="socialLinks" />
    </div>
  </section>
</template>
