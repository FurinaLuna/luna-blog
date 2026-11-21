import { Resource } from '../../db/models/index.js'
import { notFound } from '../../core/errors.js'

/**
 * 序列化资源。
 * @param {Resource} resource
 */
export function toResourceJSON(resource) {
  const plain = resource.get({ plain: true })

  return {
    id: plain.id,
    name: plain.name,
    url: plain.url,
    description: plain.description,
    icon: plain.icon,
    category: plain.category,
    sort: plain.sort,
  }
}

/**
 * 前台资源列表（按分类内排序值升序）。
 */
export async function listResources() {
  const rows = await Resource.findAll({ order: [['sort', 'ASC'], ['id', 'ASC']] })

  return rows.map((row) => toResourceJSON(row))
}

/**
 * 新建资源。
 * @param {{ name: string, url: string, description?: string, icon?: string, category?: string, sort?: number }} payload
 */
export async function createResource(payload) {
  const resource = await Resource.create({
    name: payload.name,
    url: payload.url,
    description: payload.description ?? '',
    icon: payload.icon ?? '',
    category: payload.category ?? '常用站点',
    sort: payload.sort ?? 0,
  })

  return toResourceJSON(resource)
}

/**
 * 更新资源（未传字段保留原值）。
 * @param {number} id
 * @param {{ name: string, url: string, description?: string, icon?: string, category?: string, sort?: number }} payload
 */
export async function updateResource(id, payload) {
  const resource = await Resource.findByPk(id)
  if (!resource) throw notFound('资源不存在')

  await resource.update({
    name: payload.name,
    url: payload.url,
    description: payload.description ?? resource.description,
    icon: payload.icon ?? resource.icon,
    category: payload.category ?? resource.category,
    sort: payload.sort ?? resource.sort,
  })

  return toResourceJSON(resource)
}

/**
 * 删除资源。
 * @param {number} id
 */
export async function deleteResource(id) {
  const resource = await Resource.findByPk(id)
  if (!resource) throw notFound('资源不存在')

  await resource.destroy()

  return true
}
