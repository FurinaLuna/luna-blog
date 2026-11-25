<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useQuery } from '@pinia/colada'
import { ElMessage, type FormInstance, type FormItemRule, type FormRules } from 'element-plus'
import CoverImage from '@/components/common/CoverImage.vue'
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

/** 介绍区文案（后台「站点配置 → 友链页」可改，留空时兜底） */
const introTitle = computed(() => site.friendsTitle)
const introContactLabel = computed(() => site.friendsContactLabel)
const introContact = computed(() => site.friendsContact)
const introTip = computed(() => site.friendsTip)
const introLink = computed(() => site.friendsLink || (typeof window === 'undefined' ? '' : window.location.origin))

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
        <h2 class="friend-intro__title">{{ introTitle }}</h2>

        <div class="friend-intro__rows">
          <p v-if="introLink" class="friend-intro__row">
            <span class="friend-intro__label">博客链接</span>
            <a class="friend-intro__link" :href="introLink" target="_blank" rel="noopener noreferrer">
              {{ introLink }}
            </a>
          </p>
          <p v-if="introContact" class="friend-intro__row">
            <span class="friend-intro__label">{{ introContactLabel }}</span>
            <span class="friend-intro__value">{{ introContact }}</span>
          </p>
        </div>

        <p class="friend-intro__tip">{{ introTip }}</p>

        <div class="friend-intro__actions">
          <button type="button" class="apply-button" @click="openDialog">友链申请</button>
        </div>
      </div>

      <SkeletonList v-if="isLoading" variant="card" :count="6" />

      <template v-else-if="friends.length > 0">
        <div class="friend-grid">
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
      </template>

      <p v-else-if="error" class="friend-relink">
        友链加载失败
        <button type="button" class="friend-relink__btn" @click="refetch()">重新加载</button>
      </p>
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
  padding: clamp(1.4rem, 3.2vw, 2.2rem) clamp(1.4rem, 4vw, 2.8rem);
}

.friend-intro__title {
  color: var(--font-color);
  font-size: clamp(1.35rem, 2.4vw, 1.7rem);
  font-weight: 700;
  line-height: 1.4;
}

.friend-intro__rows {
  margin-top: 1.1rem;
}

.friend-intro__row {
  display: flex;
  align-items: baseline;
  gap: 1rem;
  padding: 0.32rem 0;
  font-size: 0.95rem;
}

.friend-intro__label {
  flex: 0 0 auto;
  min-width: 4.5rem;
  color: var(--meta-color);
}

.friend-intro__value,
.friend-intro__link {
  color: var(--second-font-color);
  word-break: break-all;
}

.friend-intro__link {
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.25s ease;
}

.friend-intro__link:hover {
  color: var(--primary-ink);
}

.friend-intro__tip {
  margin-top: 1rem;
  color: var(--second-font-color);
  font-size: 0.92rem;
}

.friend-intro__actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 1.4rem;
}

.friend-relink {
  margin-top: 1.2rem;
  color: var(--meta-color);
  font-size: 0.9rem;
  text-align: center;
}

.friend-relink__btn {
  margin-left: 0.4rem;
  color: var(--primary-ink);
  text-decoration: underline;
  background: none;
  border: 0;
  cursor: pointer;
}

.friend-dialog__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

@media (max-width: 560px) {
  .friend-intro__row {
    flex-direction: column;
    gap: 0.2rem;
  }

  .friend-intro__label {
    min-width: 0;
  }

  .friend-intro__actions {
    justify-content: stretch;
  }

  .friend-intro__actions .apply-button {
    width: 100%;
  }
}
</style>
