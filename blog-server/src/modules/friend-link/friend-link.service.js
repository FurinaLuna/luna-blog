import { FriendLink } from '../../db/models/index.js'
import { badRequest, conflict, notFound } from '../../core/errors.js'
import { assertRateLimit } from '../../core/rate-limit.js'
import { findSensitiveWord } from '../../config/sensitive-words.js'
import { createNotification } from '../notification/notification.service.js'

/**
 * 序列化友链。
 * @param {FriendLink} friendLink
 */
export function toFriendLinkJSON(friendLink) {
  const plain = friendLink.get({ plain: true })

  return {
    id: plain.id,
    name: plain.name,
    url: plain.url,
    avatar: plain.avatar,
    description: plain.description,
    status: plain.status,
    sort: plain.sort,
    createdAt: plain.createdAt,
  }
}

/**
 * 前台友链列表（仅审核通过，按排序值升序）。
 */
export async function listApprovedFriendLinks() {
  const rows = await FriendLink.findAll({
    where: { status: 'approved' },
    order: [['sort', 'ASC'], ['id', 'ASC']],
  })

  return rows.map((row) => toFriendLinkJSON(row))
}

/**
 * 访客申请友链：每 IP 每天 1 次 + 同 URL 去重 + 敏感词 + 待审核 + 通知站长。
 * @param {{ name: string, url: string, avatar?: string, description?: string }} input
 * @param {string} ip
 */
export async function applyFriendLink(input, ip) {
  assertRateLimit(`friendlink:${ip}`, { windowMs: 24 * 3600 * 1000, max: 1 })

  const existed = await FriendLink.findOne({ where: { url: input.url } })
  if (existed) throw conflict('该站点已提交过友链申请')

  if (findSensitiveWord(`${input.name} ${input.description ?? ''}`)) {
    throw badRequest('内容包含敏感词，请修改后再提交')
  }

  const friendLink = await FriendLink.create({
    name: input.name,
    url: input.url,
    avatar: input.avatar ?? '',
    description: input.description ?? '',
    status: 'pending',
    ip,
  })

  await createNotification({
    type: 'friendlink',
    title: '收到新友链申请',
    content: `${input.name}（${input.url}）`,
    targetType: 'friendlink',
    targetId: friendLink.id,
  })

  return { id: friendLink.id, status: 'pending' }
}

/**
 * 管理员新增友链：跳过访客限频，默认直接通过审核。
 * @param {{ name: string, url: string, avatar?: string, description?: string, sort?: number, status?: string }} input
 */
export async function createFriendLink(input) {
  const existed = await FriendLink.findOne({ where: { url: input.url } })
  if (existed) throw conflict('该站点已存在，请直接编辑原记录')

  const friendLink = await FriendLink.create({
    name: input.name,
    url: input.url,
    avatar: input.avatar ?? '',
    description: input.description ?? '',
    sort: input.sort ?? 0,
    status: input.status ?? 'approved',
    ip: '',
  })

  return toFriendLinkJSON(friendLink)
}

/**
 * 后台友链列表（全部状态，待审核优先展示）。
 */
export async function listAllFriendLinks() {
  const rows = await FriendLink.findAll({
    order: [['status', 'ASC'], ['sort', 'ASC'], ['id', 'DESC']],
  })

  return rows.map((row) => toFriendLinkJSON(row))
}

/**
 * 审核友链。
 * @param {number} id
 * @param {'approved'|'rejected'} status
 */
export async function reviewFriendLink(id, status) {
  const friendLink = await FriendLink.findByPk(id)
  if (!friendLink) throw notFound('友链不存在')

  await friendLink.update({ status })

  return toFriendLinkJSON(friendLink)
}

/**
 * 更新友链（未传字段保留原值）。
 * @param {number} id
 * @param {{ name: string, url: string, avatar?: string, description?: string, sort?: number, status?: string }} payload
 */
export async function updateFriendLink(id, payload) {
  const friendLink = await FriendLink.findByPk(id)
  if (!friendLink) throw notFound('友链不存在')

  await friendLink.update({
    name: payload.name,
    url: payload.url,
    avatar: payload.avatar ?? friendLink.avatar,
    description: payload.description ?? friendLink.description,
    sort: payload.sort ?? friendLink.sort,
    status: payload.status ?? friendLink.status,
  })

  return toFriendLinkJSON(friendLink)
}

/**
 * 删除友链。
 * @param {number} id
 */
export async function deleteFriendLink(id) {
  const friendLink = await FriendLink.findByPk(id)
  if (!friendLink) throw notFound('友链不存在')

  await friendLink.destroy()

  return true
}
