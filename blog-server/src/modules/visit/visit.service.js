import { createHash } from 'node:crypto'
import { Visit } from '../../db/models/index.js'
import { config } from '../../config/index.js'

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

/** 记一次页面浏览 */
export async function recordVisit({ ip, path, userAgent, referer }) {
  await Visit.create({
    ipHash: hashIp(ip),
    path: clip(path, 255),
    userAgent: clip(userAgent, 255),
    referer: clip(referer, 255),
  })
}

/** 总访问量（PV=行数）与总访客数（UV=去重 IP 哈希数） */
export async function getVisitStats() {
  const [pv, uv] = await Promise.all([
    Visit.count(),
    Visit.count({ col: 'ip_hash', distinct: true }),
  ])
  return { pv: Number(pv ?? 0), uv: Number(uv ?? 0) }
}
