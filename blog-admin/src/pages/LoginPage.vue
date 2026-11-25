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
import illustrationImage from '@/assets/login/illustration.svg'

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
  <div class="login-container">
    <img class="login-wave" :src="loginBg" alt="" />
    <div class="login-scrim" aria-hidden="true"></div>

    <div class="login-marketing">
      <div class="login-brand">
        <img class="login-brand__mark" :src="avatarSrc" :alt="brandName" />
        <div>
          <p class="login-brand__title">{{ brandName }}</p>
          <p class="login-brand__sub">内容管理后台</p>
        </div>
      </div>
      <img class="login-illustration" :src="illustrationImage" alt="登录插画" />
      <p class="login-marketing__tip">文章、说说、相册与留言，都在同一个地方安静生长。</p>
    </div>

    <div class="login-panel">
      <div class="login-box">
        <div class="login-head">
          <img class="login-avatar" :src="avatarSrc" :alt="brandName" />
          <h2>{{ brandName }}</h2>
          <p>登录管理后台</p>
        </div>

        <el-alert
          v-if="errorText"
          :title="errorText"
          type="error"
          show-icon
          :closable="false"
          class="mb-4"
        />

        <el-form
          ref="formRef"
          :model="form"
          :rules="rules"
          size="large"
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

          <div class="login-options">
            <el-checkbox v-model="form.remember" label="记住账号" />
            <span class="login-options__tip">首次登录需修改初始密码</span>
          </div>

          <el-button
            type="primary"
            size="large"
            class="login-submit"
            :loading="submitting"
            @click="handleSubmit"
          >
            登录
          </el-button>
        </el-form>

        <p class="login-footer">
          仅限站点管理员使用 · 请勿在公共设备保存账号
        </p>
      </div>
    </div>

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
.login-container {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8rem;
  width: 100vw;
  min-height: 100vh;
  padding: 0 2rem;
  overflow: hidden;
  background-color: #f0f2f5;
}

.login-wave {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.login-scrim {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background: transparent;
  transition: background-color 0.3s ease;
}

.login-marketing,
.login-panel {
  position: relative;
  z-index: 1;
}

.login-marketing {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 28px;
}

.login-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.login-brand__mark {
  width: 44px;
  height: 44px;
}

.login-brand__title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  color: #1890ff;
}

.login-brand__sub {
  margin: 2px 0 0;
  font-size: 12px;
  color: #676767;
}

.login-illustration {
  width: min(500px, 90%);
  height: auto;
}

.login-marketing__tip {
  max-width: 440px;
  margin: 0;
  font-size: 14px;
  color: #606266;
  text-align: center;
}

.login-panel {
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-box {
  width: 360px;
  padding: 30px 28px;
  background-color: var(--card);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 12%);
}

.login-head {
  margin-bottom: 20px;
  text-align: center;
}

.login-avatar {
  width: 46px;
  height: 46px;
  margin-bottom: 6px;
}

.login-head h2 {
  margin: 0;
  font: bold 200% Consolas, Monaco, monospace;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.login-head p {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-3);
}

.login-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.login-options__tip {
  font-size: 12px;
  color: var(--text-3);
}

.login-submit {
  width: 100%;
}

.login-footer {
  margin: 20px 0 0;
  font-size: 11px;
  color: var(--text-3);
  text-align: center;
}

.login-theme {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2;
  display: grid;
  width: 36px;
  height: 36px;
  color: var(--text-2);
  cursor: pointer;
  background-color: var(--card);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  place-items: center;
}

.login-theme:hover {
  color: var(--el-color-primary);
}

@media (max-width: 1180px) {
  .login-container {
    gap: 3rem;
  }
}

@media (max-width: 968px) {
  .login-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 16px;
  }

  .login-marketing {
    display: none;
  }

  .login-wave {
    display: none;
  }

  .login-box {
    width: 100%;
    max-width: 380px;
  }
}
</style>
