<script setup lang="ts">
import { computed } from 'vue'
import { useSiteStore } from '@/stores/site'
import { formatCopyrightYear } from '@/utils/format'

const site = useSiteStore()

const year = computed(() => formatCopyrightYear(site.config?.startDate))
const footerText = computed(() => site.config?.footerText || '')
const icp = computed(() => site.config?.icp || '')

const badges = [
  { label: 'Vue 3 · 渐进式框架', color: '#41b883', href: 'https://cn.vuejs.org/' },
  { label: 'Vite · 构建工具', color: '#646cff', href: 'https://cn.vitejs.dev/' },
  { label: 'Koa · Node.js 框架', color: '#33333d', href: 'https://koajs.com/' },
  { label: 'MySQL · 数据库', color: '#00758f', href: 'https://www.mysql.com/' },
  { label: 'Element Plus · 组件库', color: '#409eff', href: 'https://element-plus.org/' },
  { label: 'Tailwind CSS · 样式方案', color: '#38bdf8', href: 'https://tailwindcss.com/' },
]
</script>

<template>
  <footer class="blog-footer">
    <p class="footer_line">
      © {{ year }} {{ site.siteName }}
      <span v-if="footerText"> · {{ footerText }}</span>
    </p>
    <a
      v-if="icp"
      class="footer_line footer_link"
      href="https://beian.miit.gov.cn/"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ icp }}
    </a>
    <div class="footer_badges">
      <a
        v-for="badge in badges"
        :key="badge.label"
        class="footer_badge"
        :style="{ background: badge.color }"
        :href="badge.href"
        target="_blank"
        rel="noopener noreferrer"
      >
        {{ badge.label }}
      </a>
    </div>
  </footer>
</template>

<style scoped>
.blog-footer {
  display: flex;
  width: 100%;
  height: 10rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 1rem 10px;
  text-align: center;
  color: var(--text);
  font-size: 1rem;
  line-height: 1.7;
}

.footer_line {
  margin: 0;
}

.footer_link {
  transition: color 0.3s ease;
}

.footer_link:hover {
  color: var(--primary);
}

.footer_badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 4px;
}

.footer_badge {
  padding: 2px 7px;
  border-radius: 3px;
  color: #fff;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.6;
  letter-spacing: 0.02em;
  transition: opacity 0.25s ease;
}

.footer_badge:hover {
  opacity: 0.85;
}

@media (max-width: 768px) {
  .blog-footer {
    height: 8rem;
    font-size: 0.85rem;
  }
}
</style>
