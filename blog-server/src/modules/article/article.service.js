import { Op } from 'sequelize'
import { sequelize } from '../../db/index.js'
import { Article, ArticleTag, Category, Comment, Tag } from '../../db/models/index.js'
import { badRequest, notFound } from '../../core/errors.js'
import { estimateReadingTime, excerpt } from '../../core/text.js'
import { clearLikes, likeTarget } from '../like/like.service.js'
import * as repo from './article.repository.js'

/** 浏览数防刷：同一 IP 对同一篇文章 1 小时内只计一次 */
const viewThrottle = new Map()

function shouldCountView(ip, articleId) {
  const key = `${ip}:${articleId}`
  const now = Date.now()
  const last = viewThrottle.get(key)
  if (last && now - last < 60 * 60 * 1000) return false
  viewThrottle.set(key, now)
  if (viewThrottle.size > 5000) {
    for (const [k, ts] of viewThrottle) {
      if (now - ts > 60 * 60 * 1000) viewThrottle.delete(k)
    }
  }
  return true
}

/**
 * 序列化文章。
 * @param {Article} article
 * @param {{ withContent?: boolean }} [options]
 */
export function toArticleJSON(article, { withContent = false } = {}) {
  const plain = article.get({ plain: true })
  const json = {
    id: plain.id,
    title: plain.title,
    summary: plain.summary,
    cover: plain.cover,
    categoryId: plain.categoryId,
    category: plain.category ? { id: plain.category.id, name: plain.category.name } : null,
    tags: (plain.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name, color: tag.color })),
    status: plain.status,
    isRecommend: plain.isRecommend,
    isTop: plain.isTop,
    views: plain.views,
    likeCount: plain.likeCount,
    commentCount: plain.commentCount,
    readingTime: plain.readingTime,
    publishedAt: plain.publishedAt,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  }
  if (withContent) json.content = plain.content
  return json
}

/** 前台列表 */
export async function listArticles(params) {
  const { count, rows } = await repo.findPublishedPage(params)
  return { list: rows.map((row) => toArticleJSON(row)), total: count }
}

/** 推荐位 */
export async function listRecommended(limit) {
  const rows = await repo.findRecommended(limit)
  return rows.map((row) => toArticleJSON(row))
}

/** 归档 */
export async function listArchives() {
  const rows = await repo.findAllForArchive()
  /** @type {Map<number, Map<number, Array<{id:number,title:string,createdAt:Date}>>>} */
  const grouped = new Map()
  for (const row of rows) {
    const date = new Date(row.publishedAt ?? row.createdAt)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    if (!grouped.has(year)) grouped.set(year, new Map())
    const months = grouped.get(year)
    if (!months.has(month)) months.set(month, [])
    months.get(month)?.push({ id: row.id, title: row.title, createdAt: date })
  }

  return [...grouped.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => {
      const monthList = [...months.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, articles]) => ({ month, count: articles.length, articles }))
      return { year, count: monthList.reduce((sum, item) => sum + item.count, 0), months: monthList }
    })
}

/** 文章详情（含上下篇与相关文章） */
export async function getArticleDetail(id, ip) {
  const article = await repo.findPublishedDetail(id)
  if (!article) throw notFound('文章不存在或尚未发布')

  if (shouldCountView(ip, id)) {
    await repo.incrementViews(id)
    article.views += 1
  }

  const [{ prev, next }, related] = await Promise.all([repo.findSiblings(article), repo.findRelated(article)])
  return {
    ...toArticleJSON(article, { withContent: true }),
    prev,
    next,
    related: related.map((row) => ({ id: row.id, title: row.title, cover: row.cover })),
  }
}

/** 点赞文章 */
export function likeArticle(id, ip) {
  return likeTarget({ Model: Article, targetType: 'article', targetId: id, ip })
}

/** 管理端列表 */
export async function listAdminArticles(params) {
  const { count, rows } = await repo.findAdminPage(params)
  return { list: rows.map((row) => toArticleJSON(row)), total: count }
}

/** 管理端详情（草稿可读） */
export async function getAdminArticle(id) {
  const article = await repo.findAnyDetail(id)
  if (!article) throw notFound('文章不存在')
  return toArticleJSON(article, { withContent: true })
}

/**
 * 校验并返回标签实例。
 * @param {number[]} tagIds
 */
