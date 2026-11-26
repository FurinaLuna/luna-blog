import { createHash } from 'node:crypto'
import { Op } from 'sequelize'
import { Visit } from '../../db/models/index.js'
import { config } from '../../config/index.js'

/** 统计缓存时长：同一进程内 60 秒内重复读取不再全表 COUNT */
const STATS_CACHE_TTL_MS = 60 * 1000
/** 访问记录保留天数：超期数据在每天首次上报时清理 */
const RETENTION_DAYS = 90
/** 清理间隔：24 小时内最多执行一次，避免每个上报请求都删一遍 */
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000
const DAY_MS = 24 * 60 * 60 * 1000

/** @type {{ pv: number, uv: number, expiresAt: number } | null} */
let statsCache = null
let lastCleanupAt = 0
let cleanupPending = false

/**
 * 用站点密钥做盐再哈希，避免库里存明文 IP、也避免裸哈希被反查。
 * 换 JWT_SECRET 会让历史访客去重口径重置，属可接受行为（换密钥本来就意味着全站重置）。
 */
function hashIp(ip) {
  return createHash('sha256').update(`${config.jwt.secret}|${ip}`).digest('hex')
}

function clip(value, max) {
  return String(value ?? '').slice(0, max)
}

/**
 * 上报成功后局部 +1，避免每条上报都重新 COUNT 全表。
 * UV 无法从单条记录推导，最多滞后一个缓存周期（60 秒），过期后重新统计。
 */
function bumpStatsCache() {
  if (!statsCache || Date.now() >= statsCache.expiresAt) {
    statsCache = null
    return
  }
  statsCache.pv += 1
}

/**
 * 删除 90 天前的访问记录，让 visit 表不再无限增长。
 * 模块级时间戳保证 24 小时内最多跑一次；失败只记日志，不影响上报主流程。
 */
async function cleanupExpiredVisits() {
  const now = Date.now()
  if (cleanupPending || now - lastCleanupAt < CLEANUP_INTERVAL_MS) return
  cleanupPending = true
  lastCleanupAt = now
  try {
    const cutoff = new Date(now - RETENTION_DAYS * DAY_MS)
    await Visit.destroy({ where: { createdAt: { [Op.lt]: cutoff } } })
    /** 行数变了，让下一次读取重新统计 */
    statsCache = null
  } catch (error) {
    console.error('[visit] 清理过期访问记录失败：', error instanceof Error ? error.message : error)
  } finally {
    cleanupPending = false
  }
}

/** 记一次页面浏览 */
export async function recordVisit({ ip, path, userAgent, referer }) {
  await Visit.create({
    ipHash: hashIp(ip),
    path: clip(path, 255),
    userAgent: clip(userAgent, 255),
    referer: clip(referer, 255),
  })
  bumpStatsCache()
  void cleanupExpiredVisits()
}

/** 总访问量（PV=行数）与总访客数（UV=去重 IP 哈希数），结果缓存 60 秒 */
export async function getVisitStats() {
  const now = Date.now()
  if (statsCache && statsCache.expiresAt > now) {
    return { pv: statsCache.pv, uv: statsCache.uv }
  }

  const [pv, uv] = await Promise.all([
    Visit.count(),
    Visit.count({ col: 'ip_hash', distinct: true }),
  ])
  statsCache = {
    pv: Number(pv ?? 0),
    uv: Number(uv ?? 0),
    expiresAt: now + STATS_CACHE_TTL_MS,
  }
  return { pv: statsCache.pv, uv: statsCache.uv }
}
