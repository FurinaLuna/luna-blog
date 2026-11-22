import { Op } from 'sequelize'
import { Article, ArticleTag, Category, Tag } from '../../db/models/index.js'

const LIST_ATTRIBUTES = [
  'id',
  'title',
  'summary',
  'cover',
  'categoryId',
  'status',
  'isRecommend',
  'isTop',
  'views',
  'likeCount',
  'commentCount',
  'readingTime',
  'publishedAt',
  'createdAt',
  'updatedAt',
]

/** 列表/详情通用的 include（分类 + 标签） */
export function withRelations({ tagsRequired = false, tagId } = {}) {
  return [
    { model: Category, as: 'category', attributes: ['id', 'name'] },
    {
      model: Tag,
      as: 'tags',
      attributes: ['id', 'name', 'color'],
      through: { attributes: [] },
      ...(tagId ? { where: { id: tagId }, required: true } : {}),
    },
  ]
}

/**
 * 前台文章列表。
 * 注意：hasMany(标签) + limit 会让 LIMIT 作用在连表后的行上（多标签文章吃掉配额），
 * 因此分两步：先只查 id 分页，再按 id 取完整行。
 * @param {{ limit: number, offset: number, categoryId?: number, tagId?: number, keyword?: string, sort?: 'latest'|'popular' }} params
 */
export async function findPublishedPage({
  limit,
  offset,
  categoryId,
  tagId,
  keyword,
  sort = 'latest',
}) {
  const where = { status: 'published' }
  if (categoryId) where.categoryId = categoryId
  if (keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { summary: { [Op.like]: `%${keyword}%` } },
    ]
  }

  const order =
    sort === 'popular'
      ? [['views', 'DESC'], ['id', 'DESC']]
      : [['isTop', 'DESC'], ['publishedAt', 'DESC'], ['id', 'DESC']]

  // 按标签过滤时先取该标签下的文章 id：既能避免 hasMany 连表吃掉 limit，
  // 也避免 Sequelize 在「只查 id 的子查询」外面按 Article.is_top 排序时报 Unknown column。
  if (tagId) {
    const taggedRows = await ArticleTag.findAll({
      where: { tagId },
      attributes: ['articleId'],
      raw: true,
    })
    const taggedIds = taggedRows.map((row) => row.articleId)
    if (taggedIds.length === 0) return { ids: [], count: 0 }
    where.id = { [Op.in]: taggedIds }
  }

  const [idRows, count] = await Promise.all([
    Article.findAll({ where, attributes: ['id'], order, limit, offset }),
    Article.count({ where }),
  ])

  return { ids: idRows.map((row) => row.id), count }
}

/** 按 id 顺序取完整列表（带分类与标签） */
export async function findArticlesByIds(ids) {
  if (ids.length === 0) return []

  const rows = await Article.findAll({
    where: { id: { [Op.in]: ids } },
    attributes: LIST_ATTRIBUTES,
    include: withRelations(),
  })
  const byId = new Map(rows.map((row) => [row.id, row]))
  return ids.map((id) => byId.get(id)).filter(Boolean)
}


/** 推荐文章：先取 isRecommend，不足由最新文章补齐 */
export async function findRecommended(limit) {
  const recommendedIds = await Article.findAll({
    where: { status: 'published', isRecommend: true },
    attributes: ['id'],
    order: [['publishedAt', 'DESC'], ['id', 'DESC']],
    limit,
  })
  /** 只返回后台明确勾了「推荐」的文章，不足不补：首页推荐卡片在没有推荐时整块隐藏 */
  return findArticlesByIds(recommendedIds.map((row) => row.id))
}

/** 归档用的精简数据 */
export function findAllForArchive() {
  return Article.findAll({
    where: { status: 'published' },
    attributes: ['id', 'title', 'cover', 'createdAt', 'publishedAt'],
    order: [['publishedAt', 'DESC'], ['id', 'DESC']],
    raw: true,
  })
}

