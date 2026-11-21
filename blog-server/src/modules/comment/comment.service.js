import { Article, Comment, Talk } from '../../db/models/index.js'
import { badRequest, notFound } from '../../core/errors.js'
import { assertRateLimit } from '../../core/rate-limit.js'
import { findSensitiveWord } from '../../config/sensitive-words.js'
import { excerpt } from '../../core/text.js'
import { likeTarget } from '../like/like.service.js'
import { createNotification } from '../notification/notification.service.js'
import * as repo from './comment.repository.js'

/**
 * 校验评论目标存在且可评论。
 * @param {'article'|'talk'} targetType
 * @param {number} targetId
 */
async function assertTarget(targetType, targetId) {
  if (targetType === 'article') {
    const article = await Article.findOne({ where: { id: targetId, status: 'published' }, attributes: ['id', 'title'] })
    if (!article) throw notFound('文章不存在或尚未发布')
    return article
  }
  const talk = await Talk.findByPk(targetId, { attributes: ['id', 'content'] })
  if (!talk) throw notFound('说说不存在')
  return talk
}

/** 目标评论数增减 */
async function adjustTargetCommentCount(comment, delta) {
  if (delta === 0) return
  if (comment.targetType === 'article' && comment.articleId) {
    await Article.increment('commentCount', { by: delta, where: { id: comment.articleId } })
  } else if (comment.targetType === 'talk' && comment.talkId) {
    await Talk.increment('commentCount', { by: delta, where: { id: comment.talkId } })
  }
}

/**
 * 前台评论列表：顶层分页 + 每条带 replies。
 * @param {{ targetType: 'article'|'talk', targetId: number, limit: number, offset: number }} params
 */
export async function listComments({ targetType, targetId, limit, offset }) {
  await assertTarget(targetType, targetId)

  const { count, rows } = await repo.findApprovedTopLevel({ targetType, targetId, limit, offset })
  const roots = rows.map((row) => row.toPublicJSON())
  const replies = await repo.findApprovedReplies(rows.map((row) => row.id))

  const nicknameMap = new Map(rows.map((row) => [row.id, row.nickname]))
  const grouped = new Map(roots.map((root) => [root.id, []]))
  for (const reply of replies) {
    const json = reply.toPublicJSON()
    const rootId = reply.parentId
    const bucket = grouped.get(rootId)
    if (!bucket || bucket.length >= 50) continue
    json.replyTo = { nickname: nicknameMap.get(rootId) ?? '访客' }
    bucket.push(json)
  }

  return {
    list: roots.map((root) => ({ ...root, replies: grouped.get(root.id) ?? [] })),
    total: count,
  }
}

/**
 * 访客提交评论（免登录，默认待审核）。
 * @param {Record<string, any>} input
 * @param {{ ip: string, userAgent: string }} meta
 */
export async function createVisitorComment(input, meta) {
  const target = await assertTarget(input.targetType, input.articleId ?? input.talkId)

  let parentId = null
  let replyToNickname = ''
  if (input.parentId) {
    const parent = await repo.findById(input.parentId)
    if (!parent || parent.status !== 'approved') throw notFound('要回复的评论不存在或尚未通过审核')
    const sameTarget =
      parent.targetType === input.targetType &&
      (input.targetType === 'article' ? parent.articleId === input.articleId : parent.talkId === input.talkId)
    if (!sameTarget) throw badRequest('要回复的评论不属于当前内容')

    parentId = parent.parentId ?? parent.id
    replyToNickname = parent.nickname
  }

  // 限频：IP 60 秒 1 条、IP 每小时 10 条、邮箱每小时 5 条
  assertRateLimit(`comment:ip:${meta.ip}`, { windowMs: 60_000, max: 1, message: '评论太频繁了，请稍后再试' })
  assertRateLimit(`comment:hour:${meta.ip}`, { windowMs: 3_600_000, max: 10 })
  assertRateLimit(`comment:email:${input.email}`, { windowMs: 3_600_000, max: 5 })

  const sensitive = findSensitiveWord(input.content)
  if (sensitive) throw badRequest('内容包含敏感词，请修改后再提交')

  const comment = await Comment.create({
    targetType: input.targetType,
    articleId: input.targetType === 'article' ? input.articleId : null,
    talkId: input.targetType === 'talk' ? input.talkId : null,
    parentId,
    nickname: input.nickname,
    email: input.email,
    website: input.website ?? '',
    content: input.content,
    isAdmin: false,
    status: 'pending',
    ip: meta.ip,
  })

  const targetLabel = input.targetType === 'article' ? `《${target.title}》` : '说说'
  await createNotification({
    type: 'comment',
    title: replyToNickname ? `收到新回复（${replyToNickname}）` : '收到新评论',
    content: `${input.nickname} 评论了${targetLabel}：${excerpt(input.content, 80)}`,
    targetType: 'comment',
    targetId: comment.id,
  })

  return { id: comment.id, status: 'pending' }
}

