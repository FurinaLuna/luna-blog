import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    /** 浏览器标题 */
    title?: string
    /** 公开页面，无需登录 */
    public?: boolean
    /** 侧栏分组名，用于面包屑 */
    group?: string
    /** 菜单高亮用的路由名 */
    activeMenu?: string
  }
}
