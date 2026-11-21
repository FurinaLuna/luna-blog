<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { MdEditor } from 'md-editor-v3'
import PageHeader from '@/components/PageHeader.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { getSiteConfig, updateSiteConfig } from '@/api/siteConfig'
import { useThemeStore } from '@/stores/theme'
import type { SiteConfig, SocialLink } from '@/api/types'

const theme = useThemeStore()

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const loadFailed = ref(false)

const form = reactive<SiteConfig>({
  siteName: '',
  siteDescription: '',
  siteKeywords: '',
  author: '',
  avatar: '',
  email: '',
  github: '',
  announcement: '',
  heroTitle: '',
  heroSubtitle: '',
  about: '',
  footerText: '',
  icp: '',
  startDate: '',
  socialLinks: [],
  commentNeedReview: true,
})

const editorTheme = computed<'light' | 'dark'>(() => (theme.isDark ? 'dark' : 'light'))
const previewTheme = computed(() => (theme.isDark ? 'github' : 'vuepress'))
const codeTheme = computed(() => (theme.isDark ? 'atom' : 'github'))

function fillForm(data: SiteConfig): void {
  form.siteName = data.siteName ?? ''
  form.siteDescription = data.siteDescription ?? ''
  form.siteKeywords = data.siteKeywords ?? ''
  form.author = data.author ?? ''
  form.avatar = data.avatar ?? ''
  form.email = data.email ?? ''
  form.github = data.github ?? ''
  form.announcement = data.announcement ?? ''
  form.heroTitle = data.heroTitle ?? ''
  form.heroSubtitle = data.heroSubtitle ?? ''
  form.about = data.about ?? ''
  form.footerText = data.footerText ?? ''
  form.icp = data.icp ?? ''
  form.startDate = data.startDate ?? ''
  form.socialLinks = Array.isArray(data.socialLinks)
    ? data.socialLinks.map((link) => ({ name: link.name ?? '', url: link.url ?? '', icon: link.icon ?? '' }))
    : []
  form.commentNeedReview = data.commentNeedReview !== false
}

async function load(): Promise<void> {
  loading.value = true
  loadFailed.value = false
  try {
    fillForm(await getSiteConfig())
  } catch {
    loadFailed.value = true
  } finally {
    loading.value = false
  }
}

function addSocialLink(): void {
  form.socialLinks.push({ name: '', url: '', icon: '' })
}

function removeSocialLink(index: number): void {
  form.socialLinks.splice(index, 1)
}

function normalizeLinks(): SocialLink[] {
  return form.socialLinks
    .map((link) => ({ name: link.name.trim(), url: link.url.trim(), icon: link.icon.trim() }))
    .filter((link) => link.name && link.url)
}

