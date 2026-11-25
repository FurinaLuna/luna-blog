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
import { getLocalTracks, getNeteaseTracks, getSongUrl, neteaseIdOf } from '@/api/music'
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
const listOpen = ref(false)
const volume = ref(stored.volume)
const currentKey = ref(stored.key)
const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const hovered = ref(false)

const urlCache = new Map<string, string>()
let audio: HTMLAudioElement | null = null
let failStreak = 0

const currentIndex = computed(() => {
  const index = tracks.value.findIndex((track) => track.key === currentKey.value)
  return index >= 0 ? index : 0
})
const current = computed<Track | null>(() => tracks.value[currentIndex.value] ?? null)
const progress = computed(() => (duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0))
const empty = computed(() => loaded.value && tracks.value.length === 0)
const sourceLabel = computed(() => (site.musicSource === 'netease' ? '网易云歌单' : '站内歌单'))

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

async function resolveUrl(track: Track): Promise<string | null> {
  if (track.url) return track.url
  const cached = urlCache.get(track.key)
  if (cached) return cached
  const id = neteaseIdOf(track.key)
  if (id === null) return null
  const url = await getSongUrl(id)
  if (url) urlCache.set(track.key, url)
  return url
}

async function loadTracks(): Promise<void> {
  if (!site.musicEnabled) return
  const list =
    site.musicSource === 'netease'
      ? await getNeteaseTracks(site.neteasePlaylistId)
      : await getLocalTracks()
  tracks.value = list
  loaded.value = true
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

  const url = await resolveUrl(track)
  if (!url) {
    failStreak += 1
    if (failStreak >= 3) {
      failStreak = 0
      isPlaying.value = false
      ElMessage.warning('暂时没有可播放的音源')
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
  if (open.value) listOpen.value = false
}

function handleDocumentClick(event: MouseEvent): void {
  if (!open.value) return
  const target = event.target as HTMLElement | null
  if (target?.closest('.music-ball') || target?.closest('.el-drawer')) return
  open.value = false
}

watch(volume, (value) => {
  if (audio) audio.volume = value
  persist()
})

watch(
  () => [site.musicEnabled, site.musicSource, site.neteasePlaylistId] as const,
  () => {
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
  audio.addEventListener('error', () => (isPlaying.value = false))
  document.addEventListener('click', handleDocumentClick)
  void site.ensureLoaded().then(() => loadTracks())
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
  if (!audio) return
  audio.pause()
  audio.src = ''
  audio = null
})
</script>

<template>
  <div
    v-if="site.musicEnabled"
    class="music-ball"
    :class="{ 'is-open': open, 'is-empty': empty }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
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

    <span v-if="hovered && current && !open" class="music-ball__tip">
      {{ current.name }}<template v-if="current.artist"> - {{ current.artist }}</template>
    </span>

    <transition name="music-card">
      <div v-if="open" class="music-card">
        <button type="button" class="music-card__close" aria-label="收起" @click="open = false">
          <el-icon :size="14"><Close /></el-icon>
        </button>

        <div class="music-card__head">
          <div class="music-card__cover" :class="{ 'is-spinning': isPlaying }">
            <CoverImage
              :src="current?.cover || ''"
              :alt="current?.name || '音乐'"
              :seed="current?.name || 'luna'"
              ratio="1 / 1"
              rounded="rounded-full"
            />
          </div>
          <div class="music-card__meta">
            <p class="music-card__name">{{ empty ? '暂无可用音源' : (current?.name ?? '音乐') }}</p>
            <p class="music-card__artist">
              {{ empty ? `来源：${sourceLabel}` : current?.artist || '未知歌手' }}
            </p>
          </div>
        </div>

        <template v-if="!empty">
          <input
            class="music-card__range"
            type="range"
            min="0"
            max="100"
            step="0.1"
            :value="progress"
            aria-label="播放进度"
            @input="seek"
          />
          <div class="music-card__times">
            <span>{{ formatTime(currentTime) }}</span>
            <span>{{ formatTime(duration) }}</span>
          </div>

          <div class="music-card__controls">
            <button type="button" class="music-card__ctrl" aria-label="上一首" @click="prev">
              <el-icon :size="16"><ArrowLeft /></el-icon>
            </button>
            <button
              type="button"
              class="music-card__ctrl music-card__ctrl--main"
              :aria-label="isPlaying ? '暂停' : '播放'"
              @click="togglePlay"
            >
              <el-icon :size="18">
                <component :is="isPlaying ? VideoPause : VideoPlay" />
              </el-icon>
            </button>
            <button type="button" class="music-card__ctrl" aria-label="下一首" @click="next">
              <el-icon :size="16"><ArrowRight /></el-icon>
            </button>
            <button
              type="button"
              class="music-card__ctrl music-card__ctrl--list"
              aria-label="播放列表"
              @click="listOpen = true"
            >
              <el-icon :size="16"><Headset /></el-icon>
            </button>
          </div>

          <div class="music-card__volume">
            <span>音量</span>
            <el-slider v-model="volume" :min="0" :max="1" :step="0.02" :show-tooltip="false" />
          </div>

          <p class="music-card__source">来源：{{ sourceLabel }} · 共 {{ tracks.length }} 首</p>
        </template>

        <p v-else class="music-card__hint">
          后台还没配置歌曲，或音源暂时不可用。
        </p>
      </div>
    </transition>

    <el-drawer v-model="listOpen" direction="btt" size="52%" title="播放列表">
      <p class="music-playlist__hint">共 {{ tracks.length }} 首 · 来源：{{ sourceLabel }}</p>
      <ul class="music-playlist">
        <li v-for="(track, index) in tracks" :key="track.key">
          <button
            type="button"
            class="music-playlist__item"
            :class="{ 'is-active': track.key === currentKey }"
            :aria-label="`播放 ${track.name}`"
            @click="playAt(index)"
          >
            <span class="music-playlist__index">{{ index + 1 }}</span>
            <span class="music-playlist__text">
              <span class="music-playlist__name">{{ track.name }}</span>
              <span class="music-playlist__artist">{{ track.artist }}</span>
            </span>
          </button>
        </li>
      </ul>
    </el-drawer>
  </div>
</template>

<style scoped>
.music-ball__tip {
  position: absolute;
  bottom: 50%;
  left: calc(100% + 10px);
  max-width: 220px;
  padding: 0.3rem 0.55rem;
  border-radius: 8px;
  background: rgb(15 23 42 / 88%);
  color: #fff;
  font-size: 0.75rem;
  line-height: 1.4;
  white-space: nowrap;
  transform: translateY(50%);
  pointer-events: none;
}

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

.music-card {
  position: absolute;
  bottom: 0;
  left: calc(100% + 12px);
  width: 268px;
  padding: 0.9rem 0.95rem 0.8rem;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--card-bg);
  box-shadow: var(--card-box-shadow);
}

.music-card__close {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: grid;
  width: 22px;
  height: 22px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--meta-color);
  cursor: pointer;
}

