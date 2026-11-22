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

/** 资料卡横幅：优先用后台单独配置的 profileBanner，其次首页横幅，最后渐变兜底 */
const bannerUrl = computed(() =>
  (site.config?.profileBanner || site.config?.pageBanners?.home || '').trim(),
)
const bannerStyle = computed(() =>
  bannerUrl.value ? { backgroundImage: `url("${bannerUrl.value}")` } : undefined,
)

const showAvatar = computed(() => Boolean(site.avatar) && !avatarFailed.value)
const initial = computed(() => avatarInitial(site.siteName))
const socialLinks = computed(() => site.resolvedSocialLinks)

interface ProfileStat {
  key: string
  label: string
  value: string
  to: string
}

/** 三个数字都能点：文章 → 时间轴、分类 → 分类总览、标签 → 标签云 */
const stats = computed<ProfileStat[]>(() => [
  {
    key: 'article',
    label: '文章',
    value: formatCompact(site.stats?.article ?? 0),
    to: '/archives',
  },
  {
    key: 'category',
    label: '分类',
    value: formatCompact(site.stats?.category ?? 0),
    to: '/categories',
  },
  {
    key: 'tag',
    label: '标签',
    value: formatCompact(site.stats?.tag ?? 0),
    to: '/tags',
  },
])

interface CtaLink {
  url: string
  label: string
}

/** 主按钮：优先 Gitee，其次 GitHub；都没有就退回「关于我」站内页 */
const ctaLink = computed<CtaLink | null>(() => {
  const links = socialLinks.value
  const gitee = links.find((link) => /gitee/i.test(`${link.name} ${link.url} ${link.icon}`))
  if (gitee) return { url: gitee.url, label: 'My Gitee' }
  const github = links.find((link) => /github/i.test(`${link.name} ${link.url} ${link.icon}`))
  if (github) return { url: github.url, label: 'My GitHub' }
  return null
})

/** 社交图标行里不再重复展示主按钮那个链接 */
const restSocialLinks = computed(() =>
  socialLinks.value.filter((link) => link.url !== ctaLink.value?.url),
)

/** 侧栏窄，最多铺 6 个图标，其余折叠成「+N」链到关于页 */
const MAX_SOCIALS = 5
const visibleSocials = computed(() => restSocialLinks.value.slice(0, MAX_SOCIALS))
const hiddenSocialCount = computed(() =>
  Math.max(0, restSocialLinks.value.length - visibleSocials.value.length),
)
</script>

<template>
  <section class="card home-profile">
    <RouterLink to="/about" class="home-profile__banner-link" :aria-label="`关于 ${site.siteName}`">
      <div
        class="home-profile__banner"
        :class="{ 'home-profile__banner--fallback': !bannerUrl }"
        :style="bannerStyle"
      ></div>
    </RouterLink>

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
      <RouterLink to="/about" class="home-profile__name">{{ site.siteName }}</RouterLink>
    </div>

    <p class="home-profile__desc">{{ site.siteDescription }}</p>

    <div class="home-profile__stats">
      <RouterLink v-for="item in stats" :key="item.key" class="home-profile__stat" :to="item.to">
        <span class="home-profile__stat-value">{{ item.value }}</span>
        <span class="home-profile__stat-label">{{ item.label }}</span>
      </RouterLink>
    </div>

    <a
      v-if="ctaLink"
      class="home-profile__cta"
      :href="ctaLink.url"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ ctaLink.label }}
    </a>
    <RouterLink v-else to="/about" class="home-profile__cta">关于我</RouterLink>

    <div v-if="restSocialLinks.length > 0" class="home-profile__socials">
      <SocialLinks :links="visibleSocials" />
      <RouterLink
        v-if="hiddenSocialCount > 0"
        to="/about"
        class="home-profile__social-more"
        :title="`还有 ${hiddenSocialCount} 个链接`"
      >
        +{{ hiddenSocialCount }}
      </RouterLink>
    </div>
  </section>
</template>
