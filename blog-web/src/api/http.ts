import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'
import type { ApiResponse } from './types'

/**
 * axios 单例。
 * - baseURL: /api（由 vite 代理到后端）
 * - timeout: 15s
 * - 统一校验 code === 0，非 0 时弹出后端 message 并抛出 ApiError
 * - 网络/超时/5xx 统一兜底文案
 * - 支持 silent：站点信息等后台请求失败时不打扰用户
 */
export interface RequestConfig extends AxiosRequestConfig {
  /** 静默请求：不自动弹出错误提示 */
  silent?: boolean
}

export class ApiError extends Error {
  readonly code: number

  constructor(message: string, code: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

const http = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  headers: { Accept: 'application/json' },
})

/** 同一文案 1.5s 内只提示一次，避免并发请求刷屏 */
const notifiedAt = new Map<string, number>()

function notify(message: string): void {
  const now = Date.now()
  const last = notifiedAt.get(message)
  if (last !== undefined && now - last < 1_500) return
  notifiedAt.set(message, now)
  ElMessage.error(message)
}

interface ErrorBody {
  message?: string
}

function resolveHttpErrorMessage(error: AxiosError<ErrorBody>): string {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return '请求超时，请稍后重试'
  }
  if (!error.response) {
    return '网络异常，请稍后重试'
  }

  const { status, data } = error.response
  const serverMessage = data?.message

  if (status === 429) return serverMessage || '操作过于频繁，请稍后再试'
  if (status === 404) return serverMessage || '请求的内容不存在'
  if (status >= 500) return serverMessage || '服务器开小差了，请稍后重试'
  return serverMessage || '请求失败，请稍后重试'
}

http.interceptors.response.use(
  (response) => {
    const config = response.config as RequestConfig
    const payload = response.data as ApiResponse<unknown> | null | undefined

    if (payload && typeof payload === 'object' && typeof payload.code === 'number' && payload.code !== 0) {
      const message = payload.message || '请求失败，请稍后重试'
      if (!config.silent) notify(message)
      return Promise.reject(new ApiError(message, payload.code))
    }

    return response
  },
  (error: AxiosError<ErrorBody>) => {
    const config = error.config as RequestConfig | undefined
    if (!config?.silent) notify(resolveHttpErrorMessage(error))
    return Promise.reject(error)
  },
)

/** 统一解包 `{ code, message, data }`，返回 data */
export async function request<T>(config: RequestConfig): Promise<T> {
  const response = await http.request<ApiResponse<T>>(config)
  return response.data.data
}

type Params = Record<string, unknown>

export function get<T>(url: string, params?: Params, options?: { silent?: boolean }): Promise<T> {
  return request<T>({ method: 'GET', url, params, silent: options?.silent })
}

export function post<T>(url: string, data?: unknown, options?: { silent?: boolean }): Promise<T> {
  return request<T>({ method: 'POST', url, data, silent: options?.silent })
}

export default http
