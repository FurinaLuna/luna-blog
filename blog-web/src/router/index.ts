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
    /** 页面关键词（逗号分隔）；缺省用站点关键词 */
    keywords?: string
    /** og:type：文章详情在页面内改写为 article，其余缺省 website */
    type?: string
    /** 404 等页面不做索引 */
    noindex?: boolean
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/home/HomePage.vue'),
    meta: { title: '', keywords: '个人博客,前端开发,技术随笔,数字花园' },
  },
  {
    path: '/article/:id(\\d+)',
    name: 'article',
    component: () => import('@/views/article/ArticlePage.vue'),
    meta: { title: '文章', type: 'article' },
  },
  {
    path: '/categories',
    name: 'categories',
    component: () => import('@/views/category/CategoriesPage.vue'),
    meta: {
      title: '分类',
      description: '按分类浏览站内全部文章，快速找到感兴趣的技术与生活主题。',
      keywords: '文章分类,技术分类,博客目录',
    },
  },
  {
    path: '/category/:id(\\d+)',
    name: 'category',
    component: () => import('@/views/category/CategoryPage.vue'),
    meta: { title: '分类', keywords: '文章分类,分类文章列表' },
  },
  {
    path: '/tag/:id(\\d+)',
    name: 'tag',
    component: () => import('@/views/tag/TagPage.vue'),
    meta: { title: '标签', keywords: '文章标签,标签文章列表' },
  },
  {
    path: '/tags',
    name: 'tags',
    component: () => import('@/views/tag/TagsPage.vue'),
    meta: {
      title: '标签',
      description: '按标签浏览站内全部文章，覆盖前端、后端、算法与生活随记。',
      keywords: '文章标签,标签云,技术标签',
    },
  },
  {
    path: '/archives',
    name: 'archives',
    component: () => import('@/views/archive/ArchivesPage.vue'),
    meta: {
      title: '时间轴',
      description: '按时间顺序浏览站内全部文章，回看每一篇文章的记录轨迹。',
      keywords: '文章归档,时间轴,博客历史',
    },
  },
  {
    path: '/search',
    name: 'search',
    component: () => import('@/views/search/SearchPage.vue'),
    meta: {
      title: '搜索',
      description: '搜索站内的文章与内容，输入关键词即可查找标题与摘要。',
      keywords: '站内搜索,文章搜索',
    },
  },
  {
    path: '/talks',
    name: 'talks',
    component: () => import('@/views/talk/TalkPage.vue'),
    meta: {
      title: '说说',
      description: '记录日常的碎片想法，比长文轻一点的生活随笔。',
      keywords: '说说,随笔,日常记录',
    },
  },
  {
    path: '/albums',
    name: 'albums',
    component: () => import('@/views/album/AlbumListPage.vue'),
    meta: {
      title: '相册',
      description: '用相册留住生活里的光，记录旅行、日常与喜欢的瞬间。',
      keywords: '相册,摄影,生活记录',
    },
  },
  {
    path: '/albums/:id(\\d+)',
    name: 'album-detail',
    component: () => import('@/views/album/AlbumDetailPage.vue'),
    meta: { title: '相册', keywords: '相册,照片,摄影' },
  },
  {
    path: '/message',
    name: 'message',
    component: () => import('@/views/message/MessagePage.vue'),
    meta: {
      title: '留言',
      description: '留下你想说的话，可以聊技术，也可以只是打个招呼。',
      keywords: '留言板,访客留言',
    },
  },
  {
    path: '/resources',
    name: 'resources',
    component: () => import('@/views/resource/ResourcePage.vue'),
    meta: {
      title: '资源',
      description: '收藏的实用资源与工具，覆盖前端、后端与效率工具。',
      keywords: '资源导航,工具推荐,开发工具',
    },
  },
  {
    path: '/friends',
    name: 'friends',
    component: () => import('@/views/friend/FriendPage.vue'),
    meta: {
      title: '友链',
      description: '本站的朋友们，以及交换友链的方式与要求。',
      keywords: '友情链接,友链交换,独立博客',
    },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/about/AboutPage.vue'),
    meta: {
      title: '关于',
      description: '关于本站与站长：这里记录代码、阅读与生活，也欢迎交流合作。',
      keywords: '关于本站,站长介绍,联系方式',
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/error/NotFoundPage.vue'),
    meta: { title: '页面不存在', description: '页面不存在或已被移动。', noindex: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior: (_to, _from, savedPosition) => savedPosition ?? { top: 0 },
})

router.afterEach((to) => {
  /** 先落路由级兜底 title / description / keywords / robots；页面拿到真实数据后会再调 setPageMeta 覆盖 */
  setPageMeta({
    title: to.meta.title,
    description: to.meta.description,
    keywords: to.meta.keywords,
    type: to.meta.type,
    noindex: to.meta.noindex,
  })

  /** 每次前台路由切换上报一次浏览，用于统计总访问量 / 总访客数（失败静默） */
  void recordVisit(to.fullPath)
    .then((report) => {
      /** 接口顺带回最新统计，直接写回 store，页脚立刻能看到自己这次访问 */
      if (report?.visit) useSiteStore().setVisitStats(report.visit)
    })
    .catch(() => undefined)
})

export default router
