export interface VisitorIdentity {
  nickname: string
  email: string
  website: string
}

const STORAGE_KEY = 'luna-visitor'
const EMPTY: VisitorIdentity = { nickname: '', email: '', website: '' }

export function loadVisitor(): VisitorIdentity {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...EMPTY }
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return { ...EMPTY }
    const record = parsed as Record<string, unknown>
    return {
      nickname: typeof record.nickname === 'string' ? record.nickname : '',
      email: typeof record.email === 'string' ? record.email : '',
      website: typeof record.website === 'string' ? record.website : '',
    }
  } catch {
    return { ...EMPTY }
  }
}

export function saveVisitor(identity: VisitorIdentity): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(identity))
  } catch {
    /* 隐私模式下忽略 */
  }
}