async function save(): Promise<void> {
  if (!form.siteName.trim()) {
    activeTab.value = 'basic'
    ElMessage.warning('站点名称不能为空')
    return
  }

  saving.value = true
  try {
    await updateSiteConfig({
      siteName: form.siteName.trim(),
      siteDescription: form.siteDescription.trim(),
      siteKeywords: form.siteKeywords.trim(),
      author: form.author.trim(),
      avatar: form.avatar,
      email: form.email.trim(),
      github: form.github.trim(),
      announcement: form.announcement.trim(),
      heroTitle: form.heroTitle.trim(),
      heroSubtitle: form.heroSubtitle.trim(),
      about: form.about,
      footerText: form.footerText.trim(),
      icp: form.icp.trim(),
      startDate: form.startDate.trim(),
      socialLinks: normalizeLinks(),
      commentNeedReview: form.commentNeedReview,
    })
    ElMessage.success('站点配置已保存')
    await load()
  } catch {
    // 请求层已提示
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="page">
    <el-card shadow="never" class="admin-card admin-card--auto">
      <template #header>
        <PageHeader title="站点配置" description="博客前台展示的基础信息、首页文案与页脚">
          <el-button type="primary" :loading="saving" :disabled="loadFailed" @click="save">保存全部更改</el-button>
        </PageHeader>
      </template>

      <el-skeleton v-if="loading" :rows="8" animated />

      <el-result v-else-if="loadFailed" icon="error" title="配置加载失败" sub-title="请检查后端服务后重试">
        <template #extra>
          <el-button type="primary" @click="load">重试</el-button>
        </template>
      </el-result>

      <el-tabs v-else v-model="activeTab">
        <el-tab-pane label="基础信息" name="basic">
          <div class="max-w-[640px] pt-2">
            <el-form label-position="top">
              <div class="grid grid-cols-1 gap-x-5 md:grid-cols-2">
                <el-form-item label="站点名称" required>
                  <el-input v-model="form.siteName" placeholder="Luna Blog" maxlength="40" />
                </el-form-item>
                <el-form-item label="作者">
                  <el-input v-model="form.author" placeholder="站长的名字" maxlength="40" />
                </el-form-item>
              </div>
              <el-form-item label="站点描述">
                <el-input v-model="form.siteDescription" type="textarea" :rows="2" maxlength="160" show-word-limit placeholder="用于 SEO 与站点简介" />
              </el-form-item>
              <el-form-item label="站点关键词">
                <el-input v-model="form.siteKeywords" placeholder="多个关键词用英文逗号分隔" />
              </el-form-item>
              <div class="grid grid-cols-1 gap-x-5 md:grid-cols-2">
                <el-form-item label="邮箱">
                  <el-input v-model="form.email" placeholder="contact@example.com" />
                </el-form-item>
                <el-form-item label="GitHub">
                  <el-input v-model="form.github" placeholder="github.com/yourname" />
                </el-form-item>
              </div>
              <el-form-item label="头像">
                <ImageUpload v-model="form.avatar" :size="96" tip="建议 1:1，用于首页与页脚" />
              </el-form-item>
              <el-form-item label="站长公告">
                <el-input v-model="form.announcement" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="展示在首页的小公告，可留空" />
              </el-form-item>
              <el-form-item label="评论需要审核">
                <el-switch v-model="form.commentNeedReview" />
                <span class="ml-3 text-[12px] text-[var(--text-3)]">开启后前台新评论会进入待审核列表</span>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="首页 Hero" name="hero">
          <div class="max-w-[640px] pt-2">
            <el-form label-position="top">
              <el-form-item label="主标题">
                <el-input v-model="form.heroTitle" placeholder="在代码与星空之间" maxlength="60" />
              </el-form-item>
              <el-form-item label="副标题">
                <el-input v-model="form.heroSubtitle" type="textarea" :rows="2" maxlength="120" show-word-limit placeholder="一句话介绍这个博客" />
              </el-form-item>
            </el-form>
            <div class="mt-2 rounded border px-5 py-8 text-center" style="border-color: var(--border); background: var(--bg-soft)">
              <div class="text-[20px] font-semibold text-[var(--text)]">{{ form.heroTitle || '主标题预览' }}</div>
              <p class="mt-2 text-[13px] text-[var(--text-2)]">{{ form.heroSubtitle || '副标题预览' }}</p>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane label="关于页面" name="about">
          <div class="pt-2">
            <p class="mb-2 text-[12px] text-[var(--text-3)]">支持 Markdown，会渲染在博客「关于」页</p>
            <MdEditor
              v-model="form.about"
              :theme="editorTheme"
              :preview-theme="previewTheme"
              :code-theme="codeTheme"
              language="zh-CN"
              :toolbars-exclude="['github', 'save', 'catalog']"
              style="height: 56vh"
            />
          </div>
        </el-tab-pane>

        <el-tab-pane label="页脚" name="footer">
          <div class="max-w-[640px] pt-2">
            <el-form label-position="top">
              <el-form-item label="页脚文案">
                <el-input v-model="form.footerText" placeholder="保留所有权利 / 用 ❤️ 制作" maxlength="120" />
              </el-form-item>
              <div class="grid grid-cols-1 gap-x-5 md:grid-cols-2">
                <el-form-item label="ICP 备案号">
                  <el-input v-model="form.icp" placeholder="京ICP备xxxxxxxx号" />
                </el-form-item>
                <el-form-item label="建站日期">
                  <el-input v-model="form.startDate" placeholder="2024-01-01" />
                </el-form-item>
              </div>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="社交链接" name="social">
          <div class="max-w-[760px] pt-2">
            <p class="mb-3 text-[12px] text-[var(--text-3)]">图标填 emoji 或图标名（如 Github、Mail），会显示在页脚与关于页</p>
            <div
              v-for="(link, index) in form.socialLinks"
              :key="index"
              class="mb-2 flex items-end gap-2"
            >
              <el-input v-model="link.icon" class="w-[92px]!" placeholder="图标" maxlength="16" />
              <el-input v-model="link.name" class="w-[160px]!" placeholder="名称" maxlength="24" />
              <el-input v-model="link.url" class="flex-1" placeholder="example.com" />
              <el-button :icon="Delete" :disabled="form.socialLinks.length <= 1" @click="removeSocialLink(index)" />
            </div>
            <el-button :icon="Plus" class="mt-2" @click="addSocialLink">添加社交链接</el-button>
            <div v-if="form.socialLinks.length === 0" class="mt-2 text-[12px] text-[var(--text-3)]">
              还没有社交链接，点击上方按钮添加。
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>
