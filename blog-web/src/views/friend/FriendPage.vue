<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useQuery } from '@pinia/colada'
import { ElMessage, type FormInstance, type FormItemRule, type FormRules } from 'element-plus'
import { Connection, Link, Plus } from '@element-plus/icons-vue'
import CoverImage from '@/components/common/CoverImage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { applyFriendLink, getFriendLinks } from '@/api/friend'

interface FriendForm {
  name: string
  url: string
  avatar: string
  description: string
}

const dialogOpen = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<FriendForm>({
  name: '',
  url: '',
  avatar: '',
  description: '',
})

const urlPlaceholder = 'https://example.com'
const avatarPlaceholder = 'https://example.com/avatar.png'

const urlRule: FormItemRule = {
  validator: (_rule, value: string, callback) => {
    if (!/^https?:\/\/[^\s]+$/i.test(value.trim())) {
      callback(new Error('请输入完整的网址，包含 http:// 或 https://'))
      return
    }
    callback()
  },
  trigger: 'blur',
}

const rules: FormRules<FriendForm> = {
  name: [
    { required: true, message: '请填写站点名称', trigger: 'blur' },
    { min: 1, max: 30, message: '站点名称长度为 1-30 个字符', trigger: 'blur' },
  ],
  url: [
    { required: true, message: '请填写站点地址', trigger: 'blur' },
    urlRule,
  ],
  description: [{ max: 100, message: '描述最多 100 个字符', trigger: 'blur' }],
}

const {
  data,
  isLoading,
  error,
  refetch,
} = useQuery({
  key: () => ['friend-links'],
  query: () => getFriendLinks(),
  staleTime: 5 * 60_000,
})

const friends = computed(() => data.value ?? [])

function openDialog(): void {
  dialogOpen.value = true
}

async function submit(): Promise<void> {
  const instance = formRef.value
  if (!instance) return
  const valid = await instance.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await applyFriendLink({
      name: form.name.trim(),
      url: form.url.trim(),
      avatar: form.avatar.trim() || undefined,
      description: form.description.trim() || undefined,
    })
    ElMessage.success('友链申请已提交，等待站长审核')
    form.name = ''
    form.url = ''
    form.avatar = ''
    form.description = ''
    dialogOpen.value = false
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <div class="container-page py-10">
    <header class="flex flex-wrap items-end justify-between gap-4 border-b pb-6" style="border-color: var(--border)">
      <div>
        <p class="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em]" style="color: var(--brand)">
          <el-icon :size="14"><Connection /></el-icon>
          Friends
        </p>
        <h1 class="mt-2 text-3xl font-bold sm:text-4xl">友链</h1>
        <p class="mt-2 text-sm" style="color: var(--text-2)">
          这些站点也在认真记录生活与代码，欢迎互相串门。
        </p>
      </div>
      <button type="button" class="btn btn-primary" @click="openDialog">
        <el-icon :size="15"><Plus /></el-icon>
        申请友链
      </button>
    </header>

    <div v-if="isLoading" class="mt-8">
      <SkeletonList variant="card" :count="6" />
    </div>

    <EmptyState
      v-else-if="error && friends.length === 0"
      class="mt-8"
      icon="error"
      title="友链加载失败"
      description="请稍后重试。"
      action-text="重新加载"
      @action="refetch"
    />

    <EmptyState
      v-else-if="friends.length === 0"
      class="mt-8"
      icon="inbox"
      title="还没有友链"
      description="成为第一个交换链接的人吧。"
      action-text="申请友链"
      @action="openDialog"
    />

    <div v-else class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <a
        v-for="friend in friends"
        :key="friend.id"
        :href="friend.url"
        target="_blank"
        rel="noopener noreferrer"
        class="card card-hover group flex items-start gap-3 p-4"
      >
        <div class="w-12 shrink-0">
          <CoverImage :src="friend.avatar" :alt="`${friend.name} 头像`" :seed="friend.name" ratio="1 / 1" rounded="rounded-full" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="flex items-center gap-1 text-sm font-semibold transition-colors group-hover:text-[var(--brand)]">
            <span class="truncate">{{ friend.name }}</span>
            <el-icon :size="12" class="shrink-0" style="color: var(--text-2)"><Link /></el-icon>
          </p>
          <p class="mt-1 line-clamp-2 text-xs leading-relaxed" style="color: var(--text-2)">
            {{ friend.description || '这个站点还没有写简介。' }}
          </p>
        </div>
      </a>
    </div>

    <el-dialog v-model="dialogOpen" title="申请友链" width="min(92vw, 480px)" align-center>
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent="submit">
        <el-form-item label="站点名称" prop="name">
          <el-input v-model="form.name" maxlength="30" placeholder="你的站点叫什么" />
        </el-form-item>
        <el-form-item label="站点地址" prop="url">
          <el-input v-model="form.url" maxlength="200" :placeholder="urlPlaceholder" />
        </el-form-item>
        <el-form-item label="头像地址（可选）" prop="avatar">
          <el-input v-model="form.avatar" maxlength="200" :placeholder="avatarPlaceholder" />
        </el-form-item>
        <el-form-item label="一句话简介（可选）" prop="description">
          <el-input v-model="form.description" maxlength="100" show-word-limit placeholder="你的站点在写什么" />
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" @click="dialogOpen = false">取消</button>
          <button type="button" class="btn btn-primary" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中…' : '提交申请' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>
