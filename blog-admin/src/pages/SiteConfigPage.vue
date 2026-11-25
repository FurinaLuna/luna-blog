<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete, Plus } from '@element-plus/icons-vue'
import { MdEditor } from 'md-editor-v3'
import PageHeader from '@/components/PageHeader.vue'
import ImageUpload from '@/components/ImageUpload.vue'
import { getSiteConfig, updateSiteConfig } from '@/api/siteConfig'
import { useThemeStore } from '@/stores/theme'
import type { PageBannerKey, PageBanners, SiteConfig, SocialLink } from '@/api/types'

const theme = useThemeStore()

const loading = ref(false)
const saving = ref(false)
const activeTab = ref('basic')
const loadFailed = ref(false)

/** 页面横幅的展示顺序与中文名（键固定，与后端 pageBanners 一致） */
const PAGE_BANNER_ITEMS: ReadonlyArray<{ key: PageBannerKey; label: string }> = [
  { key: 'home', label: '首页 Hero' },
  { key: 'archives', label: '时间轴' },
  { key: 'categories', label: '分类总览' },
  { key: 'category', label: '分类详情' },
  { key: 'tags', label: '标签总览' },
  { key: 'tag', label: '标签详情' },
  { key: 'article', label: '文章详情' },
  { key: 'talks', label: '说说' },
  { key: 'albums', label: '相册列表' },
  { key: 'album', label: '相册详情' },
  { key: 'resources', label: '资源' },
  { key: 'friends', label: '友链' },
  { key: 'message', label: '留言墙' },
  { key: 'about', label: '关于' },
  { key: 'search', label: '搜索' },
]

/** 页面横幅的空值（15 个键全量，避免表单里出现 undefined） */
const EMPTY_PAGE_BANNERS: PageBanners = {
  home: '',
  archives: '',
  categories: '',
  category: '',
  tags: '',
  tag: '',
  article: '',
  talks: '',
  albums: '',
  album: '',
  resources: '',
  friends: '',
  message: '',
  about: '',
  search: '',
}

/** 横幅默认取景位置（30% 偏上，兼顾上沿留白与画面中部） */
const DEFAULT_BANNER_FOCUS = 30

/** 卡片上移滑块上限：拉满 = 贴着横幅下沿 */
const MAX_CARD_OFFSET = 200

/** 15 个页面内容卡片的默认上移量：首页满屏 Hero 不动，其余页面默认拉满 */
const EMPTY_PAGE_CARD_OFFSETS: Record<string, number> = Object.fromEntries(
  PAGE_BANNER_ITEMS.map((item) => [item.key, item.key === 'home' ? 0 : MAX_CARD_OFFSET]),
)

/** 15 个页面横幅的默认取景位置 */
const EMPTY_PAGE_POSITIONS: Record<string, number> = Object.fromEntries(
  PAGE_BANNER_ITEMS.map((item) => [item.key, DEFAULT_BANNER_FOCUS]),
)

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
  messageNeedReview: true,
  danmakuSpeed: 180,
  meteorCount: 34,
  friendsTitle: '',
  friendsLink: '',
  friendsContactLabel: 'QQ',
  friendsContact: '',
  friendsTip: '',
  profileBanner: '',
  favicon: '',
  adminLoginBg: '',
  pageBanners: { ...EMPTY_PAGE_BANNERS },
  pageBannerPositions: { ...EMPTY_PAGE_POSITIONS },
  pageCardOffsets: { ...EMPTY_PAGE_CARD_OFFSETS },
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
  form.profileBanner = data.profileBanner ?? ''
  form.favicon = data.favicon ?? ''
  form.adminLoginBg = data.adminLoginBg ?? ''
  form.friendsTitle = data.friendsTitle ?? ''
  form.friendsLink = data.friendsLink ?? ''
  form.friendsContactLabel = data.friendsContactLabel ?? 'QQ'
  form.friendsContact = data.friendsContact ?? ''
  form.friendsTip = data.friendsTip ?? ''

  form.socialLinks = Array.isArray(data.socialLinks)
    ? data.socialLinks.map((link) => ({
        name: link.name ?? '',
        url: link.url ?? '',
        icon: link.icon ?? '',
        qrcode: link.qrcode ?? '',
      }))
    : []
  form.commentNeedReview = data.commentNeedReview !== false
  form.messageNeedReview = data.messageNeedReview !== false
  form.danmakuSpeed = typeof data.danmakuSpeed === 'number' ? data.danmakuSpeed : 180
  form.meteorCount = typeof data.meteorCount === 'number' ? data.meteorCount : 34
  form.pageBanners = normalizeBanners(data.pageBanners)
  form.pageBannerPositions = normalizePositions(data.pageBannerPositions)
  form.pageCardOffsets = normalizeCardOffsets(data.pageCardOffsets)
}

