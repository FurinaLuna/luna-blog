<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { ArrowLeft, Picture } from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getAlbum } from '@/api/album'
import type { Photo } from '@/api/types'
import { formatDate } from '@/utils/format'

const route = useRoute()
const albumId = computed(() => Number(route.params.id))

const {
  data,
  isLoading,
  error,
} = useQuery({
  key: () => ['album', albumId.value],
  query: () => getAlbum(albumId.value),
  staleTime: 60_000,
})

const album = computed(() => data.value ?? null)

const photos = computed<Photo[]>(() => album.value?.photos ?? [])
const previewList = computed(() => photos.value.map((photo) => photo.url))

function photoRatio(photo: Photo): string {
  if (photo.width > 0 && photo.height > 0) {
    return `${photo.width} / ${photo.height}`
  }
  return '4 / 3'
}
</script>

<template>
  <div class="container-page py-10">
    <div v-if="isLoading" class="space-y-4">
      <SkeletonList variant="list" :count="1" />
      <SkeletonList variant="card" :count="4" />
    </div>

    <EmptyState
      v-else-if="error || !album"
      icon="image"
      title="相册不存在"
      description="它可能被删除，或者链接输入有误。"
      action-text="返回相册列表"
      @action="$router.push('/albums')"
    />

    <template v-else>
      <RouterLink to="/albums" class="inline-flex items-center gap-1.5 text-xs" style="color: var(--text-2)">
        <el-icon :size="13"><ArrowLeft /></el-icon>
        返回相册列表
      </RouterLink>

      <header class="mt-4 border-b pb-6" style="border-color: var(--border)">
        <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
          <el-icon :size="14"><Picture /></el-icon>
          Album
        </p>
        <h1 class="mt-2 text-3xl font-bold sm:text-4xl">{{ album.name }}</h1>
        <p v-if="album.description" class="mt-2 max-w-2xl text-sm leading-relaxed" style="color: var(--text-2)">
          {{ album.description }}
        </p>
        <p class="mt-3 text-xs" style="color: var(--text-2)">
          {{ album.photoCount }} 张照片 · {{ formatDate(album.createdAt) }}
        </p>
      </header>

      <EmptyState
        v-if="photos.length === 0"
        class="mt-8"
        icon="image"
        title="这个相册还没有照片"
        description="再等等，光正在被装进来。"
      />

      <div v-else class="mt-8 columns-2 gap-3 sm:columns-3 lg:columns-4">
        <figure
          v-for="(photo, index) in photos"
          :key="photo.id"
          class="mb-3 break-inside-avoid overflow-hidden rounded-xl border"
          style="border-color: var(--border); background: var(--card)"
        >
          <el-image
            :src="photo.url"
            :alt="photo.title || `${album.name} 第 ${index + 1} 张照片`"
            fit="cover"
            lazy
            :preview-src-list="previewList"
            :initial-index="index"
            preview-teleported
            class="w-full"
            :style="{ aspectRatio: photoRatio(photo) }"
          >
            <template #error>
              <div
                class="grid h-full w-full place-items-center text-xs"
                style="background: var(--bg-soft); color: var(--text-2)"
              >
                图片加载失败
              </div>
            </template>
          </el-image>
          <figcaption
            v-if="photo.title"
            class="px-3 py-2 text-xs leading-snug"
            style="color: var(--text-2)"
          >
            {{ photo.title }}
          </figcaption>
        </figure>
      </div>
    </template>
  </div>
</template>
