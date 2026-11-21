<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import PageHeader from '@/components/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { ApiError } from '@/api/http'
import { formatDateTime, resolveAssetUrl } from '@/utils/format'

interface PasswordForm {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

const auth = useAuthStore()
const formRef = ref<FormInstance>()
const saving = ref(false)
const formError = ref('')

const form = reactive<PasswordForm>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const rules: FormRules<PasswordForm> = {
  oldPassword: [{ required: true, message: '请输入原密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 8, max: 32, message: '新密码长度需为 8–32 位', trigger: 'blur' },
    {
      validator: (_rule, value: string, callback) => {
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
      validator: (_rule, value: string, callback) => {
        if (value !== form.newPassword) {
          callback(new Error('两次输入的密码不一致'))
          return
        }
        callback()
      },
      trigger: 'blur',
    },
  ],
}

const user = computed(() => auth.user)
const avatarText = computed(() => (user.value?.nickname || user.value?.username || 'L').slice(0, 1))

async function submitPassword(): Promise<void> {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  formError.value = ''
  try {
    await auth.updatePassword({ oldPassword: form.oldPassword, newPassword: form.newPassword })
    ElMessage.success('密码已修改')
    form.oldPassword = ''
    form.newPassword = ''
    form.confirmPassword = ''
    void formRef.value?.clearValidate()
  } catch (error) {
    if (error instanceof ApiError) formError.value = error.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="mb-3">
      <PageHeader title="个人中心" description="账号资料与安全设置" />
    </el-card>

    <div class="grid grid-cols-1 gap-3 lg:grid-cols-[320px_minmax(0,1fr)]">
      <el-card shadow="never">
        <template #header>
          <span class="text-[14px] font-semibold text-[var(--text)]">账号资料</span>
        </template>

        <div class="flex flex-col items-center py-2 text-center">
          <el-avatar :size="76" :src="user?.avatar ? resolveAssetUrl(user.avatar) : undefined" shape="circle">
            {{ avatarText }}
          </el-avatar>
          <div class="mt-3 text-[16px] font-semibold text-[var(--text)]">
            {{ user?.nickname || user?.username || '未登录' }}
          </div>
          <div class="mt-0.5 text-[12px] text-[var(--text-2)]">@{{ user?.username }}</div>
          <el-tag v-if="user?.needPasswordChange" size="small" type="warning" effect="light" class="mt-2">
            待修改初始密码
          </el-tag>
        </div>

        <div class="mt-3 border-t border-[var(--border)] pt-3">
          <div class="flex items-center justify-between py-1.5 text-[12px]">
            <span class="text-[var(--text-2)]">邮箱</span>
            <span class="text-[var(--text)]">{{ user?.email || '未设置' }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5 text-[12px]">
            <span class="text-[var(--text-2)]">最近登录</span>
            <span class="text-[var(--text)]">{{ user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : '—' }}</span>
          </div>
          <div class="flex items-center justify-between py-1.5 text-[12px]">
            <span class="text-[var(--text-2)]">创建时间</span>
            <span class="text-[var(--text)]">{{ user?.createdAt ? formatDateTime(user.createdAt) : '—' }}</span>
          </div>
        </div>

        <p class="mt-3 text-[12px] leading-5 text-[var(--text-3)]">
          资料字段为只读展示。当前接口契约仅提供修改密码，头像与昵称需在服务端后台维护。
        </p>
      </el-card>

      <el-card shadow="never">
        <template #header>
          <span class="text-[14px] font-semibold text-[var(--text)]">修改密码</span>
        </template>

        <p class="mb-4 text-[12px] text-[var(--text-3)]">修改后需要重新登录；新密码长度 8–32 位，且不能与原密码相同。</p>

        <el-alert v-if="formError" :title="formError" type="error" show-icon :closable="false" class="mb-4" />

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="max-w-[420px]" @submit.prevent="submitPassword">
          <el-form-item label="原密码" prop="oldPassword">
            <el-input v-model="form.oldPassword" type="password" show-password autocomplete="current-password" />
          </el-form-item>
          <el-form-item label="新密码" prop="newPassword">
            <el-input v-model="form.newPassword" type="password" show-password autocomplete="new-password" />
          </el-form-item>
          <el-form-item label="确认新密码" prop="confirmPassword">
            <el-input v-model="form.confirmPassword" type="password" show-password autocomplete="new-password" />
          </el-form-item>
          <el-button type="primary" :loading="saving" :icon="Lock" @click="submitPassword">
            {{ saving ? '保存中…' : '更新密码' }}
          </el-button>
        </el-form>

        <div class="mt-8 border-t border-[var(--border)] pt-4">
          <div class="mb-2 flex items-center gap-2 text-[14px] font-semibold text-[var(--text)]">
            <el-icon><User /></el-icon>
            账号信息
          </div>
          <div class="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
            <div class="rounded px-3 py-2" style="background: var(--bg-soft)">
              <div class="text-[var(--text-3)]">登录账号</div>
              <div class="mt-0.5 text-[var(--text)]">{{ user?.username || '—' }}</div>
            </div>
            <div class="rounded px-3 py-2" style="background: var(--bg-soft)">
              <div class="text-[var(--text-3)]">显示昵称</div>
              <div class="mt-0.5 text-[var(--text)]">{{ user?.nickname || '—' }}</div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>
