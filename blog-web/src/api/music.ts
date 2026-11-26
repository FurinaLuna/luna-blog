import axios from 'axios'
import { get } from './http'

/**
 * 音乐数据源：
 * - 站内歌单（musicSource = local）：走后端 `GET /api/music`
 * - 在线歌单（musicSource = netease）：走 Meting API（https://github.com/metowolf/Meting-API 的公益实例），
 *   一次请求即返回 歌名/歌手/封面/可直接播放的 url，无需自建服务；接口地址可在后台配置。
 * 所有失败都静默返回空数组，由播放器做降级展示。
 */
export const DEFAULT_METING_API = 'https://api.injahow.cn/meting/'

/** 统一后的曲目结构：站内与在线共用 */
export interface Track {
  /** 站内歌单用数据库 id；在线歌单用序号，统一成字符串便于比较 */
  key: string
  name: string
  artist: string
  album: string
  cover: string
  url: string
}

/** 站内歌单接口返回的结果 */
interface LocalMusicItem {
  id: number
  title: string
  artist?: string
  album?: string
  cover?: string
  url: string
  lrc?: string
}

/** Meting API 歌单项 */
interface MetingItem {
  name?: string
  artist?: string
  url?: string
  pic?: string
  lrc?: string
}

/** 站内歌单：失败返回空数组（后台没配歌 / 接口异常都走降级） */
export async function getLocalTracks(): Promise<Track[]> {
  try {
    const list = await get<LocalMusicItem[]>('/music', undefined, { silent: true })
    if (!Array.isArray(list)) return []
    return list
      .filter((item) => item && item.url)
      .map((item) => ({
        key: `local-${item.id}`,
        name: item.title || '未知歌曲',
        artist: item.artist || '未知歌手',
        album: item.album || '',
        cover: item.cover || '',
        url: item.url,
      }))
  } catch {
    return []
  }
}

/**
 * 在线歌单：调用 Meting API 拉取网易云歌单
 * @param playlistId 网易云歌单 id（后台可填）
 * @param apiBase Meting 接口地址，默认公益实例，可在后台改
 */
export async function getNeteaseTracks(
  playlistId: string,
  apiBase: string = DEFAULT_METING_API,
): Promise<Track[]> {
  const id = playlistId.trim()
  if (!id) return []
  const base = (apiBase || DEFAULT_METING_API).trim()
  try {
    const { data } = await axios.get<MetingItem[]>(base, {
      params: { server: 'netease', type: 'playlist', id },
      timeout: 9_000,
    })
    if (!Array.isArray(data)) return []
    return data
      .filter((item) => item && typeof item.url === 'string' && item.url.length > 0)
      .map((item, index) => ({
        key: `netease-${index}`,
        name: item.name || '未知歌曲',
        artist: item.artist || '未知歌手',
        album: '',
        cover: item.pic || '',
        url: item.url as string,
      }))
  } catch {
    return []
  }
}
