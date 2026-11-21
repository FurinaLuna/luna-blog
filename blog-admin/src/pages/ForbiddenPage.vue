<script setup lang="ts">
import { useRouter } from 'vue-router'
import status403 from '@/assets/status/403.svg'

const router = useRouter()

function goHome(): void {
  void router.replace('/dashboard')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4" style="background: var(--bg)">
    <div class="w-full max-w-[460px] text-center">
      <img :src="status403" alt="403" class="mx-auto w-full max-w-[280px] select-none" draggable="false" />
      <div class="mt-3 text-[20px] font-semibold text-[var(--text)]">没有访问权限</div>
      <p class="mt-2 text-[13px] leading-6 text-[var(--text-2)]">
        当前账号没有访问该页面的权限，或需要先完成密码修改。
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <el-button @click="router.back()">返回上一页</el-button>
        <el-button type="primary" @click="goHome">回到仪表盘</el-button>
      </div>
    </div>
  </div>
</template>
