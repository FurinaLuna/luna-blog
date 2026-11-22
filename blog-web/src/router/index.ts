import { createRouter, createWebHistory } from 'vue-router'
import { recordVisit } from '@/api/site'
import { useSiteStore } from '@/stores/site'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/HomePage.vue'),
  },
  {
    path: '/article/:id(\\d+)',
    name: 'article',
    component: () => import('@/views/article/ArticlePage.vue'),
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('@/views/category/CategoriesPage.vue'),
  },
  {
    path: '/category/:id(\\d+)',
    name: 'category',
    component: () => import('@/views/category/CategoryPage.vue'),
  },
  {
    path: '/tag/:id(\\d+)',
    name: 'tag',
    component: () => import('@/views/tag/TagPage.vue'),
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/tag/TagsPage.vue'),
  },
  {
    path: '/archives',
    name: 'archives',
    component: () => import('@/views/archive/ArchivesPage.vue'),
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/search/SearchPage.vue'),
  },
  {
    path: '/talks',
    name: 'talks',
    component: () => import('@/views/talk/TalkPage.vue'),
  },
  {
    path: '/albums',
    name: 'albums',
    component: () => import('@/views/album/AlbumListPage.vue'),
  },
  {
    path: '/albums/:id(\\d+)',
    name: 'album-detail',
    component: () => import('@/views/album/AlbumDetailPage.vue'),
  },
  {
    path: '/message',
    name: 'message',
    component: () => import('@/views/message/MessagePage.vue'),
  },
  {
    path: '/resources',
    name: 'resources',
    component: () => import('@/views/resource/ResourcePage.vue'),
  },
  {
    path: '/friends',
    name: 'friends',
    component: () => import('@/views/friend/FriendPage.vue'),
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/about/AboutPage.vue'),
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/error/NotFoundPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
})

/** 每次前台路由切换上报一次浏览，用于统计总访问量 / 总访客数（失败静默） */
router.afterEach((to) => {
  void recordVisit(to.fullPath)
    .then((report) => {
      /** 接口顺带回最新统计，直接写回 store，页脚立刻能看到自己这次访问 */
      if (report?.visit) useSiteStore().setVisitStats(report.visit)
    })
    .catch(() => undefined)
})

export default router
