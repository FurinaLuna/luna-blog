import dayjs from 'dayjs'
import { QueryTypes } from 'sequelize'
import { sequelize } from '../../db/index.js'
import { Album, Article, Category, Comment, FriendLink, Message, Photo, Talk } from '../../db/models/index.js'

const TREND_DAYS = 7

/**
 * 统计站点概况（仪表盘专用）。
 */
async function loadCounts() {
  const [
    article,
    published,
    draft,
    comment,
    pendingComment,
    talk,
    album,
    photo,
    message,
    pendingMessage,
    friendLink,
    pendingFriendLink,
    views,
  ] = await Promise.all([
    Article.count(),
    Article.count({ where: { status: 'published' } }),
    Article.count({ where: { status: 'draft' } }),
    Comment.count(),
    Comment.count({ where: { status: 'pending' } }),
    Talk.count(),
    Album.count(),
    Photo.count(),
    Message.count(),
    Message.count({ where: { status: 'pending' } }),
    FriendLink.count(),
    FriendLink.count({ where: { status: 'pending' } }),
    Article.sum('views'),
  ])

  return {
    article,
    published,
    draft,
    comment,
    pendingComment,
    talk,
    album,
    photo,
    message,
    pendingMessage,
    friendLink,
    pendingFriendLink,
    views: Number(views) || 0,
  }
}

/**
 * 最近 5 条评论（含待审核，后台字段）。
 */
async function loadRecentComments() {
  const rows = await Comment.findAll({
    order: [['id', 'DESC']],
    limit: 5,
  })

  return rows.map((row) => row.toAdminJSON())
}

/**
 * 最近 5 篇有更新的文章（附带分类与浏览量，供仪表盘表格直接展示）。
 */
async function loadRecentArticles() {
  const rows = await Article.findAll({
    attributes: ['id', 'title', 'status', 'views', 'categoryId', 'updatedAt'],
    include: [{ model: Category, as: 'category', attributes: ['id', 'name'] }],
    order: [['updatedAt', 'DESC'], ['id', 'DESC']],
    limit: 5,
  })

  return rows.map((row) => {
    const plain = row.get({ plain: true })
    return {
      id: plain.id,
      title: plain.title,
      status: plain.status,
      views: plain.views,
      categoryId: plain.categoryId,
      category: plain.category ? { id: plain.category.id, name: plain.category.name } : null,
      updatedAt: plain.updatedAt,
    }
  })
}

/**
 * 近 7 天（含今天）每天的文章数与评论数。
 * 用原生 SQL 按创建日期分组，避免逐天查询。
 */
async function loadTrend() {
  const since = dayjs().startOf('day').subtract(TREND_DAYS - 1, 'day').toDate()

  const [articleRows, commentRows] = await Promise.all([
    sequelize.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
         FROM article
        WHERE status = 'published' AND created_at >= :since
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
      { replacements: { since }, type: QueryTypes.SELECT },
    ),
    sequelize.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS date, COUNT(*) AS count
         FROM comment
        WHERE created_at >= :since
        GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d')`,
      { replacements: { since }, type: QueryTypes.SELECT },
    ),
  ])

  const articleMap = new Map(articleRows.map((row) => [String(row.date), Number(row.count)]))
  const commentMap = new Map(commentRows.map((row) => [String(row.date), Number(row.count)]))

  return Array.from({ length: TREND_DAYS }, (_, index) => {
    const date = dayjs()
      .startOf('day')
      .subtract(TREND_DAYS - 1 - index, 'day')
      .format('YYYY-MM-DD')

    return {
      date,
      articles: articleMap.get(date) ?? 0,
      comments: commentMap.get(date) ?? 0,
    }
  })
}

/**
 * 仪表盘数据：概况计数 + 最近评论 + 最近文章 + 近 7 天趋势。
 */
export async function getDashboard() {
  const [counts, recentComments, recentArticles, trend] = await Promise.all([
    loadCounts(),
    loadRecentComments(),
    loadRecentArticles(),
    loadTrend(),
  ])

  return { counts, recentComments, recentArticles, trend }
}
