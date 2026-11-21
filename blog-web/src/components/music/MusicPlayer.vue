<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft, ArrowRight, Close, Headset, VideoPause, VideoPlay } from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import { getRecommendedSongs, getSongUrl } from '@/api/music'
import type { MusicSong } from '@/api/music'

interface StoredMusic {
  volume: number
  collapsed: boolean
  songId: number | null
}

const STORAGE_KEY = 'luna-music'

function readStored(): StoredMusic {
  const fallback: StoredMusic = { volume: 0.7, collapsed: true, songId: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return fallback
    const record = parsed as Record<string, unknown>
    const volume =
      typeof record.volume === 'number' && record.volume >= 0 && record.volume <= 1
        ? record.volume
        : fallback.volume
    return {
      volume,
      collapsed: typeof record.collapsed === 'boolean' ? record.collapsed : fallback.collapsed,
      songId: typeof record.songId === 'number' ? record.songId : null,
    }
  } catch {
    return fallback
  }
}

const stored = readStored()
const songs = ref<MusicSong[]>([])
const ready = ref(false)
const collapsed = ref(stored.collapsed)
const hovered = ref(false)
const volume = ref(stored.volume)
const currentId = ref<number | null>(stored.songId)
const isPlaying = ref(false)
const progress = ref(0)
const listOpen = ref(false)

const urlCache = new Map<number, string>()
let audio: HTMLAudioElement | null = null

const expanded = computed(() => !collapsed.value || hovered.value)

const currentIndex = computed(() => {
  const index = songs.value.findIndex((song) => song.id === currentId.value)
  return index >= 0 ? index : 0
})

const current = computed<MusicSong | null>(() => songs.value[currentIndex.value] ?? null)

