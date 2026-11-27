// ci: 验证 GitHub Actions 自动发布（push blog-web/** 即上线）
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { PiniaColada } from '@pinia/colada'
import ElementPlus from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import 'md-editor-v3/lib/style.css'
import './styles/index.css'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PiniaColada)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
