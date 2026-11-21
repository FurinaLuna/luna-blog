import { Op, QueryTypes } from 'sequelize'
import { sequelize } from '../../db/index.js'
import { Article, ArticleTag, Category, Tag } from '../../db/models/index.js'
import { conflict, notFound } from '../../core/errors.js'

/**
 * 分类列表（含已发布文章数）
 */
export async function listCategories() {
  const [categories, counts] = await Promise.all([
    Category.findAll({ order: [['sort', 'ASC'], ['id', 'ASC']] }),
    Article.findAll({
      attributes: ['categoryId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { status: 'published', categoryId: { [Op.ne]: null } },
      group: ['categoryId'],
      raw: true,
    }),
  ])

  const countMap = new Map(counts.map((row) => [row.categoryId, Number(row.count)]))

  return categories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    sort: category.sort,
    articleCount: countMap.get(category.id) ?? 0,
  }))
}

/**
 * @param {{ name: string, slug?: string, description?: string, sort?: number }} payload
 */
export async function createCategory(payload) {
  const duplicated = await Category.findOne({ where: { name: payload.name } })
  if (duplicated) throw conflict('该分类名称已存在')

  const category = await Category.create({
    name: payload.name,
    slug: payload.slug ?? '',
    description: payload.description ?? '',
    sort: payload.sort ?? 0,
  })
  return { id: category.id, name: category.name, slug: category.slug, description: category.description, sort: category.sort, articleCount: 0 }
}

/**
 * @param {number} id
 * @param {{ name: string, slug?: string, description?: string, sort?: number }} payload
 */
export async function updateCategory(id, payload) {
  const category = await Category.findByPk(id)
  if (!category) throw notFound('分类不存在')

  const duplicated = await Category.findOne({ where: { name: payload.name, id: { [Op.ne]: id } } })
  if (duplicated) throw conflict('该分类名称已存在')

  await category.update({
    name: payload.name,
    slug: payload.slug ?? '',
    description: payload.description ?? '',
    sort: payload.sort ?? 0,
  })
  return { id: category.id, name: category.name }
}

/** 删除分类：其下文章的分类置空 */
export async function deleteCategory(id) {
  const category = await Category.findByPk(id)
  if (!category) throw notFound('分类不存在')

  await sequelize.transaction(async (transaction) => {
    await Article.update({ categoryId: null }, { where: { categoryId: id }, transaction })
    await category.destroy({ transaction })
  })
  return true
}

/** 标签列表（含已发布文章数） */
export async function listTags() {
  const [tags, counts] = await Promise.all([
    Tag.findAll({ order: [['id', 'ASC']] }),
    sequelize.query(
      `SELECT at.tag_id AS tagId, COUNT(*) AS count
         FROM article_tag at
         JOIN article a ON a.id = at.article_id AND a.status = 'published'
        GROUP BY at.tag_id`,
      { type: QueryTypes.SELECT },
    ),
  ])

  const countMap = new Map(counts.map((row) => [Number(row.tagId), Number(row.count)]))

  return tags.map((tag) => ({
    id: tag.id,
    name: tag.name,
    slug: tag.slug,
    color: tag.color,
    articleCount: countMap.get(tag.id) ?? 0,
  }))
}

/**
 * @param {{ name: string, slug?: string, color?: string }} payload
 */
export async function createTag(payload) {
  const duplicated = await Tag.findOne({ where: { name: payload.name } })
  if (duplicated) throw conflict('该标签名称已存在')

  const tag = await Tag.create({
    name: payload.name,
    slug: payload.slug ?? '',
    color: payload.color ?? '#2f8f83',
  })
  return { id: tag.id, name: tag.name, slug: tag.slug, color: tag.color, articleCount: 0 }
}

/**
 * @param {number} id
 * @param {{ name: string, slug?: string, color?: string }} payload
 */
export async function updateTag(id, payload) {
  const tag = await Tag.findByPk(id)
  if (!tag) throw notFound('标签不存在')

  const duplicated = await Tag.findOne({ where: { name: payload.name, id: { [Op.ne]: id } } })
  if (duplicated) throw conflict('该标签名称已存在')

  await tag.update({
    name: payload.name,
    slug: payload.slug ?? '',
    color: payload.color ?? tag.color,
  })
  return { id: tag.id, name: tag.name }
}

/** 删除标签：解除与文章的关联 */
export async function deleteTag(id) {
  const tag = await Tag.findByPk(id)
  if (!tag) throw notFound('标签不存在')

  await sequelize.transaction(async (transaction) => {
    await ArticleTag.destroy({ where: { tagId: id }, transaction })
    await tag.destroy({ transaction })
  })
  return true
}
