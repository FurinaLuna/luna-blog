<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import { ApiError } from '@/api/http'

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
  <div class="flex min-h-screen items-center justify-center px-4 py-10" :style="{ background: 'var(--bg)' }">
    <div class="w-full max-w-[460px] rounded-[18px] border p-7 sm:p-8" :style="{ borderColor: 'var(--border)', background: 'var(--card)', boxShadow: 'var(--shadow)' }">
      <div class="mb-5 flex items-center gap-2.5">
        <span class="grid h-10 w-10 place-items-center rounded-xl text-[17px] text-white" :style="{ background: 'linear-gradient(135deg, #2f8f83, #5ec9b8)' }">🔐</span>
        <div>
          <h1 class="m-0 text-[18px] font-bold" :style="{ color: 'var(--text)' }">修改密码</h1>
          <p class="m-0 text-[12px]" :style="{ color: 'var(--text-2)' }">
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

      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="handleSubmit">
        <el-form-item label="原密码" prop="oldPassword">
          <el-input v-model="form.oldPassword" type="password" show-password placeholder="请输入当前密码" :prefix-icon="Lock" autocomplete="current-password" />
        </el-form-item>
        <el-form-item label="新密码" prop="newPassword">
          <el-input v-model="form.newPassword" type="password" show-password placeholder="8–32 位，建议包含字母与数字" :prefix-icon="Lock" autocomplete="new-password" />
        </el-form-item>
        <el-form-item label="确认新密码" prop="confirmPassword">
          <el-input v-model="form.confirmPassword" type="password" show-password placeholder="请再次输入新密码" :prefix-icon="Lock" autocomplete="new-password" @keyup.enter="handleSubmit" />
        </el-form-item>

        <div class="mt-5 flex items-center gap-2">
          <el-button type="primary" :loading="submitting" @click="handleSubmit">保存新密码</el-button>
          <el-button v-if="!auth.needPasswordChange" @click="router.back()">返回</el-button>
          <el-button v-else link @click="theme.toggle()">
            {{ theme.isDark ? '切换亮色' : '切换深色' }}
          </el-button>
        </div>
      </el-form>

      <p class="mt-5 mb-0 text-center text-[11px]" :style="{ color: 'var(--text-3)' }">
        {{ auth.displayName }} · 修改后请使用新密码登录
      </p>
    </div>
  </div>
</template>
