<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, Moon, Sunny, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ApiError } from '@/api/http'
import { getSiteConfig } from '@/api/siteConfig'
import type { SiteConfig } from '@/api/types'
import bgImage from '@/assets/login/bg.png'
import avatarImage from '@/assets/login/avatar.svg'

const USERNAME_KEY = 'luna-admin-remember-username'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

interface LoginForm {
  username: string
  password: string
  remember: boolean
}

const storedUsername = localStorage.getItem(USERNAME_KEY) ?? ''

const form = reactive<LoginForm>({
  username: storedUsername,
  password: '',
  remember: storedUsername !== '',
})

const rules: FormRules<LoginForm> = {
  username: [{ required: true, message: '请输入账号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

/** 后台登录页可配置的站点信息（背景图、站名），加载失败就退回内置资源 */
const siteConfig = ref<Partial<SiteConfig> | null>(null)

const brandName = computed(() => (siteConfig.value?.siteName ?? '').trim() || 'Luna Blog')
const loginBg = computed(() => (siteConfig.value?.adminLoginBg ?? '').trim() || bgImage)
const avatarSrc = computed(() => (siteConfig.value?.avatar ?? '').trim() || avatarImage)
const year = new Date().getFullYear()

const formRef = ref<FormInstance>()
const submitting = ref(false)
const errorText = ref('')

const redirect = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : '/dashboard'
})

onMounted(() => {
  getSiteConfig()
    .then((data) => {
      siteConfig.value = data
    })
    .catch(() => {
      // 静默失败：登录页用内置背景与默认站名即可
    })

  if (auth.isAuthenticated) {
    void router.replace(auth.needPasswordChange ? { name: 'ChangePassword' } : redirect.value)
  }
})

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  errorText.value = ''
  try {
    const user = await auth.login({ username: form.username.trim(), password: form.password })
    if (form.remember) {
      localStorage.setItem(USERNAME_KEY, form.username.trim())
    } else {
      localStorage.removeItem(USERNAME_KEY)
    }
    ElMessage.success(`欢迎回来，${user.nickname || user.username}`)
    await router.replace(user.needPasswordChange ? { name: 'ChangePassword' } : redirect.value)
  } catch (error) {
    errorText.value = error instanceof ApiError ? error.message : '登录失败，请稍后重试'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <img class="login-page__bg" :src="loginBg" alt="" aria-hidden="true" />
    <div class="login-page__scrim" aria-hidden="true"></div>
    <div class="login-page__glow login-page__glow--a" aria-hidden="true"></div>
    <div class="login-page__glow login-page__glow--b" aria-hidden="true"></div>

    <main class="login-card">
      <header class="login-card__head">
        <span class="login-card__avatar-ring">
          <img class="login-card__avatar" :src="avatarSrc" :alt="brandName" />
        </span>
        <h1 class="login-card__brand">{{ brandName }}</h1>
        <p class="login-card__sub">内容管理后台</p>
      </header>

      <el-alert
        v-if="errorText"
        :title="errorText"
        type="error"
        show-icon
        :closable="false"
        class="login-card__alert"
      />

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        class="login-form"
        @submit.prevent="handleSubmit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入账号"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>
        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <div class="login-form__options">
          <el-checkbox v-model="form.remember" label="记住账号" />
          <span class="login-form__hint">首次登录需修改初始密码</span>
        </div>

        <el-button
          type="primary"
          size="large"
          class="login-form__submit"
          :loading="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '正在登录' : '登 录' }}
        </el-button>
      </el-form>

      <footer class="login-card__foot">
        <span>仅限站点管理员使用</span>
        <span class="login-card__dot" aria-hidden="true"></span>
        <span>请勿在公共设备保存账号</span>
      </footer>
    </main>

    <p class="login-copyright">© {{ year }} {{ brandName }}</p>

    <button
      type="button"
      class="login-theme"
      :aria-label="theme.isDark ? '切换亮色' : '切换深色'"
      @click="theme.toggle()"
    >
      <el-icon :size="18"><Sunny v-if="theme.isDark" /><Moon v-else /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 100vh;
  padding: 40px 20px;
  overflow: hidden;
  isolation: isolate;
}

/* 背景图与遮罩 */
.login-page__bg {
  position: fixed;
  inset: 0;
  z-index: -2;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scale(1.06);
  filter: saturate(1.02) blur(2px);
}

.login-page__scrim {
  position: fixed;
  inset: 0;
  z-index: -1;
  background:
    radial-gradient(120% 80% at 22% 0%, rgb(10 18 28 / 62%), transparent 62%),
    radial-gradient(90% 90% at 50% 50%, transparent 30%, rgb(6 10 16 / 55%) 100%),
    linear-gradient(160deg, rgb(6 11 18 / 88%) 0%, rgb(6 11 18 / 72%) 45%, rgb(6 11 18 / 88%) 100%);
  transition: background 0.35s ease;
}

/* 光斑装饰 */
.login-page__glow {
  position: fixed;
  z-index: -1;
  width: 420px;
  height: 420px;
  pointer-events: none;
  background: radial-gradient(circle, rgb(64 158 255 / 28%), transparent 65%);
  border-radius: 50%;
  filter: blur(40px);
}

.login-page__glow--a {
  top: -120px;
  right: -80px;
}

.login-page__glow--b {
  bottom: -160px;
  left: -120px;
  background: radial-gradient(circle, rgb(103 194 58 / 18%), transparent 65%);
}

/* 登录卡片 */
.login-card {
  position: relative;
  width: 100%;
  max-width: 420px;
  padding: 40px 36px 28px;
  background: color-mix(in srgb, var(--card) 88%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 70%, transparent);
  border-radius: 18px;
  box-shadow:
    0 24px 60px rgb(0 0 0 / 28%),
    0 2px 8px rgb(0 0 0 / 12%);
  backdrop-filter: blur(20px) saturate(140%);
  animation: login-rise 0.5s cubic-bezier(0.22, 0.68, 0.36, 1) both;
}

@keyframes login-rise {
  from {
    opacity: 0;
    transform: translateY(16px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.login-card__head {
  margin-bottom: 26px;
  text-align: center;
}

.login-card__avatar-ring {
  display: inline-grid;
  padding: 4px;
  margin-bottom: 14px;
  background: color-mix(in srgb, var(--card) 60%, transparent);
  border: 1px solid color-mix(in srgb, var(--border) 80%, transparent);
  border-radius: 18px;
  box-shadow: 0 8px 22px rgb(0 0 0 / 18%);
  place-items: center;
}

.login-card__avatar {
  display: block;
  width: 56px;
  height: 56px;
  border-radius: 14px;
  object-fit: cover;
}

.login-card__brand {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--text-1);
}

.login-card__sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-3);
  letter-spacing: 0.08em;
}

.login-card__alert {
  margin-bottom: 16px;
  border-radius: 10px;
}

/* 表单 */
.login-form :deep(.el-form-item) {
  margin-bottom: 18px;
}

.login-form :deep(.el-input__wrapper) {
  padding: 4px 14px;
  background: color-mix(in srgb, var(--card) 72%, transparent);
  border-radius: 10px;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--border) 90%, transparent) inset;
  transition:
    box-shadow 0.2s ease,
    background 0.2s ease;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.login-form :deep(.el-input__wrapper.is-focus) {
  background: var(--card);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

.login-form :deep(.el-input__inner) {
  height: 40px;
  font-size: 14px;
}

.login-form__options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 2px 0 20px;
}

