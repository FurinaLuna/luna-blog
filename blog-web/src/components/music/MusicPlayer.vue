<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  ArrowLeft,
  ArrowRight,
  Close,
  Headset,
  VideoPause,
  VideoPlay,
} from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import { getPlaylistTracks } from '@/api/music'
import type { Track } from '@/api/music'
import { useSiteStore } from '@/stores/site'

interface StoredMusic {
  volume: number
  key: string
}

const STORAGE_KEY = 'luna-music'

function readStored(): StoredMusic {
  const fallback: StoredMusic = { volume: 0.7, key: '' }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const volume =
      typeof parsed.volume === 'number' && parsed.volume >= 0 && parsed.volume <= 1
        ? parsed.volume
        : fallback.volume
    return { volume, key: typeof parsed.key === 'string' ? parsed.key : '' }
  } catch {
    return fallback
  }
}

const site = useSiteStore()
const stored = readStored()

const tracks = ref<Track[]>([])
const loaded = ref(false)
const open = ref(false)
const volume = ref(stored.volume)
const currentKey = ref(stored.key)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)

let audio: HTMLAudioElement | null = null
let failStreak = 0

const currentIndex = computed(() => {
  const index = tracks.value.findIndex((track) => track.key === currentKey.value)
  return index >= 0 ? index : 0
})
const current = computed<Track | null>(() => tracks.value[currentIndex.value] ?? null)
const progress = computed(() => (duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0))
const empty = computed(() => loaded.value && tracks.value.length === 0)
/** 加载到了曲目但实际取不到可播地址（多见于公益 Meting 实例解析不了 QQ 音乐） */
const unplayable = ref(false)
const sourceLabel = computed(() =>
  site.musicServer === 'tencent' ? '在线歌单（QQ 音乐）' : '在线歌单（网易云）',
)

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume: volume.value, key: currentKey.value }))
  } catch {
    // 忽略隐私模式下的写入失败
  }
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '00:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** 站内曲目与在线曲目都自带可播地址，直接返回即可 */
function resolveUrl(track: Track): string | null {
  return track.url || null
}

async function loadTracks(): Promise<void> {
  if (!site.musicEnabled) return
  const playlistId = site.musicServer === 'tencent' ? site.qqPlaylistId : site.neteasePlaylistId
  const list = await getPlaylistTracks(site.musicServer, playlistId, site.musicApiBase)
  tracks.value = list
  loaded.value = true
  unplayable.value = false
  if (list.length === 0) return

  const preferred = list.find((track) => track.key === currentKey.value)
  currentKey.value = preferred?.key ?? list[0].key
  persist()
}

/** 播放指定曲目；连续 3 首取不到音源则停止并提示 */
async function playAt(index: number): Promise<void> {
  if (tracks.value.length === 0 || !audio) return
  const track = tracks.value[index]
  if (!track) return

  const url = resolveUrl(track)
  if (!url) {
    failStreak += 1
    if (failStreak >= 3) {
      failStreak = 0
      isPlaying.value = false
      ElMessage.warning(
        site.musicServer === 'tencent'
          ? '该 Meting 实例暂时取不到 QQ 音乐的播放地址，可到后台把接口地址换成国内实例'
          : '暂时没有可播放的音源',
      )
      return
    }
    await playAt((index + 1) % tracks.value.length)
    return
  }

  failStreak = 0
  currentKey.value = track.key
  currentTime.value = 0
  duration.value = 0
  audio.src = url
  audio.volume = volume.value
  try {
    await audio.play()
    unplayable.value = false
  } catch {
    isPlaying.value = false
  }
  persist()
}

async function togglePlay(): Promise<void> {
  if (!audio || !current.value) return
  if (isPlaying.value) {
    audio.pause()
    return
  }
  if (!audio.src) {
    await playAt(currentIndex.value)
    return
  }
  try {
    await audio.play()
  } catch {
    await playAt(currentIndex.value)
  }
}

async function next(): Promise<void> {
  if (tracks.value.length === 0) return
  await playAt((currentIndex.value + 1) % tracks.value.length)
}

async function prev(): Promise<void> {
  if (tracks.value.length === 0) return
  await playAt((currentIndex.value - 1 + tracks.value.length) % tracks.value.length)
}

