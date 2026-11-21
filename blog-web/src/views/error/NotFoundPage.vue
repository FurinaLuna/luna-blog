<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft, HomeFilled } from '@element-plus/icons-vue'

const router = useRouter()

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
    return
  }
  void router.push('/')
}
</script>

<template>
  <div class="container-page flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
    <p
      class="text-gradient-brand select-none text-[6rem] font-bold leading-none tracking-tight sm:text-[9rem]"
      aria-hidden="true"
    >
      404
    </p>

    <h1 class="mt-4 text-2xl font-bold sm:text-3xl">这一页走丢了</h1>
    <p class="mt-3 max-w-md text-sm leading-relaxed" style="color: var(--text-2)">
      链接可能已经失效，或者你想访问的内容被移动到了别处。回到有光的地方看看吧。
    </p>

    <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
      <RouterLink to="/" class="btn btn-primary">
        <el-icon :size="15"><HomeFilled /></el-icon>
        回到首页
      </RouterLink>
      <button type="button" class="btn btn-ghost" @click="goBack">
        <el-icon :size="15"><ArrowLeft /></el-icon>
        返回上一页
      </button>
    </div>
  </div>
</template>
