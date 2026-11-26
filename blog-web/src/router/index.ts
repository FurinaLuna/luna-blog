import { createRouter, createWebHistory } from 'vue-router'
import { recordVisit } from '@/api/site'
import { useSiteStore } from '@/stores/site'
import { setPageMeta } from '@/utils/seo'
import type { RouteRecordRaw } from 'vue-router'

/** 路由级 SEO 元信息：页面拿到真实数据后（文章标题 / 分类名等）可再调用 setPageMeta 覆盖 */
declare module 'vue-router' {
  interface RouteMeta {
    /** 页面标题（不含站点名）；首页为空串，表示只用站点名 */
    title: string
    /** 页面描述；缺省用站点描述 */
    description?: string
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/HomePage.vue'),
    meta: { title: '' },
  },
  {
    path: '/article/:id(\\d+)',
    name: 'article',
    component: () => import('@/views/article/ArticlePage.vue'),
    meta: { title: '文章' },
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('@/views/category/CategoriesPage.vue'),
    meta: { title: '分类', description: '按分类浏览站内全部文章。' },
  },
  {
    path: '/category/:id(\\d+)',
    name: 'category',
    component: () => import('@/views/category/CategoryPage.vue'),
    meta: { title: '分类' },
  },
  {
    path: '/tag/:id(\\d+)',
    name: 'tag',
    component: () => import('@/views/tag/TagPage.vue'),
    meta: { title: '标签' },
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/tag/TagsPage.vue'),
    meta: { title: '标签', description: '按标签浏览站内全部文章。' },
  },
  {
    path: '/archives',
    name: 'archives',
    component: () => import('@/views/archive/ArchivesPage.vue'),
    meta: { title: '时间轴', description: '按时间顺序浏览站内全部文章。' },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/search/SearchPage.vue'),
    meta: { title: '搜索', description: '搜索站内的文章与内容。' },
  },
  {
    path: '/talks',
    name: 'talks',
    component: () => import('@/views/talk/TalkPage.vue'),
    meta: { title: '说说', description: '记录日常的碎片想法。' },
  },
  {
    path: '/albums',
    name: 'albums',
    component: () => import('@/views/album/AlbumListPage.vue'),
    meta: { title: '相册', description: '用相册留住生活里的光。' },
  },
  {
    path: '/albums/:id(\\d+)',
    name: 'album-detail',
    component: () => import('@/views/album/AlbumDetailPage.vue'),
    meta: { title: '相册' },
  },
  {
    path: '/message',
    name: 'message',
    component: () => import('@/views/message/MessagePage.vue'),
    meta: { title: '留言', description: '留下你想说的话。' },
  },
  {
    path: '/resources',
    name: 'resources',
    component: () => import('@/views/resource/ResourcePage.vue'),
    meta: { title: '资源', description: '收藏的实用资源与工具。' },
  },
  {
    path: '/friends',
    name: 'friends',
    component: () => import('@/views/friend/FriendPage.vue'),
    meta: { title: '友链', description: '本站的朋友们。' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/about/AboutPage.vue'),
    meta: { title: '关于', description: '关于本站与站长。' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/error/NotFoundPage.vue'),
    meta: { title: '页面不存在', description: '页面不存在或已被移动。' },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
})

router.afterEach((to) => {
  /** 先落路由级兜底 title / description；页面拿到真实数据后会再调 setPageMeta 覆盖 */
  setPageMeta({ title: to.meta.title, description: to.meta.description })

  /** 每次前台路由切换上报一次浏览，用于统计总访问量 / 总访客数（失败静默） */
  void recordVisit(to.fullPath)
    .then((report) => {
      /** 接口顺带回最新统计，直接写回 store，页脚立刻能看到自己这次访问 */
      if (report?.visit) useSiteStore().setVisitStats(report.visit)
    })
    .catch(() => undefined)
})

export default router
