<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Lock } from '@element-plus/icons-vue'

const router = useRouter()

function goHome(): void {
  void router.replace('/dashboard')
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center px-4" :style="{ background: 'var(--bg)' }">
    <div class="w-full max-w-[420px] text-center">
      <div class="text-[72px] font-bold leading-none tracking-tight" :style="{ color: 'var(--brand)' }">403</div>
      <div class="mt-4 flex items-center justify-center gap-2 text-[16px] font-semibold" :style="{ color: 'var(--text)' }">
        <el-icon><Lock /></el-icon>
        没有访问权限
      </div>
      <p class="mt-2 text-[13px] leading-6" :style="{ color: 'var(--text-2)' }">
        当前账号没有访问该页面的权限，或需要先完成密码修改。
      </p>
      <div class="mt-6 flex items-center justify-center gap-3">
        <el-button @click="router.back()">返回上一页</el-button>
        <el-button type="primary" @click="goHome">回到仪表盘</el-button>
      </div>
    </div>
  </div>
</template>
