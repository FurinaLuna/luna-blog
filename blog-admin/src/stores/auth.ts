import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { changePassword, getProfile, login as loginApi } from '@/api/auth'
import { readToken, removeToken, writeToken } from '@/api/http'
import type { AdminUser, LoginPayload, PasswordPayload } from '@/api/types'

const USER_KEY = 'luna-admin-user'

function readStoredUser(): AdminUser | null {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as AdminUser
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(readToken())
  const user = ref<AdminUser | null>(readStoredUser())
  const loading = ref(false)

  const isAuthenticated = computed(() => token.value !== '')
  const needPasswordChange = computed(() => user.value?.needPasswordChange === true)
  const displayName = computed(() => user.value?.nickname || user.value?.username || '管理员')

  function persistUser(next: AdminUser | null): void {
    user.value = next
    if (next) {
      localStorage.setItem(USER_KEY, JSON.stringify(next))
    } else {
      localStorage.removeItem(USER_KEY)
    }
  }

  function setToken(next: string): void {
    token.value = next
    if (next) {
      writeToken(next)
    } else {
      removeToken()
    }
  }

  async function login(payload: LoginPayload): Promise<AdminUser> {
    loading.value = true
    try {
      const result = await loginApi(payload)
      setToken(result.token)
      persistUser(result.user)
      return result.user
    } finally {
      loading.value = false
    }
  }

  /** 拉取最新资料（刷新页面后校准用户信息与改密标记） */
  async function refreshProfile(): Promise<AdminUser | null> {
    if (!token.value) return null
    const profile = await getProfile()
    persistUser(profile)
    return profile
  }

  /** 强制改密或主动改密成功后同步本地状态 */
  async function updatePassword(payload: PasswordPayload): Promise<void> {
    const result = await changePassword(payload)
    // 服务端已递增令牌版本：换上新 token，否则下一次请求会被判定失效
    if (result?.token) setToken(result.token)
    if (result?.user) {
      persistUser(result.user)
    } else if (user.value) {
      persistUser({ ...user.value, needPasswordChange: false })
    }
  }

  function logout(): void {
    setToken('')
    persistUser(null)
  }

  return {
    token,
    user,
    loading,
    isAuthenticated,
    needPasswordChange,
    displayName,
    login,
    refreshProfile,
    updatePassword,
    setToken,
    setUser: persistUser,
    logout,
  }
})