/** 详情（含正文） */
export function findPublishedDetail(id) {
  return Article.findOne({
    where: { id, status: 'published' },
    include: withRelations(),
    subQuery: false,
  })
}

/** 管理端详情（草稿也可读） */
export function findAnyDetail(id) {
  return Article.findByPk(id, { include: withRelations(), subQuery: false })
}

/** 上一篇 / 下一篇（按 publishedAt + id 相邻） */
export async function findSiblings(article) {
  const pivot = article.publishedAt ?? article.createdAt
  const [prev, next] = await Promise.all([
    Article.findOne({
      where: {
        status: 'published',
        id: { [Op.ne]: article.id },
        [Op.or]: [{ publishedAt: { [Op.lt]: pivot } }, { publishedAt: pivot, id: { [Op.lt]: article.id } }],
      },
      attributes: ['id', 'title'],
      order: [['publishedAt', 'DESC'], ['id', 'DESC']],
      raw: true,
    }),
    Article.findOne({
      where: {
        status: 'published',
        id: { [Op.ne]: article.id },
        [Op.or]: [{ publishedAt: { [Op.gt]: pivot } }, { publishedAt: pivot, id: { [Op.gt]: article.id } }],
      },
      attributes: ['id', 'title'],
      order: [['publishedAt', 'ASC'], ['id', 'ASC']],
      raw: true,
    }),
  ])
  return { prev: prev ?? null, next: next ?? null }
}

/** 相关文章：同分类或同标签，取最新 4 篇 */
export async function findRelated(article, limit = 4) {
  const tagIds = (article.tags ?? []).map((tag) => tag.id)
  const or = []

  if (article.categoryId) or.push({ categoryId: article.categoryId })

  if (tagIds.length) {
    const shares = await ArticleTag.findAll({
      where: { tagId: { [Op.in]: tagIds } },
      attributes: ['articleId'],
      raw: true,
    })
    const relatedIds = [...new Set(shares.map((row) => row.articleId))].filter((id) => id !== article.id)
    if (relatedIds.length) or.push({ id: { [Op.in]: relatedIds } })
  }

  if (!or.length) return []

  return Article.findAll({
    where: { status: 'published', id: { [Op.ne]: article.id }, [Op.or]: or },
    attributes: ['id', 'title', 'cover'],
    order: [['publishedAt', 'DESC'], ['id', 'DESC']],
    limit,
  })
}

/** 多标签交集查询（前台标签页可复用） */
export function findIdsByTag(tagId) {
  return ArticleTag.findAll({ where: { tagId }, attributes: ['articleId'], raw: true })
}

/** 管理端分页列表：先查 id 再取详情，避免标签连表吃掉 limit 配额 */
export async function findAdminPage({ limit, offset, status, keyword, categoryId }) {
  const where = {}
  if (status) where.status = status
  if (categoryId) where.categoryId = categoryId
  if (keyword) {
    where[Op.or] = [
      { title: { [Op.like]: `%${keyword}%` } },
      { summary: { [Op.like]: `%${keyword}%` } },
    ]
  }

  const [count, pageRows] = await Promise.all([
    Article.count({ where }),
    Article.findAll({
      where,
      attributes: ['id'],
      order: [['updatedAt', 'DESC'], ['id', 'DESC']],
      limit,
      offset,
    }),
  ])

  return { count, rows: await findArticlesByIds(pageRows.map((row) => row.id)) }
}

/** 同步文章标签关联 */
export async function syncArticleTags(article, tagIds, transaction) {
  await article.setTags(tagIds, { transaction })
}

/** 统计某分类下文章数 */
export function countByCategory(categoryId) {
  return Article.count({ where: { categoryId } })
}

/** 浏览数 +1 */
export function incrementViews(id) {
  return Article.increment('views', { by: 1, where: { id } })
}

/** 评论数增量（delta 可正可负） */
export function adjustCommentCount(id, delta) {
  return Article.increment('commentCount', { by: delta, where: { id } })
}
