<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useWindowScroll } from '@vueuse/core'
import { ArrowDown } from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Pagination from '@/components/common/Pagination.vue'
import PrototypeWaves from '@/components/common/PrototypeWaves.vue'
import HomeArticleCard from '@/components/home/HomeArticleCard.vue'
import HomeArticleSkeleton from '@/components/home/HomeArticleSkeleton.vue'
import HomeSidebar from '@/components/home/HomeSidebar.vue'
import { getArticles } from '@/api/article'
import type { Article } from '@/api/types'
import { useSiteStore } from '@/stores/site'

const PAGE_SIZE = 5

const site = useSiteStore()
const { y } = useWindowScroll()

const articles = ref<Article[]>([])
const total = ref(0)
const page = ref(1)
const loading = ref(true)
const failed = ref(false)

const typed = ref('')
const showArrow = computed(() => y.value < 50)

/** 站点配置里给首页配了横幅图就用图片，否则用内置天空 + 云层 */
const heroBanner = computed(() => (site.config?.pageBanners?.home ?? '').trim())
const heroBannerStyle = computed(() =>
  heroBanner.value ? { backgroundImage: `url("${heroBanner.value}")` } : undefined,
)

const phrases = computed<string[]>(() => {
  const list = [site.config?.heroTitle, site.config?.heroSubtitle, site.announcement]
    .map((item) => (item ?? '').trim())
    .filter((item) => item.length > 0)
  return list.length > 0 ? list : ['记录生活与代码的数字花园']
})

let disposed = false
let timer: number | undefined

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    timer = window.setTimeout(resolve, ms)
  })
}

async function runTypewriter(): Promise<void> {
  while (!disposed) {
    for (const phrase of phrases.value) {
      for (let index = 1; index <= phrase.length; index += 1) {
        if (disposed) return
        typed.value = phrase.slice(0, index)
        await sleep(150)
      }
      if (disposed) return
      await sleep(1600)
      for (let index = phrase.length; index >= 0; index -= 1) {
        if (disposed) return
        typed.value = phrase.slice(0, index)
        await sleep(45)
      }
      await sleep(280)
    }
  }
}

async function loadArticles(): Promise<void> {
  loading.value = true
  failed.value = false
  try {
    const result = await getArticles({ page: page.value, pageSize: PAGE_SIZE })
    articles.value = result.list
    total.value = result.total
  } catch {
    articles.value = []
    total.value = 0
    failed.value = true
  } finally {
    loading.value = false
  }
}

function scrollToContent(): void {
  const target = document.getElementById('home-content')
  if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function changePage(next: number): void {
  page.value = next
  void loadArticles().then(() => scrollToContent())
}

onMounted(() => {
  void loadArticles()
  void runTypewriter()
})

onBeforeUnmount(() => {
  disposed = true
  if (timer) window.clearTimeout(timer)
})
</script>

<template>
  <div>
    <section id="home" :class="{ 'home--custom-hero': !!heroBanner }" :style="heroBannerStyle">
      <div v-if="!heroBanner" class="home_sky" aria-hidden="true"></div>
      <div v-if="!heroBanner" class="home_clouds" aria-hidden="true"></div>
      <div v-if="!heroBanner" class="home_clouds home_clouds--far" aria-hidden="true"></div>

      <h1 class="home_font">{{ site.siteName }}</h1>
      <p class="home_typewriter" aria-live="off">
        <span>{{ typed }}</span><span class="home_cursor">|</span>
      </p>

      <button
        v-if="showArrow"
        type="button"
        class="scroll_bottom"
        aria-label="向下浏览文章"
        @click="scrollToContent"
      >
        <el-icon class="scroll_arrow" :size="22"><ArrowDown /></el-icon>
      </button>

      <PrototypeWaves />
    </section>

    <div id="home-content" class="home_center_box">
      <el-row :gutter="20" class="home-row">
        <el-col :xs="24" :sm="18" class="home-main-col">
          <HomeArticleSkeleton v-if="loading" :count="PAGE_SIZE" />

          <EmptyState
            v-else-if="articles.length === 0"
            :title="failed ? '文章加载失败' : '还没有发布文章'"
            :description="failed ? '请稍后刷新重试' : '去后台写点什么吧～'"
            icon="inbox"
          />

          <div v-else class="home-list">
            <HomeArticleCard
              v-for="(article, index) in articles"
              :key="article.id"
              :article="article"
              :index="index"
            />
          </div>

          <Pagination
            v-if="!loading && articles.length > 0"
            class="home-pagination"
            :page="page"
            :total="total"
            :page-size="PAGE_SIZE"
            :pager-count="5"
            @update:page="changePage"
          />
        </el-col>

        <el-col :xs="0" :sm="6" class="home-aside-col">
          <HomeSidebar />
        </el-col>
      </el-row>
    </div>
  </div>
</template>
