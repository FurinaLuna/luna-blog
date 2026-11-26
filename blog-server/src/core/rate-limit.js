import { tooManyRequests } from './errors.js'

/** @type {Map<string, number[]>} 滑动窗口：key -> 命中时间戳数组 */
const buckets = new Map()
let lastSweep = Date.now()

/** 桶内时间戳最多保留 24h（必须覆盖最长的限频窗口，否则会被短窗口调用误删） */
const MAX_KEEP_MS = 24 * 60 * 60 * 1000

/** 每 5 分钟清理一次过期窗口，避免内存持续增长 */
function sweep(now) {
  if (now - lastSweep < 5 * 60 * 1000) return
  lastSweep = now
  for (const [key, hits] of buckets) {
    const alive = hits.filter((t) => now - t < MAX_KEEP_MS)
    if (alive.length === 0) buckets.delete(key)
    else buckets.set(key, alive)
  }
}

/**
 * 命中一次限频窗口。
 * @param {string} key 限频维度（如 ip、ip:email）
 * @param {{ windowMs: number, max: number }} options
 * @returns {{ allowed: boolean, retryAfterSeconds: number }}
 */
export function hitRateLimit(key, { windowMs, max }) {
  const now = Date.now()
  sweep(now)
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs)
  if (hits.length >= max) {
    const oldest = hits[0] ?? now
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000)) }
  }
  hits.push(now)
  buckets.set(key, hits)
  return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * 校验限频，超限直接抛 429。
 * @param {string} key
 * @param {{ windowMs: number, max: number, message?: string }} options
 */
export function assertRateLimit(key, options) {
  const { allowed, retryAfterSeconds } = hitRateLimit(key, options)
  if (!allowed) {
    throw tooManyRequests(options.message ?? `操作太频繁，请 ${retryAfterSeconds} 秒后再试`)
  }
}
