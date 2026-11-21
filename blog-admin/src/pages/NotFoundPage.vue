<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Compass } from '@element-plus/icons-vue'

const router = useRouter()

function goHome(): void {
  void router.replace('/dashboard')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4" :style="{ background: 'var(--bg)' }">
    <div class="w-full max-w-[420px] text-center">
      <div class="text-[72px] font-bold leading-none tracking-tight" :style="{ color: 'var(--brand)' }">404</div>
      <div class="mt-4 flex items-center justify-center gap-2 text-[16px] font-semibold" :style="{ color: 'var(--text)' }">
        <el-icon><Compass /></el-icon>
        页面走丢了
      </div>
      <p class="mt-2 text-[13px] leading-6" :style="{ color: 'var(--text-2)' }">
        你访问的地址不存在，可能已被移动或删除。
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <el-button @click="router.back()">返回上一页</el-button>
        <el-button type="primary" @click="goHome">回到仪表盘</el-button>
      </div>
    </div>
  </div>
</template>
