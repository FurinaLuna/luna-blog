import { http } from './http'
import type { AdminUser, LoginPayload, LoginResult, PasswordPayload } from './types'

/** 管理员登录 */
export function login(payload: LoginPayload): Promise<LoginResult> {
  return http.post<LoginResult>('/auth/login', payload)
}

/** 当前管理员资料 */
export function getProfile(): Promise<AdminUser> {
  return http.get<AdminUser>('/auth/profile')
}

/** 修改密码（首登强制改密也走这里） */
export function changePassword(payload: PasswordPayload): Promise<void> {
  return http.put<void>('/auth/password', payload)
}
