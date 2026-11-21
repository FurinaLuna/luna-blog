import { Op } from 'sequelize'
import { sequelize } from '../../db/index.js'
import { Comment, Talk } from '../../db/models/index.js'
import { notFound } from '../../core/errors.js'
import { clearLikes, likeTarget } from '../like/like.service.js'

/**
 * 序列化说说（前台 / 后台共用）。
 * @param {Talk} talk
 */
export function toTalkJSON(talk) {
  const plain = talk.get({ plain: true })

  return {
    id: plain.id,
    content: plain.content,
    images: Array.isArray(plain.images) ? plain.images : [],
    likeCount: plain.likeCount,
    commentCount: plain.commentCount,
    createdAt: plain.createdAt,
  }
}

/**
 * 前台说说列表（按发布时间倒序，分页）。
 * @param {{ limit: number, offset: number }} paging
 */
export async function listTalks({ limit, offset }) {
  const { count, rows } = await Talk.findAndCountAll({
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  })

  return { list: rows.map((row) => toTalkJSON(row)), total: count }
}

/**
 * 发布说说。
 * @param {{ content: string, images?: string[] }} payload
 */
export async function createTalk(payload) {
  const talk = await Talk.create({
    content: payload.content,
    images: payload.images ?? [],
  })

  return toTalkJSON(talk)
}

/**
 * 更新说说。images 缺省时保留原图，避免误清空。
 * @param {number} id
 * @param {{ content: string, images?: string[] }} payload
 */
export async function updateTalk(id, payload) {
  const talk = await Talk.findByPk(id)
  if (!talk) throw notFound('说说不存在')

  await talk.update({
    content: payload.content,
    ...(payload.images === undefined ? {} : { images: payload.images }),
  })

  return toTalkJSON(talk)
}

/**
 * 删除说说：连带删除该说说的评论（talkId）与评论/说说的点赞记录。
 * @param {number} id
 */
export async function deleteTalk(id) {
  const talk = await Talk.findByPk(id)
  if (!talk) throw notFound('说说不存在')

  const commentIds = await sequelize.transaction(async (transaction) => {
    const comments = await Comment.findAll({
      where: { talkId: id },
      attributes: ['id'],
      transaction,
    })
    const ids = comments.map((item) => item.id)

    if (ids.length) {
      await Comment.destroy({ where: { id: { [Op.in]: ids } }, transaction })
    }
    await talk.destroy({ transaction })

    return ids
  })

  if (commentIds.length) await clearLikes('comment', commentIds)
  await clearLikes('talk', [id])

  return true
}

/**
 * 点赞说说（同 IP 幂等）。
 * @param {number} id
 * @param {string} ip
 */
export function likeTalk(id, ip) {
  return likeTarget({ Model: Talk, targetType: 'talk', targetId: id, ip })
}
