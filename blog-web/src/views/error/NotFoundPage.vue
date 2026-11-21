<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const img404 = new URL('../../assets/svg/404.svg', import.meta.url).href
const countdown = ref(5)
let timer: ReturnType<typeof setInterval> | null = null

function goBack(): void {
  if (window.history.length > 1) {
    router.back()
    return
  }
  void router.push('/')
}

function goHome(): void {
  stopTimer()
  void router.push('/')
}

function stopTimer(): void {
  if (timer !== null) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(() => {
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      stopTimer()
      void router.push('/')
    }
  }, 1000)
})

onBeforeUnmount(() => {
  stopTimer()
})
</script>

<template>
  <div class="not-found">
    <img class="not-found__img" :src="img404" alt="404 页面不存在" />
    <h1 class="not-found__title">这一页走丢了</h1>
    <p class="not-found__desc">
      链接可能已经失效，或者你想访问的内容被移动到了别处。{{ countdown }} 秒后自动回到首页。
    </p>

    <div class="not-found__actions">
      <RouterLink to="/" class="apply-button">回到首页</RouterLink>
      <button type="button" class="btn btn-ghost" @click="goBack">返回上一页</button>
      <button type="button" class="not-found__skip" @click="goHome">立即返回</button>
    </div>
  </div>
</template>

<style scoped>
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 10rem);
  padding: 3rem 1.2rem;
  text-align: center;
}

.not-found__img {
  width: min(46vw, 320px);
  max-width: 100%;
  opacity: 0.95;
}

.not-found__code {
  margin-top: 0.4rem;
  color: var(--primary);
  font-size: clamp(3rem, 8vw, 5.5rem);
  font-weight: 800;
  line-height: 1;
  letter-spacing: 0.04em;
}

.not-found__title {
  margin-top: 0.6rem;
  color: var(--font-color);
  font-size: 1.4rem;
  font-weight: 600;
}

.not-found__desc {
  margin-top: 0.6rem;
  max-width: 30rem;
  color: var(--meta-color);
  font-size: 0.92rem;
  line-height: 1.8;
}

.not-found__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  margin-top: 1.6rem;
}

.not-found__skip {
  border: 0;
  background: transparent;
  color: var(--meta-color);
  font-size: 0.85rem;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 3px;
}

.not-found__skip:hover {
  color: var(--primary);
}
</style>
