import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
// md-editor-v3 的样式表带 @charset，放进 CSS 层会被构建器判为非法 at-rule，故保持顶层导入；
// styles/index.css 里的编辑器覆盖写在所有层之外，仍然生效。
import 'cropperjs/dist/cropper.css'
import 'md-editor-v3/lib/style.css'
import './styles/index.css'
import App from './App.vue'
import router from './router'
import { setHttpHooks } from './api/http'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(ElementPlus, { locale: zhCn })

for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

// 网络层与路由/状态的桥接：401 清理登录态，403 跳强制改密
setHttpHooks({
  onUnauthorized() {
    const auth = useAuthStore()
    auth.logout()
    if (router.currentRoute.value.name !== 'Login') {
      void router.replace({ name: 'Login' })
    }
  },
  onPasswordChangeRequired() {
    if (router.currentRoute.value.name !== 'ChangePassword') {
      void router.replace({ name: 'ChangePassword' })
    }
  },
})

app.mount('#app')
