import axios from 'axios'

/**
 * 音乐数据源：在线歌单走 Meting API（https://github.com/metowolf/Meting-API 的公益实例），
 * 一次请求即返回 歌名/歌手/封面/可直接播放的 url，无需自建服务；接口地址可在后台配置。
 * 失败静默返回空数组，由播放器做降级展示。
 */
export const DEFAULT_METING_API = 'https://api.injahow.cn/meting/'

/** 统一后的曲目结构 */
export interface Track {
  /** 在线歌单用序号，统一成字符串便于比较 */
  key: string
  name: string
  artist: string
  album: string
  cover: string
  url: string
}

/** Meting API 歌单项 */
interface MetingItem {
  name?: string
  artist?: string
  url?: string
  pic?: string
  lrc?: string
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