/** 用后端返回值补齐 13 个横幅键，缺的键补空串 */
function normalizeBanners(
  source: Partial<Record<PageBannerKey, string>> | null | undefined,
): PageBanners {
  const next: PageBanners = { ...EMPTY_PAGE_BANNERS }
  for (const item of PAGE_BANNER_ITEMS) {
    const value = source?.[item.key]
    next[item.key] = typeof value === 'string' ? value : ''
  }
  return next
}

/** 保存时只提交这 13 个键，过滤未知键并去掉首尾空白 */
/** 补齐 15 个取景位置，缺省用 30% */
function normalizePositions(
  source: Record<string, number> | null | undefined,
): Record<string, number> {
  const next: Record<string, number> = { ...EMPTY_PAGE_POSITIONS }
  for (const item of PAGE_BANNER_ITEMS) {
    const value = source?.[item.key]
    next[item.key] =
      typeof value === 'number' && Number.isFinite(value)
        ? Math.min(100, Math.max(0, Math.round(value)))
        : DEFAULT_BANNER_FOCUS
  }
  return next
}

/** 补齐 15 个卡片上移量：首页缺省 0，其余页面缺省拉满（200） */
function normalizeCardOffsets(raw: Record<string, number> | undefined): Record<string, number> {
  const next: Record<string, number> = { ...EMPTY_PAGE_CARD_OFFSETS }
  for (const item of PAGE_BANNER_ITEMS) {
    const value = raw?.[item.key]
    next[item.key] =
      typeof value === 'number' && Number.isFinite(value)
        ? Math.min(MAX_CARD_OFFSET, Math.max(0, Math.round(value)))
        : item.key === 'home'
          ? 0
          : MAX_CARD_OFFSET
  }
  return next
}

/** 保存时首页固定 0（首页无内容卡片），其余页面照表单值 */
function collectCardOffsets(): Record<string, number> {
  const out: Record<string, number> = {}
  for (const item of PAGE_BANNER_ITEMS) {
    // 首页没有内容卡片，固定 0
    if (item.key === 'home') {
      out[item.key] = 0
      continue
    }
    const value = form.pageCardOffsets[item.key]
    out[item.key] =
      typeof value === 'number' ? Math.min(MAX_CARD_OFFSET, Math.max(0, Math.round(value))) : 0
  }
  return out
}

function collectPositions(): Record<string, number> {
  const next: Record<string, number> = {}
  for (const item of PAGE_BANNER_ITEMS) {
    const value = form.pageBannerPositions[item.key]
    next[item.key] =
      typeof value === 'number' && Number.isFinite(value)
        ? Math.min(100, Math.max(0, Math.round(value)))
        : DEFAULT_BANNER_FOCUS
  }
  return next
}

function collectBanners(): PageBanners {
  const next: PageBanners = { ...EMPTY_PAGE_BANNERS }
  for (const item of PAGE_BANNER_ITEMS) {
    next[item.key] = form.pageBanners[item.key].trim()
  }
  return next
}

function bannerStatusText(key: PageBannerKey): string {
  return form.pageBanners[key] ? '已配置' : '使用默认'
}

function bannerStatusType(key: PageBannerKey): 'success' | 'info' {
  return form.pageBanners[key] ? 'success' : 'info'
}

function clearBanner(key: PageBannerKey): void {
  form.pageBanners[key] = ''
  form.pageBannerPositions[key] = DEFAULT_BANNER_FOCUS
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
  form.socialLinks.push({ name: '', url: '', icon: '', qrcode: '' })
}

function removeSocialLink(index: number): void {
  form.socialLinks.splice(index, 1)
}

