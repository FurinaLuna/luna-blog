<script setup lang="ts">
import { computed, onMounted, ref, watchEffect } from 'vue'
import { MdPreview } from 'md-editor-v3'
import { ChatDotRound, Collection, Document, Picture, PriceTag, View } from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SocialLinks from '@/components/common/SocialLinks.vue'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import { formatCompact } from '@/utils/format'
import { setPageMeta } from '@/utils/seo'

const site = useSiteStore()
const theme = useThemeStore()

const mdTheme = computed<'light' | 'dark'>(() => (theme.isDark ? 'dark' : 'light'))
const avatarFailed = ref(false)

const avatarUrl = computed(() => site.avatar || '')
const displayName = computed(() => site.author || site.siteName || 'Luna')
const avatarInitial = computed(() => displayName.value.trim().charAt(0).toUpperCase())

const aboutContent = computed(() => site.config?.about?.trim() ?? '')

/** 关于页结构化数据：ProfilePage + Person，便于搜索引擎理解「谁在写」 */
watchEffect(() => {
  const origin = window.location.origin
  const avatar = site.avatar ? new URL(site.avatar, origin).href : ''
  const summary = aboutContent.value
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150)
  const sameAs = (site.resolvedSocialLinks ?? [])
    .map((link) => link.url)
    .filter((url): url is string => Boolean(url) && /^https?:/i.test(url))

  setPageMeta({
    title: '关于',
    description: summary || site.siteDescription,
    keywords: `${site.author},关于本站,站长介绍,联系方式`,
    image: avatar || undefined,
    url: `${origin}/about`,
    author: site.author,
    jsonLd: [
      {
        '@type': 'ProfilePage',
        mainEntity: {
          '@type': 'Person',
          name: site.author,
          url: `${origin}/about`,
          description: summary || site.siteDescription,
          ...(avatar ? { image: avatar } : {}),
          ...(sameAs.length > 0 ? { sameAs } : {}),
        },
      },
    ],
  })
})

const statItems = computed(() => {
  const stats = site.stats
  if (!stats) return []
  return [
    { label: '文章', value: formatCompact(stats.article), icon: Document },
    { label: '分类', value: String(stats.category), icon: Collection },
    { label: '标签', value: String(stats.tag), icon: PriceTag },
    { label: '评论', value: formatCompact(stats.comment), icon: ChatDotRound },
    { label: '说说', value: String(stats.talk), icon: ChatDotRound },
    { label: '照片', value: String(stats.photo), icon: Picture },
    { label: '累计阅读', value: formatCompact(stats.views), icon: View },
  ]
})

onMounted(() => {
  if (!site.config) void site.ensureLoaded()
})
</script>

<template>
  <div>
    <PageHeader title="关于" :subtitle="site.siteDescription" tall />

    <div class="center_box about-wrap">
      <div class="card about-card">
        <div class="about-hero">
          <div class="about-avatar">
            <img
              v-if="avatarUrl && !avatarFailed"
              :src="avatarUrl"
              :alt="`${displayName} 的头像`"
              loading="lazy"
              @error="avatarFailed = true"
            />
            <span v-else aria-hidden="true">{{ avatarInitial }}</span>
          </div>

          <h1 class="about-name">{{ displayName }}</h1>

          <div v-if="site.resolvedSocialLinks.length > 0" class="about-icons">
            <SocialLinks :links="site.resolvedSocialLinks" />
          </div>

          <div v-if="statItems.length > 0" class="about-stats">
            <div v-for="item in statItems" :key="item.label" class="about-stat">
              <span class="about-stat__value">{{ item.value }}</span>
              <span class="about-stat__label">{{ item.label }}</span>
            </div>
          </div>
        </div>

        <div v-if="aboutContent" class="about-body md-content">
          <MdPreview
            id="about-preview"
            :model-value="aboutContent"
            :theme="mdTheme"
            preview-theme="github"
            code-theme="atom"
            :code-foldable="false"
          />
        </div>

        <EmptyState
          v-else
          icon="inbox"
          title="还在写自我介绍"
          description="可以先去读几篇文章，或者到留言板打个招呼。"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-wrap {
  padding-top: 0;
}

.about-card {
  max-width: 860px;
  margin: -6.2rem auto 0;
  padding: 0 2rem 2rem;
  /* 不要 overflow:hidden——头像要靠负 margin 挂在卡片上边、并探进 banner */
}

.about-hero {
  padding-top: 0;
  text-align: center;
}

.about-avatar {
  display: grid;
  place-items: center;
  width: 8.5rem;
  height: 8.5rem;
  position: relative;
  top: -4.25rem;
  margin: 0 auto -4.25rem;
  overflow: hidden;
  border: 4px solid var(--card-bg, #fff);
  border-radius: 50%;
  background: var(--button-linear-gradient);
  color: #fff;
  font-size: 2.6rem;
  font-weight: 700;
  box-shadow: 0 6px 18px rgba(0, 20, 40, 0.16);
}

.about-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.about-name {
  margin-top: 0.9rem;
  color: var(--font-color);
  font-size: 1.7rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.about-icons {
  display: flex;
  justify-content: center;
  margin-top: 0.75rem;
}

.about-stats {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem 1.8rem;
  margin-top: 1.1rem;
  padding-bottom: 1.4rem;
  border-bottom: 1px solid var(--border);
}

.about-stat {
  display: flex;
  align-items: baseline;
  gap: 0.35rem;
}

.about-stat__value {
  color: var(--font-color);
  font-size: 1.05rem;
  font-weight: 600;
}

.about-stat__label {
  color: var(--meta-color);
  font-size: 0.78rem;
}

.about-body {
  padding-top: 1.4rem;
}

@media (max-width: 768px) {
  .about-card {
    margin-top: -4.2rem;
    padding: 0 1.1rem 1.4rem;
  }

  .about-avatar {
    width: 6.6rem;
    height: 6.6rem;
    top: -3.3rem;
    margin: 0 auto -3.3rem;
    font-size: 2rem;
  }

  .about-name {
    font-size: 1.35rem;
  }

  .about-stats {
    gap: 0.35rem 1rem;
  }
}
</style>
