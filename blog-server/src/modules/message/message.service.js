import { Message } from '../../db/models/index.js'
import { badRequest, notFound } from '../../core/errors.js'
import { assertRateLimit } from '../../core/rate-limit.js'
import { randomDanmakuColor } from '../../core/text.js'
import { findSensitiveWord } from '../../config/sensitive-words.js'
import { clearLikes, likeTarget } from '../like/like.service.js'
import { createNotification } from '../notification/notification.service.js'
import { getSiteConfig } from '../site/site-config.service.js'

/**
 * 前台留言（弹幕）序列化：隐藏 IP 与审核状态。
 * @param {Message} message
 */
export function toPublicMessageJSON(message) {
  const plain = message.get({ plain: true })

  return {
    id: plain.id,
    nickname: plain.nickname,
    content: plain.content,
    color: plain.color,
    likeCount: plain.likeCount,
    createdAt: plain.createdAt,
  }
}

/**
 * 后台留言序列化：包含审核状态与来源 IP。
 * @param {Message} message
 */
export function toAdminMessageJSON(message) {
  const plain = message.get({ plain: true })

  return {
    id: plain.id,
    nickname: plain.nickname,
    content: plain.content,
    color: plain.color,
    status: plain.status,
    likeCount: plain.likeCount,
    createdAt: plain.createdAt,
    ip: plain.ip,
  }
}

/**
 * 前台留言列表（仅审核通过）。
 * @param {{ limit: number, offset: number }} paging
 */
export async function listApprovedMessages({ limit, offset }) {
  const { count, rows } = await Message.findAndCountAll({
    where: { status: 'approved' },
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  })

  return { list: rows.map((row) => toPublicMessageJSON(row)), total: count }
}

/**
 * 访客留言：限频 + 敏感词 + 转义入库 + 待审核 + 通知站长。
 * @param {{ nickname: string, content: string, color?: string }} input
 * @param {string} ip
 */
export async function createMessage(input, ip) {
  assertRateLimit(`message:${ip}`, { windowMs: 60_000, max: 1 })
  assertRateLimit(`message:hour:${ip}`, { windowMs: 3_600_000, max: 10 })

  if (findSensitiveWord(input.content)) {
    throw badRequest('内容包含敏感词，请修改后再提交')
  }

  const content = input.content.trim()
  if (content.length > 500) throw badRequest('留言内容过长，请精简后再提交')

  /** 站点配置里关掉「留言需要审核」后，新留言直接公开（仍会通知站长） */
  const config = await getSiteConfig()
  const needReview = config.messageNeedReview !== false
  const status = needReview ? 'pending' : 'approved'

  const message = await Message.create({
    nickname: input.nickname,
    content,
    color: input.color ?? randomDanmakuColor(),
    status,
    ip,
  })

  await createNotification({
    type: 'message',
    title: '收到新留言',
    content: `${input.nickname}: ${input.content}`,
    targetType: 'message',
    targetId: message.id,
  })

  return { id: message.id, status }
}

/**
 * 后台留言列表（可按审核状态过滤）。
 * @param {{ status?: string, limit: number, offset: number }} query
 */
export async function listAdminMessages({ status, limit, offset }) {
  const { count, rows } = await Message.findAndCountAll({
    where: status ? { status } : {},
    order: [['createdAt', 'DESC'], ['id', 'DESC']],
    limit,
    offset,
  })

  return { list: rows.map((row) => toAdminMessageJSON(row)), total: count }
}

/**
 * 审核留言。
 * @param {number} id
 * @param {'approved'|'rejected'} status
 */
export async function reviewMessage(id, status) {
  const message = await Message.findByPk(id)
  if (!message) throw notFound('留言不存在')

  await message.update({ status })

  return toAdminMessageJSON(message)
}

/**
 * 删除留言：连带清理点赞记录。
 * @param {number} id
 */
export async function deleteMessage(id) {
  const message = await Message.findByPk(id)
  if (!message) throw notFound('留言不存在')

  await message.destroy()
  await clearLikes('message', [id])

  return true
}

/**
 * 点赞留言（同 IP 幂等）。
 * @param {number} id
 * @param {string} ip
 */
export function likeMessage(id, ip) {
  return likeTarget({ Model: Message, targetType: 'message', targetId: id, ip })
}

/**
 * 批量审核 / 删除留言：单条失败（比如已被删除）跳过，不中断整批。
 * @param {number[]} ids
 * @param {'approve'|'reject'|'delete'} action
 */
export async function batchMessages(ids, action) {
  let affected = 0
  for (const id of ids) {
    try {
      if (action === 'delete') {
        await deleteMessage(id)
      } else {
        await reviewMessage(id, action === 'approve' ? 'approved' : 'rejected')
      }
      affected += 1
    } catch {
      /** 跳过：该条可能刚被删除 */
    }
  }
  return { affected, requested: ids.length }
}
