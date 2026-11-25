import { Music } from '../../db/models/index.js'
import { notFound } from '../../core/errors.js'

/**
 * 序列化歌曲。
 * @param {Music} song
 */
function toMusicJSON(song) {
  const plain = song.get({ plain: true })

  return {
    id: plain.id,
    title: plain.title,
    artist: plain.artist,
    album: plain.album,
    cover: plain.cover,
    url: plain.url,
    lrc: plain.lrc,
    sort: plain.sort,
    enabled: plain.enabled,
  }
}

/** 前台歌单：只返回启用的，按排序值升序 */
export async function listMusic() {
  const rows = await Music.findAll({
    where: { enabled: true },
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })

  return rows.map((row) => toMusicJSON(row))
}

/** 后台歌单：含停用项 */
export async function listAdminMusic() {
  const rows = await Music.findAll({
    order: [
      ['sort', 'ASC'],
      ['id', 'ASC'],
    ],
  })

  return rows.map((row) => toMusicJSON(row))
}

/**
 * 新建歌曲。
 * @param {{ title: string, artist?: string, album?: string, cover?: string, url: string, lrc?: string, sort?: number, enabled?: boolean }} payload
 */
export async function createMusic(payload) {
  const song = await Music.create({
    title: payload.title,
    artist: payload.artist ?? '',
    album: payload.album ?? '',
    cover: payload.cover ?? '',
    url: payload.url,
    lrc: payload.lrc ?? '',
    sort: payload.sort ?? 0,
    enabled: payload.enabled ?? true,
  })

  return toMusicJSON(song)
}

/**
 * 更新歌曲（未传字段保留原值）。
 * @param {number} id
 */
export async function updateMusic(id, payload) {
  const song = await Music.findByPk(id)
  if (!song) throw notFound('歌曲不存在')

  await song.update({
    title: payload.title,
    artist: payload.artist ?? song.artist,
    album: payload.album ?? song.album,
    cover: payload.cover ?? song.cover,
    url: payload.url,
    lrc: payload.lrc ?? song.lrc,
    sort: payload.sort ?? song.sort,
    enabled: payload.enabled ?? song.enabled,
  })

  return toMusicJSON(song)
}

/**
 * 批量重排（拖拽排序后一次性提交）。
 * @param {Array<{ id: number, sort: number }>} items
 */
export async function reorderMusic(items) {
  await Promise.all(
    items.map((item) => Music.update({ sort: item.sort }, { where: { id: item.id } })),
  )

  return listAdminMusic()
}

/** 删除歌曲 */
export async function deleteMusic(id) {
  const song = await Music.findByPk(id)
  if (!song) throw notFound('歌曲不存在')

  await song.destroy()

  return true
}