function persist(): void {
  try {
    const state: StoredMusic = {
      volume: volume.value,
      collapsed: collapsed.value,
      songId: currentId.value,
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // localStorage 不可用时静默忽略
  }
}

async function ensureUrl(id: number): Promise<string | null> {
  const cached = urlCache.get(id)
  if (cached) return cached
  const url = await getSongUrl(id)
  if (url) urlCache.set(id, url)
  return url
}

function handleTimeUpdate(): void {
  if (!audio || !audio.duration) {
    progress.value = 0
    return
  }
  progress.value = (audio.currentTime / audio.duration) * 100
}

function handleEnded(): void {
  void next()
}

function handlePlay(): void {
  isPlaying.value = true
}

function handlePause(): void {
  isPlaying.value = false
}

function handleAudioError(): void {
  isPlaying.value = false
}

async function initialize(): Promise<void> {
  const list = await getRecommendedSongs()
  if (list.length === 0) return

  songs.value = list
  const preferred = stored.songId === null ? undefined : list.find((song) => song.id === stored.songId)
  const ordered = preferred ? [preferred, ...list.filter((song) => song.id !== preferred.id)] : list

  let chosen: MusicSong | null = null
  let chosenUrl: string | null = null
  for (const song of ordered.slice(0, 3)) {
    const url = await ensureUrl(song.id)
    if (url) {
      chosen = song
      chosenUrl = url
      break
    }
  }

  if (!chosen || !chosenUrl) return

  currentId.value = chosen.id
  if (audio) audio.src = chosenUrl
  ready.value = true
  persist()
}

async function playIndex(index: number): Promise<void> {
  const song = songs.value[index]
  if (!song || !audio) return

  const url = await ensureUrl(song.id)
  if (!url) {
    ElMessage.warning('这首暂时播放不了，换一首试试')
    return
  }

  currentId.value = song.id
  audio.src = url
  audio.volume = volume.value
  try {
    await audio.play()
  } catch {
    ElMessage.warning('播放失败，请稍后再试')
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
    await playIndex(currentIndex.value)
    return
  }
  try {
    await audio.play()
  } catch {
    await playIndex(currentIndex.value)
  }
}

async function next(): Promise<void> {
  if (songs.value.length === 0) return
  await playIndex((currentIndex.value + 1) % songs.value.length)
}

async function prev(): Promise<void> {
  if (songs.value.length === 0) return
  await playIndex((currentIndex.value - 1 + songs.value.length) % songs.value.length)
}

function togglePin(): void {
  collapsed.value = !collapsed.value
}

watch(volume, (value) => {
  if (audio) audio.volume = value
  persist()
})

watch(collapsed, persist)
watch(currentId, persist)

onMounted(() => {
  audio = new Audio()
  audio.preload = 'metadata'
  audio.volume = volume.value
  audio.addEventListener('timeupdate', handleTimeUpdate)
  audio.addEventListener('ended', handleEnded)
  audio.addEventListener('play', handlePlay)
  audio.addEventListener('pause', handlePause)
  audio.addEventListener('error', handleAudioError)
  void initialize()
})

onBeforeUnmount(() => {
  if (!audio) return
  audio.pause()
  audio.removeEventListener('timeupdate', handleTimeUpdate)
  audio.removeEventListener('ended', handleEnded)
  audio.removeEventListener('play', handlePlay)
  audio.removeEventListener('pause', handlePause)
  audio.removeEventListener('error', handleAudioError)
  audio.src = ''
  audio = null
})
</script>

<template>
  <!-- 无 /wapi 数据（songs 为空 / ready=false）时整体不渲染：保留原有降级行为 -->
  <div
    v-if="ready && current"
    class="music-player"
    :class="{ 'is-expanded': expanded }"
    @mouseenter="hovered = true"
    @mouseleave="hovered = false"
  >
    <button
      type="button"
      class="music-disc"
      :aria-label="isPlaying ? '暂停' : '播放'"
      :title="`${current.name} - ${current.artist}`"
      @click="togglePlay"
    >
      <span class="music-disc__inner" :class="isPlaying ? 'is-spinning' : 'is-paused'">
        <CoverImage
          :src="current.cover"
          :alt="`${current.name} 封面`"
          :seed="current.name"
          ratio="1 / 1"
          rounded="rounded-full"
        />
      </span>
    </button>

    <div class="music-info">
      <div class="music-info__text">
        <p class="music-info__name">{{ current.name }}</p>
        <p class="music-info__artist">{{ current.artist || '未知歌手' }}</p>
      </div>

      <button type="button" class="music-ctrl" aria-label="上一首" @click="prev">
        <el-icon :size="14"><ArrowLeft /></el-icon>
      </button>
      <button
        type="button"
        class="music-ctrl music-ctrl--main"
        :aria-label="isPlaying ? '暂停' : '播放'"
        @click="togglePlay"
      >
        <el-icon :size="16"><component :is="isPlaying ? VideoPause : VideoPlay" /></el-icon>
      </button>
      <button type="button" class="music-ctrl" aria-label="下一首" @click="next">
        <el-icon :size="14"><ArrowRight /></el-icon>
      </button>
      <button type="button" class="music-ctrl" aria-label="播放列表" @click="listOpen = true">
        <el-icon :size="14"><Headset /></el-icon>
      </button>
      <button
        type="button"
        class="music-ctrl"
        :aria-label="collapsed ? '固定展开播放器' : '收起播放器'"
        @click="togglePin"
      >
        <el-icon :size="14"><Close /></el-icon>
      </button>
    </div>

    <div class="music-progress" aria-hidden="true">
      <div class="music-progress__bar" :style="{ width: `${progress}%` }" />
    </div>

    <el-drawer v-model="listOpen" direction="btt" size="52%" title="播放列表">
      <p class="playlist-hint">共 {{ songs.length }} 首 · 来自网易云音乐推荐</p>
      <ul class="playlist">
        <li v-for="(song, index) in songs" :key="song.id">
          <button
            type="button"
            class="playlist-item"
            :class="{ 'is-active': song.id === currentId }"
            :aria-label="`播放 ${song.name}`"
            @click="playIndex(index)"
          >
            <span class="playlist-index">{{ index + 1 }}</span>
            <span class="playlist-text">
              <span class="playlist-name">{{ song.name }}</span>
              <span class="playlist-artist">{{ song.artist }}</span>
            </span>
          </button>
        </li>
      </ul>
      <div class="playlist-volume">
        <span>音量</span>
        <el-slider v-model="volume" :min="0" :max="1" :step="0.02" :show-tooltip="false" />
      </div>
    </el-drawer>
  </div>
</template>

<style scoped>
.music-player {
  width: 60px;
}

.music-player.is-expanded {
  width: 330px;
}

.music-ctrl--main {
  color: var(--music-main-active);
}

.playlist-hint {
  margin: -0.6rem 0 0.8rem;
  color: var(--meta-color);
  font-size: 0.8rem;
}

.playlist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 1rem;
}

.playlist-item {
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
  transition: background-color 0.2s ease;
}

.playlist-item:hover {
  background: var(--bg-soft);
}

.playlist-item.is-active {
  background: var(--primary-soft);
}

.playlist-index {
  width: 18px;
  flex-shrink: 0;
  color: var(--meta-color);
  font-size: 0.78rem;
  text-align: center;
}

.playlist-text {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.playlist-name {
  overflow: hidden;
  color: var(--text);
  font-size: 0.9rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-item.is-active .playlist-name {
  color: var(--primary);
}

.playlist-artist {
  overflow: hidden;
  color: var(--meta-color);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.playlist-volume {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0 0.5rem;
  color: var(--meta-color);
  font-size: 0.8rem;
}

.playlist-volume :deep(.el-slider) {
  flex: 1;
}

@media (max-width: 768px) {
  .music-player.is-expanded {
    width: 300px;
  }
}
</style>
