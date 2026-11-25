import axios from 'axios'
import { get } from './http'

/**
 * 音乐接口：
 * - 站内歌单（音乐来源 = local）：走后端 `GET /api/music`
 * - 网易云（音乐来源 = netease）：走 `/wapi`（由 vite 代理到 NeteaseCloudMusicApi）
 * 全部静默失败：3 秒超时、无数据时返回空结果，由播放器做降级展示。
 */
const wapi = axios.create({ baseURL: '/wapi', timeout: 3_000 })

/** 统一后的曲目结构：本地与网易云共用 */
export interface Track {
  /** 站内歌单用数据库 id；网易云用歌曲 id，统一转成字符串便于比较 */
  key: string
  name: string
  artist: string
  album: string
  cover: string
  /** 站内歌曲直接带可播放地址；网易云需再调 getSongUrl */
  url: string
}

/** 站内歌单接口返回的结构 */
interface LocalMusicItem {
  id: number
  title: string
  artist?: string
  album?: string
  cover?: string
  url: string
  lrc?: string
}

/** 网易云旧结构（保留给 /wapi 使用） */
export interface MusicSong {
  id: number
  name: string
  cover: string
  artist: string
  album: string
}

interface RawArtist {
  name?: string
}

interface RawSongDetail {
  id?: number
  name?: string
  artists?: RawArtist[]
  album?: { name?: string }
}

interface RawNewsong {
  id?: number
  name?: string
  picUrl?: string
  song?: RawSongDetail
}

interface NewsongResponse {
  code?: number
  result?: RawNewsong[]
}

interface RawPlaylistTrack {
  id?: number
  name?: string
  ar?: RawArtist[]
  al?: { name?: string; picUrl?: string }
}

interface PlaylistDetailResponse {
  code?: number
  playlist?: { tracks?: RawPlaylistTrack[] }
}

interface SongUrlItem {
  id?: number
  url?: string | null
}

interface SongUrlResponse {
  code?: number
  data?: SongUrlItem[]
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

function normalizeNewsong(item: RawNewsong): MusicSong | null {
  const detail = item.song
  const id = detail?.id ?? item.id
  const name = detail?.name ?? item.name
  if (typeof id !== 'number' || !name) return null

  const artist =
    detail?.artists
      ?.map((artistItem) => artistItem.name)
      .filter((artistName): artistName is string => Boolean(artistName))
      .join(' / ') || '未知歌手'

  return {
    id,
    name,
    cover: item.picUrl ?? '',
    artist,
    album: detail?.album?.name ?? '',
  }
}

/** 网易云：歌单曲目；未配置歌单 id 时退回「推荐新歌」 */
export async function getNeteaseTracks(playlistId: string): Promise<Track[]> {
  const id = playlistId.trim()
  if (id) {
    try {
      const { data } = await wapi.get<PlaylistDetailResponse>('/playlist/detail', { params: { id } })
      const tracks = data?.playlist?.tracks
      if (Array.isArray(tracks) && tracks.length > 0) {
        return tracks
          .filter((item): item is RawPlaylistTrack & { id: number; name: string } =>
            typeof item.id === 'number' && typeof item.name === 'string',
          )
          .map((item) => ({
            key: `netease-${item.id}`,
            name: item.name,
            artist: item.ar?.map((a) => a.name).filter(Boolean).join(' / ') || '未知歌手',
            album: item.al?.name ?? '',
            cover: item.al?.picUrl ?? '',
            url: '',
          }))
      }
    } catch {
      // 歌单拉取失败时继续尝试推荐新歌
    }
  }

  const songs = await getRecommendedSongs()
  return songs.map((song) => ({
    key: `netease-${song.id}`,
    name: song.name,
    artist: song.artist,
    album: song.album,
    cover: song.cover,
    url: '',
  }))
}

/** 网易云：推荐新歌（20 首），失败返回空数组 */
export async function getRecommendedSongs(): Promise<MusicSong[]> {
  try {
    const { data } = await wapi.get<NewsongResponse>('/personalized/newsong', { params: { limit: 20 } })
    if (!data || (data.code !== 200 && data.code !== 0) || !Array.isArray(data.result)) return []
    return data.result
      .map((item) => normalizeNewsong(item))
      .filter((song): song is MusicSong => song !== null)
  } catch {
    return []
  }
}

/** 网易云：取播放地址，失败或没有版权返回 null */
export async function getSongUrl(id: number): Promise<string | null> {
  try {
    const { data } = await wapi.get<SongUrlResponse>('/song/url', { params: { id } })
    if (!data || (data.code !== 200 && data.code !== 0) || !Array.isArray(data.data)) return null
    const url = data.data[0]?.url
    return typeof url === 'string' && url.length > 0 ? url : null
  } catch {
    return null
  }
}

/** 从统一曲目的 key 里取网易云歌曲 id */
export function neteaseIdOf(key: string): number | null {
  if (!key.startsWith('netease-')) return null
  const id = Number(key.slice('netease-'.length))
  return Number.isFinite(id) ? id : null
}
