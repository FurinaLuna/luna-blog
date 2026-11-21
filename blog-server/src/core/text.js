/** HTML 转义：访客提交的文本一律转义后再存储/展示 */
export function escapeHtml(input) {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** 去掉所有 HTML 标签与不可见字符，用于摘要 */
export function toPlainText(markdown) {
  return String(markdown)
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*`~\-|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 截断文本，超出加省略号 */
export function excerpt(text, maxLength = 160) {
  const plain = toPlainText(text)
  return plain.length <= maxLength ? plain : `${plain.slice(0, maxLength - 1)}…`
}

/** 按中英文混排估算阅读时长（分钟，最少 1 分钟） */
export function estimateReadingTime(content) {
  const plain = toPlainText(content)
  const chineseChars = (plain.match(/[\u4e00-\u9fa5]/g) ?? []).length
  const otherWords = plain.replace(/[\u4e00-\u9fa5]/g, ' ').split(/\s+/).filter(Boolean).length
  const minutes = Math.ceil((chineseChars + otherWords * 2) / 400)
  return Math.max(1, minutes)
}

/** 邮箱脱敏：ab***@example.com */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return ''
  const [name, domain] = email.split('@')
  const head = name.slice(0, 2)
  return `${head}${'*'.repeat(Math.max(3, name.length - 2))}@${domain}`
}

/**
 * 取客户端 IP（兼容代理场景）。
 * @param {import('koa').Context} ctx
 */
export function clientIp(ctx) {
  const forwarded = ctx.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return ctx.ip ?? '0.0.0.0'
}

/** 简易随机色（留言弹幕用） */
const DANMAKU_COLORS = ['#2f8f83', '#e07a3f', '#6b8fbf', '#a06bbf', '#c2566b', '#8f8a3f']
export function randomDanmakuColor() {
  return DANMAKU_COLORS[Math.floor(Math.random() * DANMAKU_COLORS.length)]
}
