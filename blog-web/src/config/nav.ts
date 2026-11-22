export interface NavItem {
  label: string
  to: string
}

/** 顶部主导航 */
export const mainNav: NavItem[] = [
  { label: '首页', to: '/' },
  { label: '时间轴', to: '/archives' },
  { label: '分类', to: '/categories' },
  { label: '标签', to: '/tags' },
  { label: '说说', to: '/talks' },
  { label: '相册', to: '/albums' },
  { label: '资源', to: '/resources' },
  { label: '友链', to: '/friends' },
  { label: '留言', to: '/message' },
  { label: '关于', to: '/about' },
]
