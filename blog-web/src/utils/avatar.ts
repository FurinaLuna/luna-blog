const HUES = [168, 24, 208, 282, 12, 142, 44, 248]

function hashName(name: string): number {
  let hash = 0
  for (const char of name) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 99991
  }
  return hash
}

export function avatarInitial(name: string): string {
  const trimmed = name.trim()
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?'
}

/** 用昵称哈希出稳定的头像底色（亮暗主题下都保持低饱和） */
export function avatarStyle(name: string, isAdmin = false): Record<string, string> {
  if (isAdmin) {
    return {
      background: 'var(--brand)',
      color: 'var(--brand-contrast)',
      borderColor: 'transparent',
    }
  }
  const hue = HUES[hashName(name) % HUES.length]
  return {
    background: `hsl(${hue} 42% 91%)`,
    color: `hsl(${hue} 40% 30%)`,
    borderColor: `hsl(${hue} 38% 84%)`,
  }
}
