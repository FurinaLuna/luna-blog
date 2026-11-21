import { Op } from 'sequelize'
import { Comment } from '../../db/models/index.js'

const PUBLIC_ATTRIBUTES = [
  'id',
  'targetType',
  'articleId',
  'talkId',
  'parentId',
  'nickname',
  'email',
  'website',
  'content',
  'isAdmin',
  'likeCount',
  'createdAt',
]

/** 顶层评论分页（已通过审核） */
export function findApprovedTopLevel({ targetType, targetId, limit, offset }) {
  const targetWhere = targetType === 'talk' ? { talkId: targetId } : { articleId: targetId }
  return Comment.findAndCountAll({
    where: { ...targetWhere, parentId: null, status: 'approved' },
    attributes: PUBLIC_ATTRIBUTES,
    order: [['id', 'DESC']],
    limit,
    offset,
  })
}

/** 批量取子回复（已通过审核，按时间正序） */
export function findApprovedReplies(parentIds, limitPerParent = 50) {
  if (!parentIds.length) return Promise.resolve([])
  return Comment.findAll({
    where: { parentId: { [Op.in]: parentIds }, status: 'approved' },
    attributes: PUBLIC_ATTRIBUTES,
    order: [['id', 'ASC']],
    limit: parentIds.length * limitPerParent,
  })
}

/** 管理端分页 */
export function findAdminPage({ limit, offset, status, targetType, keyword }) {
  const where = {}
  if (status) where.status = status
  if (targetType) where.targetType = targetType
  if (keyword) {
    where[Op.or] = [
      { content: { [Op.like]: `%${keyword}%` } },
      { nickname: { [Op.like]: `%${keyword}%` } },
      { email: { [Op.like]: `%${keyword}%` } },
    ]
  }
  return Comment.findAndCountAll({
    where,
    attributes: [...PUBLIC_ATTRIBUTES, 'status', 'ip'],
    order: [['id', 'DESC']],
    limit,
    offset,
  })
}

export function findById(id) {
  return Comment.findByPk(id)
}

/** 取某条评论的全部子回复 id */
export function findReplyIds(parentId) {
  return Comment.findAll({ where: { parentId }, attributes: ['id'], raw: true })
}

/** 统计某目标下已通过的评论数 */
export function countApproved(targetType, targetId) {
  const targetWhere = targetType === 'talk' ? { talkId: targetId } : { articleId: targetId }
  return Comment.count({ where: { ...targetWhere, status: 'approved' } })
}