.login-form__hint {
  font-size: 12px;
  color: var(--text-3);
}

.login-form__submit {
  width: 100%;
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0.16em;
  border: none;
  border-radius: 12px;
  background-image: linear-gradient(135deg, var(--el-color-primary) 0%, #79bbff 100%);
  box-shadow: 0 10px 22px rgb(64 158 255 / 32%);
  transition:
    transform 0.15s ease,
    box-shadow 0.2s ease,
    filter 0.2s ease;
}

.login-form__submit:hover {
  filter: brightness(1.05);
  box-shadow: 0 12px 26px rgb(64 158 255 / 40%);
  transform: translateY(-1px);
}

.login-form__submit:active {
  transform: translateY(0);
}

/* 页脚 */
.login-card__foot {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding-top: 18px;
  margin-top: 22px;
  font-size: 11px;
  color: var(--text-3);
  border-top: 1px solid color-mix(in srgb, var(--border) 60%, transparent);
}

.login-card__dot {
  width: 3px;
  height: 3px;
  background: currentcolor;
  border-radius: 50%;
  opacity: 0.6;
}

.login-copyright {
  position: relative;
  margin: 22px 0 0;
  font-size: 12px;
  color: rgb(255 255 255 / 62%);
  text-shadow: 0 1px 2px rgb(0 0 0 / 40%);
}

/* 主题切换 */
.login-theme {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 3;
  display: grid;
  width: 38px;
  height: 38px;
  color: rgb(255 255 255 / 88%);
  cursor: pointer;
  background: rgb(255 255 255 / 12%);
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 50%;
  backdrop-filter: blur(10px);
  transition:
    background 0.2s ease,
    color 0.2s ease,
    transform 0.2s ease;
  place-items: center;
}

.login-theme:hover {
  color: #fff;
  background: rgb(255 255 255 / 22%);
  transform: translateY(-1px);
}

/* 浅色主题：背景压亮一点，卡片自然浮起 */
html:not(.dark) .login-page__scrim {
  background:
    radial-gradient(120% 80% at 22% 0%, rgb(255 255 255 / 34%), transparent 62%),
    radial-gradient(90% 90% at 50% 50%, transparent 34%, rgb(12 20 30 / 30%) 100%),
    linear-gradient(160deg, rgb(14 24 36 / 62%) 0%, rgb(14 24 36 / 34%) 45%, rgb(14 24 36 / 58%) 100%);
}

html:not(.dark) .login-theme {
  color: rgb(20 28 40 / 80%);
  background: rgb(255 255 255 / 72%);
  border-color: rgb(20 28 40 / 10%);
}

html:not(.dark) .login-theme:hover {
  color: var(--el-color-primary);
  background: #fff;
}

@media (max-width: 560px) {
  .login-page {
    padding: 28px 16px 24px;
  }

  .login-card {
    padding: 32px 22px 22px;
    border-radius: 16px;
  }

  .login-form__options {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }

  .login-page__glow {
    width: 280px;
    height: 280px;
  }
}

@media (max-height: 640px) {
  .login-page {
    padding-top: 20px;
    padding-bottom: 20px;
  }

  .login-card {
    padding-top: 26px;
    padding-bottom: 20px;
  }

  .login-card__head {
    margin-bottom: 18px;
  }

  .login-copyright {
    margin-top: 12px;
  }
}
</style>
