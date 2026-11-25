<script setup lang="ts">
import { computed } from 'vue'
import { DataAnalysis, PriceTag } from '@element-plus/icons-vue'
import HomeProfileCard from './HomeProfileCard.vue'
import HomeRecommendCard from './HomeRecommendCard.vue'
import { useSiteStore } from '@/stores/site'
import { daysSince, formatCount } from '@/utils/format'

const site = useSiteStore()
void site.ensureLoaded()

const tags = computed(() => site.tags)

/** 按标签 id 取模取色板，保证同一标签颜色稳定 */
function tagTone(id: number): string {
  return `home-tag--${((id % 6) + 6) % 6}`
}

const infoRows = computed(() => [
  { key: 'article', label: '文章数', value: formatCount(site.stats?.article ?? 0) },
  { key: 'days', label: '运行天数', value: `${daysSince(site.config?.startDate)} 天` },
  { key: 'pv', label: '总访问量', value: formatCount(site.stats?.visit?.pv ?? 0) },
  { key: 'uv', label: '总访客数', value: formatCount(site.stats?.visit?.uv ?? 0) },
])
</script>

<template>
  <aside class="home-side">
    <HomeProfileCard />

    <HomeRecommendCard />

    <section v-if="tags.length > 0" class="card side-card home-side-card">
      <div class="card-title">
        <el-icon :size="16"><PriceTag /></el-icon>
        <span>标签云</span>
      </div>
      <div class="home-tags">
        <RouterLink
          v-for="tag in tags"
          :key="tag.id"
          :to="`/tag/${tag.id}`"
          class="home-tag"
          :class="tagTone(tag.id)"
        >
          {{ tag.name }}
        </RouterLink>
      </div>
    </section>

    <section class="card side-card home-side-card">
      <div class="card-title">
        <el-icon :size="16"><DataAnalysis /></el-icon>
        <span>网站资讯</span>
      </div>
      <div class="home-info">
        <div v-for="row in infoRows" :key="row.key" class="home-info__row">
          <span>{{ row.label }}</span>
          <span class="home-info__value">{{ row.value }}</span>
        </div>
      </div>
    </section>
  </aside>
</template>
