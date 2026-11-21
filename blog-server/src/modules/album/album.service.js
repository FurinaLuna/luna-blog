import { sequelize } from '../../db/index.js'
import { Album, Photo } from '../../db/models/index.js'
import { notFound } from '../../core/errors.js'

/**
 * 序列化相册。
 * @param {Album} album
 * @param {number} photoCount
 */
export function toAlbumJSON(album, photoCount = 0) {
  const plain = album.get({ plain: true })

  return {
    id: plain.id,
    name: plain.name,
    description: plain.description,
    cover: plain.cover,
    sort: plain.sort,
    photoCount,
    createdAt: plain.createdAt,
  }
}

/**
 * 序列化照片。
 * @param {Photo} photo
 */
export function toPhotoJSON(photo) {
  const plain = photo.get({ plain: true })

  return {
    id: plain.id,
    albumId: plain.albumId,
    url: plain.url,
    title: plain.title,
    description: plain.description,
    width: plain.width,
    height: plain.height,
    sort: plain.sort,
  }
}

/**
 * 一次 group by 统计各相册的照片数，避免逐相册 COUNT 的 N+1。
 */
async function countPhotosByAlbum() {
  const rows = await Photo.findAll({
    attributes: ['albumId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['albumId'],
    raw: true,
  })

  const countMap = new Map()
  for (const row of rows) countMap.set(row.albumId, Number(row.count))

  return countMap
}

/**
 * 前台相册列表（按 sort 升序，含 photoCount）。
 */
export async function listAlbums() {
  const [albums, countMap] = await Promise.all([
    Album.findAll({ order: [['sort', 'ASC'], ['id', 'ASC']] }),
    countPhotosByAlbum(),
  ])

  return albums.map((album) => toAlbumJSON(album, countMap.get(album.id) ?? 0))
}

/**
 * 相册详情（含照片列表）。
 * @param {number} id
 */
export async function getAlbumDetail(id) {
  const album = await Album.findByPk(id)
  if (!album) throw notFound('相册不存在')

  const photos = await Photo.findAll({
    where: { albumId: id },
    order: [['sort', 'ASC'], ['id', 'ASC']],
  })

  return { ...toAlbumJSON(album, photos.length), photos: photos.map((photo) => toPhotoJSON(photo)) }
}

/**
 * 新建相册。
 * @param {{ name: string, description?: string, cover?: string, sort?: number }} payload
 */
export async function createAlbum(payload) {
  const album = await Album.create({
    name: payload.name,
    description: payload.description ?? '',
    cover: payload.cover ?? '',
    sort: payload.sort ?? 0,
  })

  return toAlbumJSON(album, 0)
}

/**
 * 更新相册（未传字段保留原值）。
 * @param {number} id
 * @param {{ name: string, description?: string, cover?: string, sort?: number }} payload
 */
export async function updateAlbum(id, payload) {
  const album = await Album.findByPk(id)
  if (!album) throw notFound('相册不存在')

  await album.update({
    name: payload.name,
    description: payload.description ?? album.description,
    cover: payload.cover ?? album.cover,
    sort: payload.sort ?? album.sort,
  })

  const photoCount = await Photo.count({ where: { albumId: id } })

  return toAlbumJSON(album, photoCount)
}

/**
 * 删除相册：事务内连带删除照片记录。
 * @param {number} id
 */
export async function deleteAlbum(id) {
  const album = await Album.findByPk(id)
  if (!album) throw notFound('相册不存在')

  await sequelize.transaction(async (transaction) => {
    await Photo.destroy({ where: { albumId: id }, transaction })
    await album.destroy({ transaction })
  })

  return true
}

/**
 * 批量为相册添加照片（逐条 create 以拿到自增 id）。
 * @param {number} albumId
 * @param {Array<{ url: string, title?: string, description?: string, width?: number, height?: number, sort?: number }>} items
 */
export async function addPhotos(albumId, items) {
  const album = await Album.findByPk(albumId)
  if (!album) throw notFound('相册不存在')

  return sequelize.transaction(async (transaction) => {
    const created = []
    for (const item of items) {
      const photo = await Photo.create(
        {
          albumId,
          url: item.url,
          title: item.title ?? '',
          description: item.description ?? '',
          width: item.width ?? 0,
          height: item.height ?? 0,
          sort: item.sort ?? 0,
        },
        { transaction },
      )
      created.push(toPhotoJSON(photo))
    }

    return created
  })
}

/**
 * 更新照片信息。
 * @param {number} id
 * @param {{ url?: string, title?: string, description?: string, width?: number, height?: number, sort?: number }} payload
 */
export async function updatePhoto(id, payload) {
  const photo = await Photo.findByPk(id)
  if (!photo) throw notFound('照片不存在')

  const patch = {}
  for (const key of ['url', 'title', 'description', 'width', 'height', 'sort']) {
    if (payload[key] !== undefined) patch[key] = payload[key]
  }
  await photo.update(patch)

  return toPhotoJSON(photo)
}

/**
 * 删除照片。
 * @param {number} id
 */
export async function deletePhoto(id) {
  const photo = await Photo.findByPk(id)
  if (!photo) throw notFound('照片不存在')

  await photo.destroy()

  return true
}
