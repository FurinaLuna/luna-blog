import type { RouteRecordRaw } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import AdminLayout from '@/layouts/AdminLayout.vue'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { title: '登录', public: true },
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: () => import('@/pages/ChangePasswordPage.vue'),
    meta: { title: '修改密码' },
  },
  {
    path: '/',
    component: AdminLayout,
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
        meta: { title: '仪表盘', group: '内容' },
      },
      {
        path: 'articles',
        name: 'Articles',
        component: () => import('@/pages/ArticlesPage.vue'),
        meta: { title: '文章管理', group: '内容' },
      },
      {
        path: 'articles/create',
        name: 'ArticleCreate',
        component: () => import('@/pages/ArticleEditPage.vue'),
        meta: { title: '写文章', group: '内容', activeMenu: 'Articles' },
      },
      {
        path: 'articles/:id/edit',
        name: 'ArticleEdit',
        component: () => import('@/pages/ArticleEditPage.vue'),
        meta: { title: '编辑文章', group: '内容', activeMenu: 'Articles' },
      },
      {
        path: 'categories',
        name: 'Categories',
        component: () => import('@/pages/CategoriesPage.vue'),
        meta: { title: '分类管理', group: '内容' },
      },
      {
        path: 'tags',
        name: 'Tags',
        component: () => import('@/pages/TagsPage.vue'),
        meta: { title: '标签管理', group: '内容' },
      },
      {
        path: 'talks',
        name: 'Talks',
        component: () => import('@/pages/TalksPage.vue'),
        meta: { title: '说说管理', group: '内容' },
      },
      {
        path: 'albums',
        name: 'Albums',
        component: () => import('@/pages/AlbumsPage.vue'),
        meta: { title: '相册管理', group: '内容' },
      },
      {
        path: 'albums/:id',
        name: 'AlbumDetail',
        component: () => import('@/pages/AlbumDetailPage.vue'),
        meta: { title: '相册详情', group: '内容', activeMenu: 'Albums' },
      },
      {
        path: 'resources',
        name: 'Resources',
        component: () => import('@/pages/ResourcesPage.vue'),
        meta: { title: '资源管理', group: '内容' },
      },
      {
        path: 'comments',
        name: 'Comments',
        component: () => import('@/pages/CommentsPage.vue'),
        meta: { title: '评论管理', group: '互动' },
      },
      {
        path: 'messages',
        name: 'Messages',
        component: () => import('@/pages/MessagesPage.vue'),
        meta: { title: '留言管理', group: '互动' },
      },
      {
        path: 'friend-links',
        name: 'FriendLinks',
        component: () => import('@/pages/FriendLinksPage.vue'),
        meta: { title: '友情链接', group: '互动' },
      },
      {
        path: 'site-config',
        name: 'SiteConfig',
        component: () => import('@/pages/SiteConfigPage.vue'),
        meta: { title: '站点配置', group: '站点' },
      },
      {
        path: 'notifications',
        name: 'Notifications',
        component: () => import('@/pages/NotificationsPage.vue'),
        meta: { title: '通知中心', group: '站点' },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/pages/ProfilePage.vue'),
        meta: { title: '个人中心', group: '账户' },
      },
    ],
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: () => import('@/pages/ForbiddenPage.vue'),
    meta: { title: '无访问权限' },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/pages/NotFoundPage.vue'),
    meta: { title: '页面不存在', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  if (to.meta.public) {
    if (to.name === 'Login' && auth.isAuthenticated) {
      return auth.needPasswordChange ? { name: 'ChangePassword' } : { name: 'Dashboard' }
    }
    return true
  }

  if (!auth.isAuthenticated) {
    return { name: 'Login', query: to.fullPath === '/' ? {} : { redirect: to.fullPath } }
  }

  // 首次登录强制改密：除改密页外一律拦截
  if (auth.needPasswordChange && to.name !== 'ChangePassword') {
    return { name: 'ChangePassword' }
  }

  // 已改密后不应再停留在改密页
  if (!auth.needPasswordChange && to.name === 'ChangePassword') {
    return { name: 'Dashboard' }
  }

  return true
})

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : ''
  document.title = title ? `${title} · Luna Blog 管理后台` : 'Luna Blog 管理后台'
})

export default router
