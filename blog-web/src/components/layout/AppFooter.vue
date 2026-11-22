<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useSiteStore } from '@/stores/site'
import { formatCopyrightYear } from '@/utils/format'

const site = useSiteStore()

const year = computed(() => formatCopyrightYear(site.config?.startDate))
const footerText = computed(() => site.config?.footerText || '')
const icp = computed(() => site.config?.icp || '')
const author = computed(() => site.author)

/** 运行时长走秒：每秒重算一次，卸载时清掉定时器 */
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  timer = null
})

const startedAt = computed(() => {
  const raw = site.config?.startDate
  if (!raw) return null
  const time = new Date(raw).getTime()
  return Number.isFinite(time) ? time : null
})

/** 距站点开始运行已经历的时间，精确到秒 */
const elapsed = computed(() => {
  if (startedAt.value === null) return null
  const total = Math.max(0, Math.floor((now.value - startedAt.value) / 1000))
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  }
})

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

const pv = computed(() => site.stats?.visit?.pv ?? 0)
const uv = computed(() => site.stats?.visit?.uv ?? 0)

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
    <p class="footer_line footer_heart">
      <el-icon class="footer_heart-icon" :size="14"><svg viewBox="0 0 1024 1024" aria-hidden="true">
        <path
          fill="currentColor"
          d="M512 891.7 138.5 528.3C39.6 432.2 46.7 269.5 154 183c93-75 232.6-60.7 306.6 33.5L512 283.9l51.4-67.4c74-94.2 213.6-108.5 306.6-33.5 107.3 86.5 114.4 249.2 15.5 345.3L512 891.7z"
        />
      </svg></el-icon>
      <span>{{ author }}</span>
    </p>

    <p v-if="elapsed" class="footer_line footer_timer">
      {{ site.siteName }} 自从搭建已经历
      <strong>{{ elapsed.days }}</strong> 天
      <strong>{{ pad(elapsed.hours) }}</strong> 小时
      <strong>{{ pad(elapsed.minutes) }}</strong> 分
      <strong>{{ pad(elapsed.seconds) }}</strong> 秒
    </p>

    <p class="footer_line footer_visit">
      总访问量 <strong>{{ pv }}</strong> 次
      <span class="footer_visit-sep">·</span>
      总访客数 <strong>{{ uv }}</strong> 人
    </p>

    <p class="footer_line footer_copyright">
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 1.6rem 10px 1.8rem;
  text-align: center;
  color: var(--text);
  font-size: 1rem;
  line-height: 1.75;
}

.footer_line {
  margin: 0;
}

.footer_heart {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  color: var(--text);
}

.footer_heart-icon {
  color: #f56c6c;
}

.footer_timer strong {
  margin: 0 0.1rem;
  color: var(--primary);
  font-weight: 600;
}

.footer_visit {
  color: var(--text-2, var(--text));
}

.footer_visit strong {
  margin: 0 0.15rem;
  color: var(--primary);
  font-weight: 600;
}

.footer_visit-sep {
  margin: 0 0.5rem;
  opacity: 0.5;
}

.footer_copyright {
  margin-top: 0.35rem;
  font-size: 0.9rem;
  opacity: 0.85;
}

.footer_link {
  font-size: 0.9rem;
  opacity: 0.85;
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
  margin-top: 0.5rem;
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
    padding: 1.2rem 10px 1.4rem;
    font-size: 0.85rem;
  }

  .footer_timer {
    padding: 0 0.6rem;
  }
}
</style>
