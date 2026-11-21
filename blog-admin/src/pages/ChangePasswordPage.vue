<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, Moon, Sunny } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ApiError } from '@/api/http'
import bgImage from '@/assets/login/bg.png'
import avatarImage from '@/assets/login/avatar.svg'

const router = useRouter()
const auth = useAuthStore()
const theme = useThemeStore()

interface PasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

const form = reactive<PasswordForm>({ oldPassword: '', newPassword: '', confirmPassword: '' })
const formRef = ref<FormInstance>()
const submitting = ref(false)

const rules: FormRules<PasswordForm> = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 32, message: '密码长度需为 8–32 位', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback: (error?: Error) => void) => {
        if (value && value === form.oldPassword) {
          callback(new Error('新密码不能与原密码相同'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
  confirmPassword: [
    { required: true, message: '请再次输入新密码', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback: (error?: Error) => void) => {
        if (value !== form.newPassword) {
          callback(new Error('两次输入的新密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

async function handleSubmit(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await auth.updatePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    ElMessage.success('密码已更新')
    await router.replace({ name: 'Dashboard' })
  } catch (error) {
    if (error instanceof ApiError) {
      ElMessage.error(error.message)
    }
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="password-page">
    <img class="password-wave" :src="bgImage" alt="" />

    <div class="password-box">
      <div class="password-head">
        <img class="password-avatar" :src="avatarImage" alt="Luna Blog" />
        <div>
          <h1>修改密码</h1>
          <p>
            {{ auth.needPasswordChange ? '首次登录需修改初始密码后才能使用后台' : '定期更换密码可以让账号更安全' }}
          </p>
        </div>
      </div>

      <el-alert
        v-if="auth.needPasswordChange"
        title="为了账号安全，请先设置新密码。修改成功后会自动进入后台。"
        type="warning"
        show-icon
        :closable="false"
        class="mb-5"
      />

      <el-form ref="formRef" :model="form" :rules="rules" size="large" @submit.prevent="handleSubmit">
        <el-form-item prop="oldPassword">
          <el-input
            v-model="form.oldPassword"
            type="password"
            show-password
            placeholder="原密码"
            :prefix-icon="Lock"
            autocomplete="current-password"
          />
        </el-form-item>
        <el-form-item prop="newPassword">
          <el-input
            v-model="form.newPassword"
            type="password"
            show-password
            placeholder="新密码（8–32 位）"
            :prefix-icon="Lock"
            autocomplete="new-password"
          />
        </el-form-item>
        <el-form-item prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            show-password
            placeholder="确认新密码"
            :prefix-icon="Lock"
            autocomplete="new-password"
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <div class="mt-4 flex items-center gap-2">
          <el-button type="primary" class="flex-1" :loading="submitting" @click="handleSubmit">
            保存新密码
          </el-button>
          <el-button v-if="!auth.needPasswordChange" @click="router.back()">返回</el-button>
        </div>
      </el-form>

      <p class="password-foot">
        {{ auth.displayName }} · 修改后请使用新密码登录
      </p>
    </div>

    <button
      type="button"
      class="password-theme"
      :aria-label="theme.isDark ? '切换亮色' : '切换深色'"
      @click="theme.toggle()"
    >
      <el-icon :size="18"><Sunny v-if="theme.isDark" /><Moon v-else /></el-icon>
    </button>
  </div>
</template>

<style scoped>
.password-page {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 24px 16px;
  overflow: hidden;
  background-color: #f0f2f5;
}

.password-wave {
  position: fixed;
  inset: 0;
  z-index: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.password-box {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 420px;
  padding: 28px;
  background-color: var(--card);
  border-radius: 4px;
  box-shadow: 0 2px 12px rgb(0 0 0 / 12%);
}

.password-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.password-avatar {
  width: 44px;
  height: 44px;
}

.password-head h1 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--text-2);
}

.password-head p {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-3);
}

.password-foot {
  margin: 18px 0 0;
  font-size: 11px;
  color: var(--text-3);
  text-align: center;
}

.password-theme {
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

.password-theme:hover {
  color: var(--el-color-primary);
}

:global(html.dark) .password-wave {
  opacity: 0.16;
}
</style>
