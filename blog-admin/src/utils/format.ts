import dayjs from 'dayjs'

export function formatDateTime(value?: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'
}

export function formatDate(value?: string | null): string {
  return value ? dayjs(value).format('YYYY-MM-DD') : '—'
}

/** 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / 日期 */
export function fromNow(value?: string | null): string {
  if (!value) return '—'
  const target = dayjs(value)
  const diff = Date.now() - target.valueOf()
  if (diff < 0) return formatDateTime(value)
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return target.format('YYYY-MM-DD')
}

export function formatNumber(value?: number | null): string {
  if (value === null || value === undefined) return '0'
  return value.toLocaleString('zh-CN')
}

export function truncate(text: string, max = 80): string {
  const plain = text.replace(/\s+/g, ' ').trim()
  return plain.length > max ? `${plain.slice(0, max)}…` : plain
}

/** 后端返回 /uploads/... 相对路径，直接由 vite 代理到后端 */
export function resolveAssetUrl(url?: string | null): string {
  if (!url) return ''
  if (/^(https?:|data:|blob:)/.test(url)) return url
  return url.startsWith('/') ? url : `/${url}`
}

export function plainText(html: string): string {
  return html
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[#>*_`~\-[\]()!|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
