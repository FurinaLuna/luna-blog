<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useQuery } from '@pinia/colada'
import { ElMessage, type FormInstance, type FormItemRule, type FormRules } from 'element-plus'
import CoverImage from '@/components/common/CoverImage.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import PageHeader from '@/components/common/PageHeader.vue'
import SkeletonList from '@/components/common/SkeletonList.vue'
import { applyFriendLink, getFriendLinks } from '@/api/friend'
import { useSiteStore } from '@/stores/site'

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

const site = useSiteStore()
const siteName = computed(() => site.siteName)
const siteDescription = computed(() => site.siteDescription)

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
  <div>
    <PageHeader title="友链" subtitle="这些站点也在认真记录生活与代码，欢迎互相串门" />

    <div class="center_box">
      <div class="card friend-intro">
        <h2 class="friend-intro__title">欢迎交换友链</h2>
        <div class="friend-intro__meta">
          <p class="friend-intro__row"><span class="friend-intro__label">本站名称</span><span>{{ siteName }}</span></p>
          <p class="friend-intro__row"><span class="friend-intro__label">本站简介</span><span>{{ siteDescription }}</span></p>
        </div>
        <p class="friend-intro__hint">申请前请先添加本站友链，审核通过后会尽快上线。</p>
        <button type="button" class="apply-button friend-intro__btn" @click="openDialog">
          申请友链
        </button>
      </div>

      <SkeletonList v-if="isLoading" variant="card" :count="6" />

      <EmptyState
        v-else-if="error && friends.length === 0"
        icon="error"
        title="友链加载失败"
        description="请稍后重试。"
        action-text="重新加载"
        @action="refetch"
      />

      <EmptyState
        v-else-if="friends.length === 0"
        icon="inbox"
        title="还没有友链"
        description="成为第一个交换链接的人吧。"
        action-text="申请友链"
        @action="openDialog"
      />

      <div v-else class="friend-grid">
        <a
          v-for="friend in friends"
          :key="friend.id"
          :href="friend.url"
          target="_blank"
          rel="noopener noreferrer"
          class="friend-card"
        >
          <div class="friend-card__inner">
            <CoverImage
              class="friend-card__avatar"
              :src="friend.avatar"
              :alt="`${friend.name} 头像`"
              :seed="friend.name"
              ratio="1 / 1"
              rounded="rounded-full"
            />
            <div class="friend-card__text">
              <p class="friend-card__name">{{ friend.name }}</p>
              <p class="friend-card__desc">{{ friend.description || '这个站点还没有写简介。' }}</p>
            </div>
          </div>
        </a>
      </div>
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
        <div class="friend-dialog__actions">
          <button type="button" class="btn btn-ghost" @click="dialogOpen = false">取消</button>
          <button type="button" class="apply-button" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中…' : '提交申请' }}
          </button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.friend-card__text {
  min-width: 0;
  flex: 1;
}

.friend-intro {
  padding: 2rem clamp(1.2rem, 4vw, 2.6rem);
  text-align: center;
}

.friend-intro__title {
  color: var(--font-color);
  font-size: 1.5rem;
  font-weight: 600;
}

.friend-intro__meta {
  margin: 1rem auto 0;
  max-width: 32rem;
}

.friend-intro__row {
  display: flex;
  gap: 0.8rem;
  padding: 0.2rem 0;
  color: var(--second-font-color);
  font-size: 0.92rem;
}

.friend-intro__label {
  flex: 0 0 5.5rem;
  color: var(--meta-color);
  text-align: right;
}

.friend-intro__hint {
  margin-top: 0.8rem;
  color: var(--meta-color);
  font-size: 0.85rem;
}

.friend-intro__btn {
  margin-top: 1.2rem;
}

.friend-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
</style>