.music-card__close:hover {
  background: var(--bg-soft);
  color: var(--text);
}

.music-card__head {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.music-card__cover {
  width: 52px;
  height: 52px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 50%;
}

.music-card__cover.is-spinning {
  animation: music-disc-rotate 16s linear infinite;
}

.music-card__meta {
  min-width: 0;
}

.music-card__name {
  overflow: hidden;
  color: var(--text);
  font-size: 0.88rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-card__artist {
  overflow: hidden;
  color: var(--meta-color);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-card__range {
  width: 100%;
  margin: 0.7rem 0 0.15rem;
  accent-color: var(--primary);
  cursor: pointer;
}

.music-card__times {
  display: flex;
  justify-content: space-between;
  color: var(--meta-color);
  font-size: 0.7rem;
  font-variant-numeric: tabular-nums;
}

.music-card__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  margin: 0.35rem 0 0.5rem;
}

.music-card__ctrl {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: var(--bg-soft);
  color: var(--text-2);
  cursor: pointer;
  transition: all 0.2s ease;
}

.music-card__ctrl:hover {
  color: var(--primary-ink);
}

.music-card__ctrl--main {
  width: 38px;
  height: 38px;
  background: var(--primary);
  color: var(--on-primary);
}

.music-card__ctrl--main:hover {
  color: var(--on-primary);
  opacity: 0.9;
}

.music-card__ctrl--list {
  margin-left: 0.1rem;
}

.music-card__volume {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--meta-color);
  font-size: 0.72rem;
}

.music-card__volume :deep(.el-slider) {
  flex: 1;
}

.music-card__source,
.music-card__hint {
  margin-top: 0.55rem;
  color: var(--meta-color);
  font-size: 0.7rem;
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

.music-playlist__hint {
  margin: -0.6rem 0 0.8rem;
  color: var(--meta-color);
  font-size: 0.8rem;
}

.music-playlist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 1rem;
}

.music-playlist__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.7rem;
  padding: 0.45rem 0.5rem;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.music-playlist__item:hover {
  background: var(--bg-soft);
}

.music-playlist__item.is-active {
  background: var(--primary-soft);
}

.music-playlist__index {
  width: 18px;
  flex-shrink: 0;
  color: var(--meta-color);
  font-size: 0.78rem;
  text-align: center;
}

.music-playlist__text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.music-playlist__name {
  overflow: hidden;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-playlist__item.is-active .music-playlist__name {
  color: var(--primary-ink);
}

.music-playlist__artist {
  overflow: hidden;
  color: var(--meta-color);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 768px) {
  .music-card {
    left: calc(100% + 10px);
    width: min(258px, calc(100vw - 88px));
  }

  .music-ball__tip {
    display: none;
  }
}
</style>