function normalizeLinks(): SocialLink[] {
  return form.socialLinks
    .map((link) => ({
      name: link.name.trim(),
      url: link.url.trim(),
      icon: link.icon.trim(),
      qrcode: (link.qrcode ?? '').trim(),
    }))
    // 微信 / QQ 允许只填二维码，不强制要链接
    .filter((link) => link.name && (link.url || link.qrcode))
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
      messageNeedReview: form.messageNeedReview,
    danmakuSpeed: form.danmakuSpeed,
    meteorCount: form.meteorCount,
      profileBanner: form.profileBanner.trim(),
      favicon: form.favicon.trim(),
      adminLoginBg: form.adminLoginBg.trim(),
      friendsTitle: form.friendsTitle.trim(),
      friendsLink: form.friendsLink.trim(),
      friendsContactLabel: form.friendsContactLabel.trim(),
      friendsContact: form.friendsContact.trim(),
      friendsTip: form.friendsTip.trim(),
      pageBanners: collectBanners(),
    pageBannerPositions: collectPositions(),
    pageCardOffsets: collectCardOffsets(),
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
        <PageHeader title="站点配置" description="博客前台展示的基础信息、文案、页面横幅与页脚">
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
              <el-form-item label="站点图标（favicon）">
                <ImageUpload
                  v-model="form.favicon"
                  :size="72"
                  :limit="1"
                  tip="建议 1:1（64×64 的 PNG 或 ICO），留空用默认图标"
                />
              </el-form-item>
              <el-form-item label="后台登录页背景图">
                <ImageUpload
                  v-model="form.adminLoginBg"
                  :size="112"
                  :limit="1"
                  tip="建议 1920×1080，留空用内置蓝色波浪底图"
                />
              </el-form-item>
              <el-form-item label="站长公告">
                <el-input v-model="form.announcement" type="textarea" :rows="2" maxlength="200" show-word-limit placeholder="展示在首页的小公告，可留空" />
              </el-form-item>
              <el-form-item label="评论需要审核">
                <el-switch v-model="form.commentNeedReview" />
                <span class="ml-3 text-[12px] text-[var(--text-3)]">开启后新评论进入待审核列表，关闭则提交后直接公开</span>
              </el-form-item>
              <el-form-item label="留言需要审核">
                <el-switch v-model="form.messageNeedReview" />
                <span class="ml-3 text-[12px] text-[var(--text-3)]">开启后新留言进入待审核列表，关闭则提交后直接公开</span>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="留言板" name="message">
          <div class="max-w-[640px] pt-2">
            <el-form label-position="top">
              <el-form-item label="弹幕速度">
                <el-slider v-model="form.danmakuSpeed" :min="60" :max="600" :step="10" show-input />
                <div class="mt-1 text-[12px] text-[var(--text-3)]">
                  数值越大飘得越快：60 约 8 秒穿过一屏，100 约 5 秒（范围 20–160）
                </div>
              </el-form-item>
              <el-form-item label="背景流星数量">
                <el-slider v-model="form.meteorCount" :min="0" :max="80" :step="2" show-input />
                <div class="mt-1 text-[12px] text-[var(--text-3)]">
                  弹幕背景的流星颗数，0 表示不显示（范围 0–80，默认 34）
                </div>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>

        <el-tab-pane label="友链页" name="friends">
          <div class="max-w-[640px] pt-2">
            <el-alert
              type="info"
              :closable="false"
              show-icon
              title="这些文案显示在友链页顶部的介绍卡片里，留空则自动使用站点名称 / 本站地址。"
              class="mb-4"
            />
            <el-form label-position="top">
              <el-form-item label="欢迎标题">
                <el-input v-model="form.friendsTitle" maxlength="120" placeholder="留空则显示「欢迎来到 站点名称」" />
              </el-form-item>
              <el-form-item label="本站链接">
                <el-input v-model="form.friendsLink" maxlength="300" placeholder="留空则显示当前站点地址，例如 https://furinaluna.top" />
              </el-form-item>
              <div class="grid grid-cols-1 gap-x-5 md:grid-cols-2">
                <el-form-item label="联系方式名称">
                  <el-input v-model="form.friendsContactLabel" maxlength="20" placeholder="例如 QQ、微信、邮箱" />
                </el-form-item>
                <el-form-item label="联系方式">
                  <el-input v-model="form.friendsContact" maxlength="100" placeholder="留空则不显示这一行" />
                </el-form-item>
              </div>
              <el-form-item label="申请提示">
                <el-input
                  v-model="form.friendsTip"
                  type="textarea"
                  :rows="2"
                  maxlength="200"
                  show-word-limit
                  placeholder="留空则显示默认提示：申请前请先添加本站友链，审核通过后会尽快上线。"
                />
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

        <el-tab-pane label="页面横幅" name="banners">
          <div class="pt-2">
            <div
              class="mb-4 rounded border px-4 py-3"
              :style="{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }"
            >
              <div class="mb-2 flex items-center justify-between gap-2">
                <span class="text-[13px] font-medium text-[var(--text)]">首页资料卡背景（侧栏）</span>
                <el-tag :type="form.profileBanner ? 'success' : 'info'" size="small" disable-transitions>
                  {{ form.profileBanner ? '已配置' : '使用默认' }}
                </el-tag>
              </div>
              <div class="flex items-start gap-3">
                <ImageUpload v-model="form.profileBanner" :limit="1" :size="96" />
                <div class="min-w-0 flex-1">
                  <p class="clamp-2 m-0 break-all text-[12px] leading-5 text-[var(--text-3)]">
                    {{ form.profileBanner || '未配置时依次回退到「首页 Hero」横幅、内置渐变' }}
                  </p>
                  <p class="m-0 mt-1 text-[12px] leading-5 text-[var(--text-3)]">
                    只影响首页右侧资料卡顶部那条横幅，建议 2:1（如 800×400），头像会压在横幅下沿显示。
                  </p>
                  <el-button
                    size="small"
                    class="mt-2"
                    :disabled="!form.profileBanner"
                    @click="form.profileBanner = ''"
                  >
                    清除
                  </el-button>
                </div>
              </div>
            </div>

            <p class="mb-3 text-[12px] leading-5 text-[var(--text-3)]">
              按页面配置横幅图；不上传则使用内置天空渐变横幅。图片建议 1600×600 以上、宽高比 ≥ 2.4:1。
            </p>
            <el-row :gutter="16">
              <el-col v-for="item in PAGE_BANNER_ITEMS" :key="item.key" :xs="24" :md="12">
                <div
                  class="mb-4 rounded border px-4 py-3"
                  :style="{ borderColor: 'var(--border)', background: 'var(--bg-soft)' }"
                >
                  <div class="mb-2 flex items-center justify-between gap-2">
                    <span class="text-[13px] font-medium text-[var(--text)]">{{ item.label }}</span>
                    <el-tag :type="bannerStatusType(item.key)" size="small" disable-transitions>
                      {{ bannerStatusText(item.key) }}
                    </el-tag>
                  </div>
                  <div class="flex items-start gap-3">
                    <ImageUpload v-model="form.pageBanners[item.key]" :limit="1" :size="96" />
                    <div class="min-w-0 flex-1">
                      <p class="clamp-2 m-0 break-all text-[12px] leading-5 text-[var(--text-3)]">
                        {{ form.pageBanners[item.key] || '未配置，前台使用内置默认横幅' }}
                      </p>
                      <el-button
                        size="small"
                        class="mt-2"
                        :disabled="!form.pageBanners[item.key]"
                        @click="clearBanner(item.key)"
                      >
                        清除
                      </el-button>
                      <div class="mt-3">
                        <div class="mb-1 flex items-center justify-between gap-2">
                          <span class="text-[12px] text-[var(--text-3)]">取景位置</span>
                          <span class="text-[12px] text-[var(--text-3)]">
                            {{ form.pageBannerPositions[item.key] }}%（0 贴顶 · 100 贴底）
                          </span>
                        </div>
                        <el-slider
                          v-model="form.pageBannerPositions[item.key]"
                          :min="0"
                          :max="100"
                          :step="1"
                          size="small"
                          :disabled="!form.pageBanners[item.key]"
                          :show-tooltip="false"
                        />
                      </div>
                      <!-- 首页是满屏 Hero，没有内容卡片，不需要「卡片上移」 -->
                      <p
                        v-if="item.key === 'home'"
                        class="mt-2 text-[12px] leading-5 text-[var(--text-3)]"
                      >
                        首页是满屏 Hero，没有内容卡片，因此不需要「卡片上移」
                      </p>
                      <div v-else class="mt-2">
                        <div class="mb-1 flex items-center justify-between gap-2">
                          <span class="text-[12px] text-[var(--text-3)]">卡片上移</span>
                          <span class="text-[12px] text-[var(--text-3)]">
                            {{ form.pageCardOffsets[item.key] }}px（{{ MAX_CARD_OFFSET }} = 拉满贴合横幅）
                          </span>
                        </div>
                        <el-slider
                          v-model="form.pageCardOffsets[item.key]"
                          :min="0"
                          :max="MAX_CARD_OFFSET"
                          :step="4"
                          size="small"
                          :show-tooltip="false"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </el-col>
            </el-row>
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
              class="mb-3 rounded border p-3"
              :style="{ borderColor: 'var(--border)' }"
            >
              <div class="flex items-end gap-2">
                <el-input v-model="link.icon" class="w-[92px]!" placeholder="图标" maxlength="16" />
                <el-input v-model="link.name" class="w-[160px]!" placeholder="名称" maxlength="24" />
                <el-input
                  v-model="link.url"
                  class="flex-1"
                  placeholder="example.com（微信 / QQ 可只上传二维码）"
                />
                <el-button
                  :icon="Delete"
                  :disabled="form.socialLinks.length <= 1"
                  @click="removeSocialLink(index)"
                />
              </div>
              <div class="mt-2 flex items-start gap-3">
                <ImageUpload v-model="link.qrcode" :size="56" :limit="1" tip="二维码（可选）" />
                <p class="m-0 text-[12px] leading-5 text-[var(--text-3)]">
                  上传二维码后，前台点这个图标会悬浮展示二维码而不是跳转链接，适合微信 / QQ。
                  <span class="block break-all">{{ link.qrcode || '未上传二维码' }}</span>
                </p>
              </div>
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