/**
 * 审核评论。
 * @param {number} id
 * @param {'approved'|'rejected'} status
 */
export async function reviewComment(id, status) {
  const comment = await repo.findById(id)
  if (!comment) throw notFound('评论不存在')

  const previous = comment.status
  if (previous === status) return comment.toAdminJSON()

  await comment.update({ status })

  if (previous !== 'approved' && status === 'approved') await adjustTargetCommentCount(comment, 1)
  if (previous === 'approved' && status !== 'approved') await adjustTargetCommentCount(comment, -1)

  return comment.toAdminJSON()
}

/**
 * 管理员回复（直接展示）。
 * @param {number} id
 * @param {string} content
 * @param {{ nickname: string, email: string }} admin
 */
export async function replyAsAdmin(id, content, admin) {
  const parent = await repo.findById(id)
  if (!parent) throw notFound('评论不存在')

  const sensitive = findSensitiveWord(content)
  if (sensitive) throw badRequest('回复内容包含敏感词，请修改后再提交')

  const reply = await Comment.create({
    targetType: parent.targetType,
    articleId: parent.articleId,
    talkId: parent.talkId,
    parentId: parent.parentId ?? parent.id,
    nickname: admin.nickname || '博主',
    email: admin.email || '',
    website: '',
    content,
    isAdmin: true,
    status: 'approved',
    ip: '',
  })

  await adjustTargetCommentCount(reply, 1)
  return reply.toAdminJSON()
}

/**
 * 删除评论（连带子回复）。
 * @param {number} id
 */
export async function deleteComment(id) {
  const comment = await repo.findById(id)
  if (!comment) throw notFound('评论不存在')

  const replyRows = await repo.findReplyIds(id)
  const approvedReplies = await Comment.count({ where: { parentId: id, status: 'approved' } })

  await Comment.destroy({ where: { id } })
  if (replyRows.length) {
    await Comment.destroy({ where: { parentId: id } })
  }

  const removed = (comment.status === 'approved' ? 1 : 0) + approvedReplies
  if (removed > 0) await adjustTargetCommentCount(comment, -removed)

  return true
}

/**
 * 管理端评论列表（附带所属内容标题）。
 * @param {{ limit: number, offset: number, status?: string, targetType?: string, keyword?: string }} params
 */
export async function listAdminComments(params) {
  const { count, rows } = await repo.findAdminPage(params)

  const articleIds = [...new Set(rows.filter((row) => row.articleId).map((row) => row.articleId))]
  const talkIds = [...new Set(rows.filter((row) => row.talkId).map((row) => row.talkId))]

  const [articles, talks] = await Promise.all([
    articleIds.length
      ? Article.findAll({ where: { id: articleIds }, attributes: ['id', 'title'], raw: true })
      : [],
    talkIds.length ? Talk.findAll({ where: { id: talkIds }, attributes: ['id', 'content'], raw: true }) : [],
  ])

  const articleMap = new Map(articles.map((item) => [item.id, item.title]))
  const talkMap = new Map(talks.map((item) => [item.id, excerpt(item.content, 24)]))

  return {
    list: rows.map((row) => ({
      ...row.toAdminJSON(),
      targetTitle: row.articleId ? articleMap.get(row.articleId) ?? '' : talkMap.get(row.talkId) ?? '',
    })),
    total: count,
  }
}

/** 点赞评论 */
export function likeComment(id, ip) {
  return likeTarget({ Model: Comment, targetType: 'comment', targetId: id, ip })
}
