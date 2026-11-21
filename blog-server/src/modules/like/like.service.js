import { sequelize } from '../../db/index.js'
import { Like } from '../../db/models/index.js'
import { assertRateLimit } from '../../core/rate-limit.js'
import { notFound } from '../../core/errors.js'

/**
 * 幂等点赞：同一 IP 对同一目标只计一次。
 * - 已点过：直接返回当前计数（不报错，前端点击重复也安全）
 * - 首次点赞：写 like 记录 + 目标计数 +1（事务）
 *
 * @param {{ Model: import('sequelize').ModelStatic<any>, targetType: 'article'|'comment'|'talk'|'message', targetId: number, ip: string }} params
 * @returns {Promise<{ liked: true, likeCount: number }>}
 */
export async function likeTarget({ Model, targetType, targetId, ip }) {
  const target = await Model.findByPk(targetId, { attributes: ['id', 'likeCount'] })
  if (!target) throw notFound('要点赞的内容不存在')

  const existing = await Like.findOne({ where: { targetType, targetId, ip } })
  if (existing) {
    return { liked: true, likeCount: target.likeCount }
  }

  // 防刷：同一 IP 对同一目标 10 秒内只允许一次「新增」请求
  assertRateLimit(`like:${targetType}:${targetId}:${ip}`, {
    windowMs: 10_000,
    max: 1,
    message: '点赞太频繁了，稍后再试',
  })

  try {
    await sequelize.transaction(async (transaction) => {
      await Like.create({ targetType, targetId, ip }, { transaction })
      await Model.increment('likeCount', { by: 1, where: { id: targetId }, transaction })
    })
  } catch (error) {
    // 并发下唯一键冲突：说明已经点过，忽略即可
    if (!(error instanceof Error) || error.name !== 'SequelizeUniqueConstraintError') throw error
  }

  const fresh = await Model.findByPk(targetId, { attributes: ['likeCount'] })
  return { liked: true, likeCount: fresh?.likeCount ?? target.likeCount + 1 }
}

/** 删除目标时清理点赞记录 */
export async function clearLikes(targetType, targetIds) {
  if (!targetIds.length) return
  await Like.destroy({ where: { targetType, targetId: targetIds } })
}
