<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@pinia/colada'
import { Picture } from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getAlbums } from '@/api/album'
import { formatDate } from '@/utils/format'

const { data, isLoading, error, refetch } = useQuery({
  key: () => ['albums'],
  query: () => getAlbums(),
  staleTime: 5 * 60_000,
})

const albums = computed(() => data.value ?? [])
const totalPhotos = computed(() => albums.value.reduce((sum, album) => sum + album.photoCount, 0))
</script>

<template>
  <div class="container-page py-10">
    <header class="border-b pb-6" style="border-color: var(--border)">
      <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
        <el-icon :size="14"><Picture /></el-icon>
        Albums
      </p>
      <h1 class="mt-2 text-3xl font-bold sm:text-4xl">相册</h1>
      <p class="mt-2 text-sm" style="color: var(--text-2)">
        {{ albums.length }} 个相册，{{ totalPhotos }} 张照片。光与影的存档。
      </p>
    </header>

    <div v-if="isLoading" class="mt-8">
      <SkeletonList variant="card" :count="6" />
    </div>

    <EmptyState
      v-else-if="error && albums.length === 0"
      class="mt-8"
      icon="error"
      title="相册加载失败"
      description="请稍后重试。"
      action-text="重新加载"
      @action="refetch"
    />

    <EmptyState
      v-else-if="albums.length === 0"
      class="mt-8"
      icon="image"
      title="还没有相册"
      description="第一组照片正在整理中。"
    />

    <div v-else class="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="album in albums"
        :key="album.id"
        :to="`/albums/${album.id}`"
        class="card card-hover group overflow-hidden"
        :aria-label="`打开相册 ${album.name}`"
      >
        <div class="relative">
          <CoverImage :src="album.cover" :alt="album.name" :seed="album.name" ratio="4 / 3" rounded="rounded-none" />
          <div
            class="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/65 via-black/10 to-transparent p-4"
          >
            <h2 class="text-base font-bold text-white">{{ album.name }}</h2>
            <p class="mt-0.5 text-xs text-white/80">{{ album.photoCount }} 张照片</p>
          </div>
        </div>
        <div class="p-4">
          <p class="line-clamp-2 min-h-[2.5rem] text-xs leading-relaxed" style="color: var(--text-2)">
            {{ album.description || '没有描述，直接看图吧。' }}
          </p>
          <p class="mt-2 text-[11px]" style="color: var(--text-2)">{{ formatDate(album.createdAt) }}</p>
        </div>
      </RouterLink>
    </div>
  </div>
</template>
