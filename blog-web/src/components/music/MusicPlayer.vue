<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
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
  const fallback: StoredMusic = { volume: 0.7, collapsed: false, songId: null }
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
const volume = ref(stored.volume)
const currentId = ref<number | null>(stored.songId)
const isPlaying = ref(false)
const progress = ref(0)
const listOpen = ref(false)

const urlCache = new Map<number, string>()
let audio: HTMLAudioElement | null = null

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

function expand(): void {
  collapsed.value = false
}

function collapse(): void {
  collapsed.value = true
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
  <div v-if="ready && current" class="music-player select-none">
    <button
      v-if="collapsed"
      type="button"
      class="disc-btn"
      aria-label="展开音乐播放器"
      @click="expand"
    >
      <span class="disc-cover" :class="{ 'is-spinning': isPlaying }">
        <CoverImage
          :src="current.cover"
          :alt="`${current.name} 封面`"
          :seed="current.name"
          ratio="1 / 1"
          rounded="rounded-full"
        />
      </span>
      <span class="disc-hole" aria-hidden="true" />
    </button>

    <div v-else class="card mini-bar">
      <div class="progress-track" aria-hidden="true">
        <div class="progress-fill" :style="{ width: `${progress}%` }" />
      </div>

      <div class="flex items-center gap-2.5 px-2.5 pb-1 pt-3">
        <button
          type="button"
          class="cover-btn"
          :aria-label="isPlaying ? '暂停' : '播放'"
          @click="togglePlay"
        >
          <CoverImage
            :src="current.cover"
            :alt="`${current.name} 封面`"
            :seed="current.name"
            ratio="1 / 1"
            rounded="rounded-lg"
          />
          <span class="cover-mask">
            <svg v-if="isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5Z" />
            </svg>
          </span>
        </button>

        <div class="min-w-0 flex-1">
          <p class="truncate text-[13px] font-semibold leading-snug">{{ current.name }}</p>
          <p class="truncate text-[11px] leading-snug" style="color: var(--text-2)">{{ current.artist }}</p>
        </div>

        <div class="flex shrink-0 items-center">
          <button type="button" class="ctrl-btn" aria-label="上一首" @click="prev">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M7 5h2v14H7z" />
              <path d="M20 6.2v11.6a1 1 0 0 1-1.55.83L10 13.4v4.6a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v4.6l8.45-5.23A1 1 0 0 1 20 6.2Z" />
            </svg>
          </button>
          <button type="button" class="ctrl-btn ctrl-main" :aria-label="isPlaying ? '暂停' : '播放'" @click="togglePlay">
            <svg v-if="isPlaying" width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
            <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M8 5.5v13a1 1 0 0 0 1.5.86l10-6.5a1 1 0 0 0 0-1.72l-10-6.5A1 1 0 0 0 8 5.5Z" />
            </svg>
          </button>
          <button type="button" class="ctrl-btn" aria-label="下一首" @click="next">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M15 5h2v14h-2z" />
              <path d="M4 6.2v11.6a1 1 0 0 0 1.55.83L14 13.4v4.6a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v4.6L5.55 5.37A1 1 0 0 0 4 6.2Z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="flex items-center gap-1.5 px-2 pb-1.5">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="color: var(--text-2)">
          <path d="M4 9v6h4l5 4V5L8 9H4Z" />
          <path d="M16.5 8.5a4.5 4.5 0 0 1 0 7v-1.8a2.7 2.7 0 0 0 0-3.4V8.5Z" />
        </svg>
        <el-slider
          v-model="volume"
          class="music-volume"
          :min="0"
          :max="1"
          :step="0.02"
          :show-tooltip="false"
          size="small"
          aria-label="音量"
        />
        <span class="w-6 text-right text-[10px] tabular-nums" style="color: var(--text-2)">
          {{ Math.round(volume * 100) }}
        </span>
        <button type="button" class="ctrl-btn ml-auto" aria-label="打开播放列表" @click="listOpen = true">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
            <path d="M4 6h11M4 12h11M4 18h7" />
            <path d="M18 10v7.5a2.5 2.5 0 1 0 1 2V8l3-1" />
          </svg>
        </button>
        <button type="button" class="ctrl-btn" aria-label="收起播放器" @click="collapse">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
    </div>

    <el-drawer
      v-model="listOpen"
      direction="btt"
      size="52%"
      title="播放列表"
      class="music-drawer"
    >
      <p class="-mt-2 mb-3 text-xs" style="color: var(--text-2)">
        共 {{ songs.length }} 首 · 来自网易云音乐推荐
      </p>
      <ul class="space-y-1 pb-4">
        <li v-for="(song, index) in songs" :key="song.id">
          <button
            type="button"
            class="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors"
            :class="song.id === currentId ? 'bg-[var(--brand-soft)]' : 'hover:bg-[var(--bg-soft)]'"
            :aria-label="`播放 ${song.name}`"
            @click="playIndex(index)"
          >
            <span class="w-5 shrink-0 text-center text-xs tabular-nums" style="color: var(--text-2)">
              {{ index + 1 }}
            </span>
            <span class="min-w-0 flex-1">
              <span class="block truncate text-sm font-medium" :style="song.id === currentId ? { color: 'var(--brand)' } : undefined">
                {{ song.name }}
              </span>
              <span class="block truncate text-xs" style="color: var(--text-2)">{{ song.artist }}</span>
            </span>
            <svg
              v-if="song.id === currentId && isPlaying"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              style="color: var(--brand)"
            >
              <rect x="4" y="10" width="3" height="8" rx="1" />
              <rect x="10.5" y="5" width="3" height="13" rx="1" />
              <rect x="17" y="12" width="3" height="6" rx="1" />
            </svg>
          </button>
        </li>
      </ul>
    </el-drawer>
  </div>
</template>

<style scoped>
.music-player {
  width: clamp(272px, 82vw, 332px);
}

.mini-bar {
  position: relative;
  overflow: hidden;
  padding: 0;
}

.progress-track {
  position: absolute;
  inset: 0 0 auto;
  height: 3px;
  background: var(--border);
}

.progress-fill {
  height: 100%;
  background: var(--brand);
  transition: width 0.4s linear;
}

.cover-btn {
  position: relative;
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  overflow: hidden;
  border-radius: 9px;
  border: 1px solid var(--border);
}

.cover-mask {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.38);
  opacity: 0;
  transition: opacity 0.16s ease;
}

