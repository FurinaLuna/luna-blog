import axios from 'axios'

/**
 * 音乐接口走 /wapi（由 vite 代理到网易云 API 服务）。
 * 全部静默失败：3 秒超时、无数据时返回空结果，由播放器整体隐藏。
 */
const wapi = axios.create({ baseURL: '/wapi', timeout: 3_000 })

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

interface SongUrlItem {
  id?: number
  url?: string | null
}

interface SongUrlResponse {
  code?: number
  data?: SongUrlItem[]
}

export function normalizeNewsong(item: RawNewsong): MusicSong | null {
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

/** 推荐歌单（20 首），失败返回空数组 */
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

/** 获取播放地址，失败/无版权返回 null */
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
