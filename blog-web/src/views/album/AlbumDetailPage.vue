<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useQuery } from '@pinia/colada'
import { ArrowLeft } from '@element-plus/icons-vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import Pagination from '@/components/common/Pagination.vue'
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

/** 每页 16 张（4 × 4），前端分页即可，相册总量有限 */
const PAGE_SIZE = 16
const page = ref(1)

const pagedPhotos = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return photos.value.slice(start, start + PAGE_SIZE)
})

const previewList = computed(() => pagedPhotos.value.map((photo) => photo.url))

function handlePageChange(next: number): void {
  page.value = next
  document.querySelector('.album-detail-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(
  () => albumId.value,
  () => {
    page.value = 1
  },
)

</script>

<template>
  <div>
    <PageHeader
      :title="album?.name ?? '相册'"
      :subtitle="album ? `${album.photoCount} 张照片 · ${formatDate(album.createdAt)}` : ''"
    />

    <div class="center_box">
      <div v-if="isLoading" class="card album-detail-card">
        <SkeletonList variant="card" :count="4" />
      </div>

      <div v-else-if="error || !album" class="card album-detail-card">
        <EmptyState
          icon="image"
          title="相册不存在"
          description="它可能被删除，或者链接输入有误。"
          action-text="返回相册列表"
          @action="$router.push('/albums')"
        />
      </div>

      <div v-else class="card album-detail-card">
        <div class="album-detail-head">
          <RouterLink to="/albums" class="album-detail-back">
            <el-icon :size="13"><ArrowLeft /></el-icon>
            返回相册列表
          </RouterLink>
          <p v-if="album.description" class="album-detail-desc">{{ album.description }}</p>
        </div>

        <EmptyState
          v-if="photos.length === 0"
          icon="image"
          title="这个相册还没有照片"
          description="再等等，光正在被装进来。"
        />

        <div v-else class="photo-wall">
          <div class="photo-grid">
            <figure v-for="(photo, index) in pagedPhotos" :key="photo.id" class="photo-item">
              <el-image
                :src="photo.url"
                :alt="photo.title || `${album.name} 第 ${index + 1} 张照片`"
                fit="cover"
                lazy
                :preview-src-list="previewList"
                :initial-index="index"
                preview-teleported
                class="photo-item__img"
              >
                <template #error>
                  <div class="photo-item__error">图片加载失败</div>
                </template>
              </el-image>
              <figcaption v-if="photo.title" class="photo-item__caption">
                {{ photo.title }}
              </figcaption>
            </figure>
          </div>

          <Pagination
            v-if="photos.length > PAGE_SIZE"
            class="album-detail-pagination"
            :page="page"
            :total="photos.length"
            :page-size="PAGE_SIZE"
            @update:page="handlePageChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.photo-item__error {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  color: var(--text-2);
  font-size: 0.86rem;
  background: var(--bg-soft);
}

.album-detail-card {
  padding: clamp(1.1rem, 3vw, 1.6rem);
}

.album-detail-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0 0.4rem 0.9rem;
}

.album-detail-back {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--meta-color);
  font-size: 0.85rem;
  transition: color 0.2s ease;
}

.album-detail-back:hover {
  color: var(--primary);
}

.album-detail-desc {
  color: var(--meta-color);
  font-size: 0.85rem;
}

.photo-wall {
  margin-top: 0.2rem;
}

.album-detail-pagination {
  margin-top: 1.1rem;
}
</style>
