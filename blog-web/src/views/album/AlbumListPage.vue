<script setup lang="ts">
import { computed } from 'vue'
import { useQuery } from '@pinia/colada'
import CoverImage from '@/components/common/CoverImage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { getAlbums } from '@/api/album'

const { data, isLoading, error, refetch } = useQuery({
  key: () => ['albums'],
  query: () => getAlbums(),
  staleTime: 5 * 60_000,
})

const albums = computed(() => data.value ?? [])
const totalPhotos = computed(() => albums.value.reduce((sum, album) => sum + album.photoCount, 0))
</script>

<template>
  <div>
    <PageHeader
      title="相册"
      :subtitle="albums.length > 0 ? `${albums.length} 个相册 · ${totalPhotos} 张照片` : '光与影的存档'"
    />

    <div class="center_box">
      <div class="card album-panel">
        <SkeletonList v-if="isLoading" variant="card" :count="4" />

        <EmptyState
          v-else-if="error && albums.length === 0"
          icon="error"
          title="相册加载失败"
          description="请稍后重试。"
          action-text="重新加载"
          @action="refetch"
        />

        <EmptyState
          v-else-if="albums.length === 0"
          icon="image"
          title="还没有相册"
          description="第一组照片正在整理中。"
        />

        <div v-else class="album-grid">
          <RouterLink
            v-for="album in albums"
            :key="album.id"
            :to="`/albums/${album.id}`"
            class="album-card"
            :aria-label="`打开相册 ${album.name}`"
          >
            <CoverImage
              class="album-card__img"
              :src="album.cover"
              :alt="album.name"
              :seed="album.name"
              ratio="16 / 10"
              rounded="rounded-none"
              plain-fallback
            />
            <div class="album-card__mask" aria-hidden="true">
              <h2 class="album-card__name">{{ album.name }}</h2>
              <p class="album-card__desc">{{ album.description || `${album.photoCount} 张照片` }}</p>
            </div>
          </RouterLink>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.album-panel {
  padding: 1.2rem;
}
</style>
