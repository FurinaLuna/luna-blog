<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { type FormInstance, type FormRules } from 'element-plus'
import { createMessage } from '@/api/message'
import { loadVisitor, saveVisitor } from '@/utils/visitor'
import { MESSAGE_COLORS } from './colors'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; submitted: [] }>()

interface MessageForm {
  nickname: string
  content: string
  color: string
}

const dialogWidth = 'min(480px, calc(100vw - 2.5rem))'

const visible = computed<boolean>({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const formRef = ref<FormInstance>()
const submitting = ref(false)
const visitor = loadVisitor()

const form = reactive<MessageForm>({
  nickname: visitor.nickname,
  content: '',
  color: MESSAGE_COLORS[0],
})

const rules: FormRules<MessageForm> = {
  nickname: [
    { required: true, message: '请填写昵称', trigger: 'blur' },
    { min: 1, max: 20, message: '昵称长度为 1-20 个字符', trigger: 'blur' },
  ],
  content: [
    { required: true, message: '请写点想说的话', trigger: 'blur' },
    { min: 2, max: 200, message: '留言长度为 2-200 个字符', trigger: 'blur' },
  ],
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return
    if (!form.nickname) form.nickname = loadVisitor().nickname
  },
)

async function submit(): Promise<void> {
  const instance = formRef.value
  if (!instance || submitting.value) return

  const valid = await instance.validate().catch(() => false)
  if (!valid) return

  submitting.value = true
  try {
    await createMessage({
      nickname: form.nickname.trim(),
      content: form.content.trim(),
      color: form.color,
    })
    saveVisitor({ nickname: form.nickname.trim(), email: '', website: '' })
    form.content = ''
    instance.clearValidate()
    visible.value = false
    emit('submitted')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    :width="dialogWidth"
    align-center
    title="发布留言"
    class="message-publish-dialog"
  >
    <p class="message-publish__hint">访客免登录 · 提交后需要站长审核通过，才会出现在留言墙上。</p>

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-position="top"
      class="message-publish__form"
      @submit.prevent="submit"
    >
      <el-form-item label="昵称" prop="nickname">
        <el-input v-model="form.nickname" :maxlength="20" show-word-limit placeholder="怎么称呼你" />
      </el-form-item>

      <el-form-item label="留言内容" prop="content">
        <el-input
          v-model="form.content"
          type="textarea"
          :rows="4"
          :maxlength="200"
          show-word-limit
          resize="none"
          placeholder="想对站长说点什么…"
        />
      </el-form-item>

      <el-form-item label="弹幕颜色">
        <div class="message-publish__colors" role="radiogroup" aria-label="选择弹幕颜色">
          <button
            v-for="color in MESSAGE_COLORS"
            :key="color"
            type="button"
            class="message-publish__color"
            :class="{ 'is-active': form.color === color }"
            :style="{ backgroundColor: color }"
            role="radio"
            :aria-checked="form.color === color"
            :aria-label="`选择颜色 ${color}`"
            @click="form.color = color"
          />
        </div>
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="message-publish__footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submit">提交留言</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<style scoped>
.message-publish__hint {
  margin-bottom: 0.6rem;
  color: var(--meta-color);
  font-size: 0.82rem;
  line-height: 1.6;
}

.message-publish__form :deep(.el-form-item) {
  margin-bottom: 0.4rem;
}

.message-publish__colors {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  height: 32px;
}

.message-publish__color {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 2px solid transparent;
  border-radius: 50%;
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08) inset;
  cursor: pointer;
  transition:
    transform 0.2s ease,
    border-color 0.2s ease;
}

.message-publish__color:hover {
  transform: scale(1.1);
}

.message-publish__color.is-active {
  border-color: var(--font-color);
  transform: scale(1.15);
}

.message-publish__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}
</style>