async function resolveTags(tagIds) {
  if (!tagIds.length) return []
  const tags = await Tag.findAll({ where: { id: { [Op.in]: tagIds } } })
  if (tags.length !== new Set(tagIds).size) throw badRequest('部分标签不存在，请刷新后重试')
  return tags
}

async function assertCategory(categoryId) {
  if (categoryId === null || categoryId === 0) return null
  const category = await Category.findByPk(categoryId)
  if (!category) throw badRequest('所选分类不存在')
  return category
}

/**
 * 新建文章
 * @param {Record<string, any>} payload
 */
export async function createArticle(payload) {
  const tags = await resolveTags(payload.tagIds ?? [])
  await assertCategory(payload.categoryId ?? null)

  const readingTime = payload.readingTime || estimateReadingTime(payload.content)
  const summary = (payload.summary ?? '').trim() || excerpt(payload.content, 160)
  const publishedAt =
    payload.status === 'published' ? payload.publishedAt ?? new Date() : null

  const created = await sequelize.transaction(async (transaction) => {
    const article = await Article.create(
      {
        title: payload.title,
        summary,
        content: payload.content,
        cover: payload.cover ?? '',
        categoryId: payload.categoryId ?? null,
        status: payload.status ?? 'draft',
        isRecommend: Boolean(payload.isRecommend),
        isTop: Boolean(payload.isTop),
        readingTime,
        publishedAt,
      },
      { transaction },
    )
    if (tags.length) await article.setTags(tags, { transaction })
    return article
  })
  return getAdminArticle(created.id)
}

/**
 * 更新文章
 * @param {number} id
 * @param {Record<string, any>} payload
 */
export async function updateArticle(id, payload) {
  const article = await Article.findByPk(id)
  if (!article) throw notFound('文章不存在')

  const tags = await resolveTags(payload.tagIds ?? [])
  await assertCategory(payload.categoryId ?? null)

  const nextStatus = payload.status ?? article.status
  let publishedAt = article.publishedAt
  if (nextStatus === 'published' && !publishedAt) publishedAt = new Date()

  const readingTime =
    payload.readingTime || estimateReadingTime(payload.content ?? article.content)
  const summary =
    (payload.summary ?? '').trim() || excerpt(payload.content ?? article.content, 160)

  await sequelize.transaction(async (transaction) => {
    await article.update(
      {
        title: payload.title ?? article.title,
        summary,
        content: payload.content ?? article.content,
        cover: payload.cover ?? article.cover,
        categoryId: payload.categoryId === undefined ? article.categoryId : payload.categoryId,
        status: nextStatus,
        isRecommend: payload.isRecommend === undefined ? article.isRecommend : Boolean(payload.isRecommend),
        isTop: payload.isTop === undefined ? article.isTop : Boolean(payload.isTop),
        readingTime,
        publishedAt,
      },
      { transaction },
    )
    await article.setTags(tags, { transaction })
  })

  return getAdminArticle(id)
}

/** 局部更新状态 / 推荐 / 置顶 */
export async function updateArticleFlags(id, payload) {
  const article = await Article.findByPk(id)
  if (!article) throw notFound('文章不存在')

  const patch = {}
  if (payload.isRecommend !== undefined) patch.isRecommend = Boolean(payload.isRecommend)
  if (payload.isTop !== undefined) patch.isTop = Boolean(payload.isTop)
  if (payload.status !== undefined) {
    patch.status = payload.status
    if (payload.status === 'published' && !article.publishedAt) patch.publishedAt = new Date()
  }
  await article.update(patch)
  return toArticleJSON(article)
}

/** 删除文章（连带评论与点赞） */
export async function deleteArticle(id) {
  const article = await Article.findByPk(id)
  if (!article) throw notFound('文章不存在')

  await sequelize.transaction(async (transaction) => {
    const comments = await Comment.findAll({ where: { articleId: id }, attributes: ['id'], transaction })
    const commentIds = comments.map((item) => item.id)
    if (commentIds.length) {
      await Comment.destroy({ where: { id: { [Op.in]: commentIds } }, transaction })
      await clearLikes('comment', commentIds)
    }
    await ArticleTag.destroy({ where: { articleId: id }, transaction })
    await article.destroy({ transaction })
  })

  await clearLikes('article', [id])
  return true
}
