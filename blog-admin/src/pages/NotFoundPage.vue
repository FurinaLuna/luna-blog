<script setup lang="ts">
import { useRouter } from 'vue-router'
import status404 from '@/assets/status/404.svg'

const router = useRouter()

function goHome(): void {
  void router.replace('/dashboard')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4" style="background: var(--bg)">
    <div class="w-full max-w-[460px] text-center">
      <img :src="status404" alt="404" class="mx-auto w-full max-w-[280px] select-none" draggable="false" />
      <div class="mt-3 text-[20px] font-semibold text-[var(--text)]">页面走丢了</div>
      <p class="mt-2 text-[13px] leading-6 text-[var(--text-2)]">
        你访问的地址不存在，可能已被移动或删除。
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <el-button @click="router.back()">返回上一页</el-button>
        <el-button type="primary" @click="goHome">回到仪表盘</el-button>
      </div>
    </div>
  </div>
</template>
