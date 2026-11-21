<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, Moon, Sunny, User } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ApiError } from '@/api/http'

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

const formRef = ref<FormInstance>()
const submitting = ref(false)
const errorText = ref('')

const redirect = computed(() => {
  const target = route.query.redirect
  return typeof target === 'string' && target.startsWith('/') ? target : '/dashboard'
})

onMounted(() => {
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
  <div class="relative flex min-h-screen items-center justify-center px-4 py-10" :style="{ background: 'var(--bg)' }">
    <div
      class="pointer-events-none absolute inset-0 overflow-hidden opacity-70"
      aria-hidden="true"
    >
      <div
        class="absolute -top-32 -left-24 h-[420px] w-[420px] rounded-full blur-3xl"
        :style="{ background: 'radial-gradient(circle, rgba(47,143,131,.18), transparent 70%)' }"
      />
      <div
        class="absolute -right-20 -bottom-32 h-[380px] w-[380px] rounded-full blur-3xl"
        :style="{ background: 'radial-gradient(circle, rgba(224,122,63,.14), transparent 70%)' }"
      />
    </div>

    <button
      type="button"
      class="absolute top-5 right-5 z-10 grid h-9 w-9 cursor-pointer place-items-center rounded-[10px] border-0 bg-transparent transition-colors hover:bg-[var(--brand-soft)]"
      :style="{ color: 'var(--text-2)' }"
      :aria-label="theme.isDark ? '切换亮色' : '切换深色'"
      @click="theme.toggle()"
    >
      <el-icon :size="18"><Sunny v-if="theme.isDark" /><Moon v-else /></el-icon>
    </button>

    <div class="relative z-10 flex w-full max-w-[900px] overflow-hidden rounded-[18px] border" :style="{ borderColor: 'var(--border)', background: 'var(--card)', boxShadow: 'var(--shadow)' }">
      <div
        class="hidden w-[44%] flex-col justify-between p-8 lg:flex"
        :style="{ background: 'linear-gradient(160deg, #26766c 0%, #2f8f83 55%, #5ec9b8 130%)' }"
      >
        <div class="flex items-center gap-2 text-white">
          <span class="grid h-9 w-9 place-items-center rounded-xl bg-white/15 text-[17px]">🌙</span>
          <span class="text-[15px] font-bold tracking-wide">Luna Blog</span>
        </div>
        <div class="text-white">
          <p class="m-0 text-[26px] leading-snug font-bold">把想说的话<br />留在月光里</p>
          <p class="mt-3 mb-0 text-[13px] leading-relaxed text-white/75">
            文章、说说、相册与留言，都在同一个地方安静生长。
          </p>
        </div>
        <p class="m-0 text-[11px] text-white/60">© {{ new Date().getFullYear() }} Furina Luna</p>
      </div>

      <div class="flex-1 p-7 sm:p-9">
        <div class="mb-6 lg:hidden">
          <span class="grid h-10 w-10 place-items-center rounded-xl text-[18px] text-white" :style="{ background: 'linear-gradient(135deg, #2f8f83, #5ec9b8)' }">🌙</span>
        </div>
        <h1 class="m-0 text-[22px] font-bold tracking-tight" :style="{ color: 'var(--text)' }">登录管理后台</h1>
        <p class="mt-1.5 mb-6 text-[13px]" :style="{ color: 'var(--text-2)' }">使用管理员账号继续</p>

        <el-alert
          v-if="errorText"
          :title="errorText"
          type="error"
          show-icon
          :closable="false"
          class="mb-4"
        />

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" size="large" @submit.prevent="handleSubmit">
          <el-form-item label="账号" prop="username">
            <el-input v-model="form.username" placeholder="请输入账号" :prefix-icon="User" autocomplete="username" />
          </el-form-item>
          <el-form-item label="密码" prop="password">
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

          <div class="mb-4 flex items-center justify-between">
            <el-checkbox v-model="form.remember" label="记住账号" />
            <span class="hint">首次登录需修改初始密码</span>
          </div>

          <el-button type="primary" size="large" class="w-full" :loading="submitting" @click="handleSubmit">
            登录
          </el-button>
        </el-form>

        <p class="mt-6 mb-0 text-center text-[11px]" :style="{ color: 'var(--text-3)' }">
          仅限站点管理员使用 · 请勿在公共设备保存账号
        </p>
      </div>
    </div>
  </div>
</template>
