<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { MdPreview } from 'md-editor-v3'
import {
  ChatDotRound,
  Collection,
  Document,
  Picture,
  PriceTag,
  View,
} from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SocialLinks from '@/components/common/SocialLinks.vue'
import { useSiteStore } from '@/stores/site'
import { useThemeStore } from '@/stores/theme'
import { formatCompact, formatCopyrightYear } from '@/utils/format'

const site = useSiteStore()
const theme = useThemeStore()

const mdTheme = computed<'light' | 'dark'>(() => (theme.isDark ? 'dark' : 'light'))
const avatarFailed = ref(false)

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
    { label: '留言', value: String(stats.message), icon: ChatDotRound },
    { label: '累计阅读', value: formatCompact(stats.views), icon: View },
    { label: '总字数', value: formatCompact(stats.words), icon: Document },
  ]
})

const aboutContent = computed(() => site.config?.about?.trim() ?? '')

onMounted(() => {
  if (!site.config) void site.ensureLoaded()
})
</script>

<template>
  <div>
    <PageHeader title="关于" :subtitle="site.siteDescription" />

    <div class="center_box">
      <div class="about-layout">
        <div class="about-main">
          <div v-if="aboutContent" class="card about-card">
            <MdPreview
              id="about-preview"
              :model-value="aboutContent"
              :theme="mdTheme"
              preview-theme="github"
              code-theme="atom"
            />
          </div>

          <EmptyState
            v-else
            icon="inbox"
            title="还在写自我介绍"
            description="可以先看看侧边的站点信息，或者去读几篇文章。"
          />
        </div>

        <aside class="about-side">
          <div class="card about-profile">
            <div class="about-profile__avatar">
              <img
                v-if="site.avatar && !avatarFailed"
                :src="site.avatar"
                :alt="`${site.author} 的头像`"
                loading="lazy"
                @error="avatarFailed = true"
              />
              <span v-else aria-hidden="true">{{ site.author.charAt(0) }}</span>
            </div>

            <h2 class="about-profile__name">{{ site.author }}</h2>
            <p class="about-profile__desc">{{ site.siteDescription }}</p>

            <div class="about-profile__social">
              <SocialLinks :links="site.resolvedSocialLinks" />
            </div>

            <ul class="about-meta">
              <li v-if="site.config?.siteKeywords">
                <span>关键词</span>
                <strong>{{ site.config.siteKeywords }}</strong>
              </li>
              <li v-if="site.config?.startDate">
                <span>记录始于</span>
                <strong>{{ formatCopyrightYear(site.config.startDate) }}</strong>
              </li>
              <li v-if="site.config?.email">
                <span>邮箱</span>
                <strong><a :href="`mailto:${site.config.email}`">{{ site.config.email }}</a></strong>
              </li>
            </ul>
          </div>

          <div v-if="statItems.length > 0" class="card about-stats">
            <h2 class="about-stats__title">站点统计</h2>
            <div class="about-stats__grid">
              <div v-for="item in statItems" :key="item.label" class="about-stats__item">
                <p class="stat-num">{{ item.value }}</p>
                <p class="about-stats__label">{{ item.label }}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1.2rem;
  align-items: start;
}

@media (min-width: 992px) {
  .about-layout {
    grid-template-columns: minmax(0, 1fr) 300px;
  }
}

.about-main {
  min-width: 0;
}

.about-side {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.about-profile {
  padding: 1.6rem 1.4rem;
  text-align: center;
}

.about-profile__avatar {
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 50%;
  background: var(--button-linear-gradient);
  color: #fff;
  font-size: 1.9rem;
  font-weight: 700;
}

.about-profile__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.about-profile__name {
  margin-top: 0.8rem;
  color: var(--font-color);
  font-size: 1.15rem;
  font-weight: 600;
}

.about-profile__desc {
  margin-top: 0.35rem;
  color: var(--meta-color);
  font-size: 0.86rem;
  line-height: 1.7;
}

.about-profile__social {
  display: flex;
  justify-content: center;
  margin-top: 0.8rem;
}

.about-meta {
  margin-top: 1rem;
  padding-top: 0.8rem;
  border-top: 1px solid var(--border);
  font-size: 0.82rem;
  text-align: left;
}

.about-meta li {
  display: flex;
  gap: 0.6rem;
  padding: 0.22rem 0;
}

.about-meta span {
  flex: 0 0 4.4rem;
  color: var(--meta-color);
}

.about-meta strong {
  min-width: 0;
  color: var(--second-font-color);
  font-weight: 500;
  word-break: break-word;
}

.about-stats {
  padding: 1.2rem 1.2rem 1.4rem;
}

.about-stats__title {
  color: var(--font-color);
  font-size: 0.95rem;
  font-weight: 600;
}

.about-stats__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.4rem;
  margin-top: 0.8rem;
}

.about-stats__item {
  padding: 0.5rem 0.2rem;
  border-radius: 6px;
  background: var(--bg-soft);
  text-align: center;
}

.about-stats__label {
  margin-top: 0.15rem;
  color: var(--meta-color);
  font-size: 0.72rem;
}
</style>