function seek(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  if (!audio || !duration.value) return
  audio.currentTime = (value / 100) * duration.value
  currentTime.value = audio.currentTime
}

function handleTimeUpdate(): void {
  if (!audio) return
  currentTime.value = audio.currentTime
  duration.value = audio.duration || 0
}

function handleEnded(): void {
  void next()
}

function toggleCard(): void {
  open.value = !open.value
}

function handleDocumentClick(event: MouseEvent): void {
  if (!open.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.music-ball')) return
  open.value = false
}

watch(volume, (value) => {
  if (audio) audio.volume = value
  persist()
})

/** 真正停止播放：只隐藏播放器 DOM 不会暂停 <audio>，后台关掉音乐开关时会继续响 */
function stopPlayback(): void {
  if (!audio) return
  audio.pause()
  audio.removeAttribute('src')
  audio.load()
  isPlaying.value = false
  currentTime.value = 0
  duration.value = 0
}

watch(
  () =>
    [site.musicEnabled, site.musicServer, site.neteasePlaylistId, site.qqPlaylistId, site.musicApiBase] as const,
  ([enabled]) => {
    if (!enabled) {
      stopPlayback()
      return
    }
    void loadTracks()
  },
)

onMounted(() => {
  audio = new Audio()
  audio.preload = 'metadata'
  audio.volume = volume.value
  audio.addEventListener('timeupdate', handleTimeUpdate)
  audio.addEventListener('loadedmetadata', handleTimeUpdate)
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('play', () => (isPlaying.value = true))
  audio.addEventListener('pause', () => (isPlaying.value = false))
  audio.addEventListener('error', () => {
    isPlaying.value = false
    unplayable.value = true
  })
  document.addEventListener('click', handleDocumentClick)
  void site.ensureLoaded().then(() => loadTracks())
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  stopPlayback()
  audio = null
})
</script>

<template>
  <div
    v-if="site.musicEnabled"
    class="music-ball"
    :class="{ 'is-open': open, 'is-empty': empty }"
  >
    <button
      type="button"
      class="music-ball__trigger"
      :title="empty ? '暂无可用音源' : current ? `${current.name} - ${current.artist}` : '音乐'"
      :aria-label="open ? '收起播放器' : '展开播放器'"
      @click="toggleCard"
    >
      <span class="music-ball__disc" :class="{ 'is-spinning': isPlaying }">
        <img v-if="current?.cover" :src="current.cover" :alt="current.name" loading="lazy" />
        <el-icon v-else :size="18"><Headset /></el-icon>
      </span>
      <span v-if="isPlaying" class="music-ball__ring" :style="{ '--progress': `${progress}%` }" />
    </button>

    <div v-if="!open && current" class="music-ball__hint" aria-hidden="true">
      <span class="music-ball__hint-cover">
        <img v-if="current.cover" :src="current.cover" :alt="current.name" loading="lazy" />
        <el-icon v-else :size="18"><Headset /></el-icon>
      </span>
      <span class="music-ball__hint-text">
        <span class="music-ball__hint-name">{{ current.name }}</span>
        <span class="music-ball__hint-artist">{{ current.artist }}</span>
      </span>
      <el-icon class="music-ball__hint-icon" :size="15">
        <VideoPause v-if="isPlaying" />
        <VideoPlay v-else />
      </el-icon>
    </div>

    <transition name="music-card">
      <div v-if="open" class="music-panel" role="dialog" aria-label="音乐播放器">
        <header class="music-panel__top">
          <div class="music-panel__cover" :class="{ 'is-spinning': isPlaying }">
            <CoverImage
              :src="current?.cover || ''"
              :alt="current?.name || '音乐'"
              :seed="current?.name || 'luna'"
              ratio="1 / 1"
              rounded="rounded-full"
            />
          </div>
          <div class="music-panel__meta">
            <p class="music-panel__name">{{ empty ? '暂无可用音源' : (current?.name ?? '音乐') }}</p>
            <p class="music-panel__artist">
              {{ empty ? `来源：${sourceLabel}` : current?.artist || '未知歌手' }}
            </p>
          </div>
          <button type="button" class="music-panel__close" aria-label="收起" @click="open = false">
            <el-icon :size="14"><Close /></el-icon>
          </button>
        </header>

        <template v-if="!empty">
          <ul class="music-panel__list">
            <li v-for="(track, index) in tracks" :key="track.key">
              <button
                type="button"
                class="music-panel__item"
                :class="{ 'is-active': track.key === currentKey }"
                @click="playAt(index)"
              >
                <span class="music-panel__thumb">
                  <CoverImage
                    :src="track.cover || ''"
                    :alt="track.name"
                    :seed="track.name"
                    ratio="1 / 1"
                    rounded="rounded-lg"
                  />
                </span>
                <span class="music-panel__text">
                  <span class="music-panel__item-name">{{ track.name }}</span>
                  <span class="music-panel__item-artist">{{ track.artist || '未知歌手' }}</span>
                </span>
                <span v-if="track.key === currentKey && isPlaying" class="music-panel__eq" aria-hidden="true">
                  <i /><i /><i />
                </span>
              </button>
            </li>
          </ul>

          <footer class="music-panel__bar">
            <input
              class="music-panel__range"
              type="range"
              min="0"
              max="100"
              step="0.1"
              :value="progress"
              aria-label="播放进度"
              @input="seek"
            />
            <div class="music-panel__times">
              <span>{{ formatTime(currentTime) }}</span>
              <span>{{ formatTime(duration) }}</span>
            </div>

            <div class="music-panel__controls">
              <button type="button" class="music-panel__ctrl" aria-label="上一首" @click="prev">
                <el-icon :size="16"><ArrowLeft /></el-icon>
              </button>
              <button
                type="button"
                class="music-panel__ctrl music-panel__ctrl--main"
                :aria-label="isPlaying ? '暂停' : '播放'"
                @click="togglePlay"
              >
                <el-icon :size="18">
                  <component :is="isPlaying ? VideoPause : VideoPlay" />
                </el-icon>
              </button>
              <button type="button" class="music-panel__ctrl" aria-label="下一首" @click="next">
                <el-icon :size="16"><ArrowRight /></el-icon>
              </button>
              <div class="music-panel__volume">
                <el-slider v-model="volume" :min="0" :max="1" :step="0.02" :show-tooltip="false" />
              </div>
            </div>

            <p class="music-panel__source">来源：{{ sourceLabel }} · 共 {{ tracks.length }} 首</p>
            <p v-if="unplayable" class="music-panel__warn">
              {{
                site.musicServer === 'tencent'
                  ? '当前 Meting 实例取不到 QQ 音乐的播放地址：可到后台把接口地址换成国内实例，或先切回网易云。'
                  : '当前 Meting 实例暂时取不到播放地址，可稍后重试或更换接口地址。'
              }}
            </p>
          </footer>
        </template>

        <p v-else class="music-panel__hint">
          后台还没配置歌曲，或音源暂时不可用。
        </p>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.music-ball__disc {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  color: var(--primary-ink);
}

.music-ball__disc img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 悬停弹出的歌曲信息：圆形封面 + 歌名/歌手 + 播放状态图标 */
.music-ball__hint {
  position: absolute;
  bottom: 0;
  left: calc(100% + 10px);
  display: flex;
  gap: 0.6rem;
  align-items: center;
  max-width: 320px;
  padding: 0.45rem 0.7rem 0.45rem 0.45rem;
  border-radius: 12px;
  background: var(--card-bg);
  box-shadow: var(--card-box-shadow);
  opacity: 0;
  transform: translateX(-6px);
  pointer-events: none;
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.music-ball:hover .music-ball__hint,
.music-ball:focus-within .music-ball__hint {
  opacity: 1;
  transform: translateX(0);
}

.music-ball__hint-cover {
  display: grid;
  flex: none;
  width: 40px;
  height: 40px;
  place-items: center;
  overflow: hidden;
  border-radius: 50%;
  background: var(--primary-soft);
  color: var(--primary-ink);
}

.music-ball__hint-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.music-ball__hint-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.music-ball__hint-name {
  overflow: hidden;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-strong);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.music-ball__hint-artist {
  overflow: hidden;
  font-size: 0.78rem;
  color: var(--text-muted);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.music-ball__hint-icon {
  flex: none;
  margin-left: 0.2rem;
  color: var(--text);
}

.music-ball__disc.is-spinning {
  animation: music-disc-rotate 16s linear infinite;
}

.music-ball__ring {
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(
    var(--primary) var(--progress, 0%),
    transparent var(--progress, 0%)
  );
  mask: radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px));
  pointer-events: none;
}

@keyframes music-disc-rotate {
  to {
    transform: rotate(360deg);
  }
}

.music-panel {
  position: absolute;
  bottom: 0;
  left: calc(100% + 12px);
  display: flex;
  width: 300px;
  max-height: min(70vh, 520px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--card-bg);
  box-shadow: var(--card-box-shadow);
}

.music-panel__top {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.85rem 0.9rem 0.7rem;
  border-bottom: 1px solid var(--border);
}

.music-panel__cover {
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
}

.music-panel__cover.is-spinning {
  animation: music-disc-rotate 16s linear infinite;
}

.music-panel__meta {
  min-width: 0;
  flex: 1;
}

.music-panel__name {
  overflow: hidden;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-panel__artist {
  overflow: hidden;
  color: var(--meta-color);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-panel__close {
  display: grid;
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--meta-color);
  cursor: pointer;
}

.music-panel__close:hover {
  background: var(--bg-soft);
  color: var(--text);
}

.music-panel__list {
  display: flex;
  min-height: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding: 0.4rem 0.45rem;
  overflow-y: auto;
  scrollbar-width: thin;
}

.music-panel__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.6rem;
  padding: 0.35rem 0.45rem;
  border: 0;
  border-radius: 10px;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease;
}

.music-panel__item:hover {
  background: var(--bg-soft);
}

.music-panel__item.is-active {
  background: var(--primary-soft);
}

.music-panel__thumb {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 8px;
}

.music-panel__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.music-panel__item-name {
  overflow: hidden;
  color: var(--text);
  font-size: 0.84rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-panel__item.is-active .music-panel__item-name {
  color: var(--primary-ink);
}

.music-panel__item-artist {
  overflow: hidden;
  color: var(--meta-color);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-panel__eq {
  display: flex;
  height: 14px;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.music-panel__eq i {
  width: 2px;
  height: 6px;
  border-radius: 1px;
  background: var(--primary);
  animation: music-eq 0.9s ease-in-out infinite alternate;
}

.music-panel__eq i:nth-child(2) {
  height: 12px;
  animation-delay: 0.2s;
}

.music-panel__eq i:nth-child(3) {
  height: 9px;
  animation-delay: 0.4s;
}

@keyframes music-eq {
  from {
    transform: scaleY(0.4);
  }

  to {
    transform: scaleY(1);
  }
}

.music-panel__bar {
  flex-shrink: 0;
  padding: 0.6rem 0.9rem 0.75rem;
  border-top: 1px solid var(--border);
}

.music-panel__range {
  width: 100%;
  height: 4px;
  accent-color: var(--primary);
  cursor: pointer;
}

.music-panel__times {
  display: flex;
  justify-content: space-between;
  margin-top: 0.1rem;
  color: var(--meta-color);
  font-size: 0.68rem;
  font-variant-numeric: tabular-nums;
}

.music-panel__controls {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.45rem;
}

.music-panel__ctrl {
  display: grid;
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--bg-soft);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.music-panel__ctrl:hover {
  color: var(--primary-ink);
}

.music-panel__ctrl--main {
  width: 40px;
  height: 40px;
  background: var(--primary);
  color: var(--on-primary);
}

.music-panel__ctrl--main:hover {
  color: var(--on-primary);
  opacity: 0.9;
}

.music-panel__volume {
  min-width: 0;
  flex: 1;
}

.music-panel__volume :deep(.el-slider) {
  height: 22px;
}

.music-panel__source {
  margin-top: 0.35rem;
  color: var(--meta-color);
  font-size: 0.68rem;
}

.music-panel__warn {
  margin-top: 6px;
  font-size: 0.74rem;
  line-height: 1.5;
  color: #f0a020;
}
.music-panel__hint {
  padding: 0.4rem 0.9rem 0.9rem;
  color: var(--meta-color);
  font-size: 0.75rem;
  line-height: 1.5;
}

.music-card-enter-active,
.music-card-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.music-card-enter-from,
.music-card-leave-to {
  opacity: 0;
  transform: translateX(-6px) scale(0.98);
}

@media (max-width: 768px) {
  .music-panel {
    left: calc(100% + 10px);
    width: min(280px, calc(100vw - 88px));
    max-height: min(62vh, 460px);
  }
}
</style>
