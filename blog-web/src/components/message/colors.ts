/**
 * 留言墙配色。
 * 与后端 `randomDanmakuColor` 使用同一组色值，保证「发布时选的颜色」和「卡片/弹幕呈现」一致。
 */
export const MESSAGE_COLORS = [
  '#2f8f83',
  '#e07a3f',
  '#6b8fbf',
  '#a06bbf',
  '#c2566b',
  '#8f8a3f',
] as const

const HEX_COLOR = /^#[0-9a-f]{6}$/i

/** 取色：非法/缺省时按 seed 落到调色板，保证每张卡片始终有底色 */
export function resolveMessageColor(color: string | null | undefined, seed = 0): string {
  if (color && HEX_COLOR.test(color)) return color.toLowerCase()
  return MESSAGE_COLORS[Math.abs(seed) % MESSAGE_COLORS.length]
}

function toRgb(hex: string): [number, number, number] {
  const value = resolveMessageColor(hex)
  return [
    Number.parseInt(value.slice(1, 3), 16),
    Number.parseInt(value.slice(3, 5), 16),
    Number.parseInt(value.slice(5, 7), 16),
  ]
}

/** 把颜色朝白色(255)/黑色(0)混合，ratio 取 0-1 */
export function mixColor(color: string, target: 0 | 255, ratio: number): string {
  const [r, g, b] = toRgb(color)
  const mix = (channel: number): number => Math.round(channel + (target - channel) * ratio)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}
