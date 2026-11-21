import axios, { AxiosError, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiErrorBody, ApiResponse } from './types'

const TOKEN_KEY = 'luna-admin-token'

export function readToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function writeToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function removeToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface HttpHooks {
  onUnauthorized?: () => void
  onPasswordChangeRequired?: () => void
}

let hooks: HttpHooks = {}

export function setHttpHooks(next: HttpHooks): void {
  hooks = next
}

export class ApiError extends Error {
  readonly status: number
  readonly code: number
  readonly details: Array<{ field: string; message: string }>
  readonly reason: string

  constructor(
    message: string,
    status: number,
    code: number,
    details: Array<{ field: string; message: string }> = [],
    reason = '',
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.reason = reason
  }
}

const instance = axios.create({
  baseURL: '/api',
  timeout: 20000,
})

instance.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

instance.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse<unknown> | undefined
    if (!body || typeof body !== 'object' || typeof body.code !== 'number') {
      return response.data
    }
    if (body.code !== 0) {
      const message = body.message || '请求失败，请稍后重试'
      ElMessage.error(message)
      return Promise.reject(new ApiError(message, body.code, body.code))
    }
    return body.data
  },
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status ?? 0
    const body = error.response?.data
    const fallback = status === 0 ? '网络异常，请稍后重试' : '请求失败，请稍后重试'
    const message = body?.message || fallback
    const reason = body?.reason ?? ''

    if (status === 401) {
      removeToken()
      hooks.onUnauthorized?.()
    } else if (status === 403 && reason === 'PASSWORD_CHANGE_REQUIRED') {
      hooks.onPasswordChangeRequired?.()
    }

    ElMessage.error(message)
    return Promise.reject(
      new ApiError(message, status, body?.code ?? status, body?.details ?? [], reason),
    )
  },
)

type RequestConfig = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'>

/**
 * 响应拦截器已把 `{code, message, data}` 解包成 `data`，
 * 因此这里把 axios 的返回类型收窄为业务数据类型。
 */
export const http = {
  get<T>(url: string, config?: RequestConfig): Promise<T> {
    return instance.get(url, config) as unknown as Promise<T>
  },
  post<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return instance.post(url, data, config) as unknown as Promise<T>
  },
  put<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return instance.put(url, data, config) as unknown as Promise<T>
  },
  patch<T>(url: string, data?: unknown, config?: RequestConfig): Promise<T> {
    return instance.patch(url, data, config) as unknown as Promise<T>
  },
  delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return instance.delete(url, config) as unknown as Promise<T>
  },
}