.cover-btn:hover .cover-mask,
.cover-btn:focus-visible .cover-mask {
  opacity: 1;
}

.ctrl-btn {
  display: inline-grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: var(--text-2);
  transition: color 0.15s ease, background-color 0.15s ease;
}

.ctrl-btn:hover,
.ctrl-btn:focus-visible {
  color: var(--brand);
  background: var(--brand-soft);
}

.ctrl-main {
  color: var(--text);
}

.music-volume {
  width: 62px;
  margin: 0 2px;
}

.music-volume :deep(.el-slider__runway) {
  height: 4px;
}

.music-volume :deep(.el-slider__bar) {
  height: 4px;
}

.music-volume :deep(.el-slider__button) {
  width: 10px;
  height: 10px;
  border-width: 1px;
}

.disc-btn {
  position: relative;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: var(--card);
  box-shadow: var(--shadow);
  transition: transform 0.18s ease, border-color 0.18s ease;
}

.disc-btn:hover,
.disc-btn:focus-visible {
  transform: translateY(-2px);
  border-color: var(--brand);
}

.disc-cover {
  display: block;
  width: 44px;
  height: 44px;
  border-radius: 999px;
  overflow: hidden;
}

.disc-cover.is-spinning {
  animation: disc-spin 9s linear infinite;
}

.disc-hole {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--card);
  box-shadow: inset 0 0 0 1px var(--border);
}

@keyframes disc-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .disc-cover.is-spinning {
    animation: none;
  }
}
</style>
