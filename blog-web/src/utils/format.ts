import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

/** 列表时间：YYYY-MM-DD */
export function formatDate(value?: string | null): string {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD') : ''
}

/** 详情时间：YYYY年M月D日 HH:mm */
export function formatDateTime(value?: string | null): string {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY年M月D日 HH:mm') : ''
}

/** 时间轴时间：YYYY-MM-DD HH:mm */
export function formatArchiveTime(value?: string | null): string {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : ''
}

/** 说说 / 评论时间：30 天内相对时间，更久则显示日期 */
export function formatRelative(value?: string | null): string {
  if (!value) return ''
  const date = dayjs(value)
  if (!date.isValid()) return ''
  return dayjs().diff(date, 'day') < 30 ? date.fromNow() : date.format('YYYY-MM-DD')
}

/** 大数字压缩：12345 → 1.2w */
export function formatCompact(value: number): string {
  if (!Number.isFinite(value)) return '0'
  if (value >= 10_000) return `${(value / 10_000).toFixed(1).replace(/\.0$/, '')}w`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, '')}k`
  return String(value)
}

/** 千分位 */
export function formatCount(value: number): string {
  return Number.isFinite(value) ? value.toLocaleString('zh-CN') : '0'
}

/** 从起始日到今天经过的天数（用于「运行天数」，无效日期返回 0） */
export function daysSince(value?: string | null): number {
  if (!value) return 0
  const start = dayjs(value)
  if (!start.isValid()) return 0
  return Math.max(0, dayjs().startOf('day').diff(start.startOf('day'), 'day'))
}

/** 按起始年份生成版权年份区间 */
export function formatCopyrightYear(startDate?: string | null): string {
  const currentYear = dayjs().year()
  if (!startDate) return String(currentYear)
  const startYear = dayjs(startDate).year()
  if (!Number.isFinite(startYear) || startYear >= currentYear) return String(currentYear)
  return `${startYear} - ${currentYear}`
}
