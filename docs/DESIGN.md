# luna-blog 视觉与工程约定

两个前端都按本文档实现，保证同源观感；Tailwind v4 CSS-first（无 tailwind.config.js），Element Plus 只做行为组件、外观用 token 覆盖。

## 1. 设计基调

个人技术博客 + 数字花园：**留白克制、字重对比强、单一重点色、暗色一等公民**。不要 Element Plus 默认蓝、不要渐变滥用到满屏、不要圆角过大。

- 主色 `brand`：青蓝 `#2f8f83`（暗色下提亮为 `#5ec9b8`）。只用于链接、激活态、按钮主色、重点数字。
- 辅助色：`--accent` 暖橙 `#e07a3f`，仅用于「推荐 / 置顶 / 未读」这类徽标。
- 中性色：亮色背景 `#faf9f7`（暖白，不用纯白），卡片 `#ffffff`，边框 `#e7e3dc`，正文 `#23211d`，次要文字 `#6f6a62`。
- 暗色背景 `#12130f`（微绿黑），卡片 `#1b1d18`，边框 `#2b2e26`，正文 `#e8e6df`，次要 `#9c9a90`。
- 字体：正文 `system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`；标题同族但 `font-weight:700` + `letter-spacing:-0.02em`；代码 `ui-monospace, "JetBrains Mono", Consolas, monospace`。**不引入网络字体**（离线可用）。
- 圆角：卡片 14px，按钮 10px，徽标 6px，头像 999px。
- 阴影：仅卡片 hover 与浮层使用，`0 1px 2px rgba(0,0,0,.04), 0 8px 24px -12px rgba(0,0,0,.18)`；暗色改用边框区分，几乎不用阴影。
- 布局宽度：前台内容 `max-w-6xl`（1152px），阅读正文 `max-w-3xl`；后台内容 `max-w-[1400px]`，侧栏 220px。

## 2. Tailwind 主题（blog-web/src/styles/index.css 内定义，blog-admin 同构）

```css
@import 'tailwindcss';
@theme {
  --color-brand-50: #eef7f5;  --color-brand-100: #d7ece8;
  --color-brand-400: #5ec9b8; --color-brand-500: #2f8f83; --color-brand-600: #26766c;
  --color-accent-500: #e07a3f;
  --font-sans: system-ui, -apple-system, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  --font-mono: ui-monospace, 'JetBrains Mono', Consolas, monospace;
  --radius-card: 14px;
}
```

语义变量放 `:root` / `html.dark`：`--bg, --bg-soft, --card, --border, --text, --text-2, --brand, --shadow`。组件里用 `var(--card)` 这类语义变量，避免到处写 `dark:`。

## 3. 前台 blog-web 结构

Layout：`AppHeader`（sticky，`backdrop-blur`，scroll 后加边框）— `<RouterView>` — `AppFooter` — `MusicPlayer`（右下角悬浮，可折叠）+ `BackToTop`。

- 首页 `/`：Hero（站点名、一句话介绍、社交图标、滚动提示）→ 推荐位（2 张横向卡）→ 主列表（左：文章卡流 + 分页；右：sticky 侧栏 = 作者卡 / 分类 / 标签云 / 最新文章 / 站点统计）→ 分页器。
- 文章卡：封面（可选，16:9，hover 轻微 scale）、标题 2 行截断、摘要 2 行、元信息（日期 · 分类 · 阅读时长 · 浏览量 · 评论数）、标签 chip。
- 详情 `/article/:id`：顶部标题 + 元信息 + 封面 → 正文（md-editor-v3 的 `MdPreview` 只读渲染，代码高亮、目录 `MdCatalog` 右侧 sticky，移动端抽屉）→ 标签 → 点赞按钮（乐观更新）→ 上下篇 → 评论区。
- 分类 `/category/:id`、标签 `/tag/:id`：页头（名称 + 计数 + 描述）+ 文章列表。
- 归档 `/archives`：按年分组，左侧时间轴，右侧条目。
- 搜索 `/search?keyword=`：大输入框 + 结果列表 + 空状态。
- 说说 `/talks`：卡片流，图片九宫格（点击预览），点赞，评论按钮展开该说说的评论。
- 相册 `/albums` → `/albums/:id`：相册卡（封面 + 数量），详情为瀑布列（CSS `columns`）+ 图片预览 `el-image`。
- 留言板 `/message`：顶部模式切换（卡片 / 弹幕），卡片模式 = 留言卡 + 发布表单；弹幕模式 = 全宽区域滚动弹幕（vue3-danmaku），底部小表单。
- 资源 `/resources`：分类分组卡片网格。
- 友链 `/friends`：友链卡网格 + 「申请友链」弹窗（表单 + 提示待审核）。
- 关于 `/about`：头像 + Markdown 渲染 `about` 配置 + 站点统计数字。
- 404：大号 404 + 返回首页。

组件：`ArticleCard`、`SectionTitle`、`Pagination`、`EmptyState`、`SkeletonList`、`TagChip`、`CommentSection`（表单 + 两级列表 + 审核提示）、`LikeButton`、`ThemeToggle`、`MusicPlayer`、`BackToTop`。

## 4. 后台 blog-admin 结构

外壳：左侧固定侧栏（logo + 分组菜单 + 折叠按钮 + 底部主题切换/退出），顶部条（面包屑 + 未读通知铃铛 + 用户下拉），内容区。

- 登录 `/login`：左品牌区（站点名 + 装饰）+ 右表单卡；`needPasswordChange` 时跳 `/change-password`（不可跳过）。
- 仪表盘：4 张统计卡（文章/评论/留言/浏览量，含环比或「今日」小字）→ 近 7 天双折线或柱状（用纯 CSS/SVG 手写，不引图表库）→ 最新评论列表 → 最近文章表格。
- 文章管理：筛选条（状态 tabs、分类、关键词）+ 表格（标题/分类/标签/状态/推荐/浏览/时间/操作）+ 抽屉或独立页编辑器（md-editor-v3 `MdEditor`，左编辑右预览，封面用上传组件，标签多选，保存草稿/发布）。
- 分类/标签：表格 + 对话框表单（标签带颜色选择）。
- 评论管理：状态 tabs（待审核/已通过/已拒绝）+ 表格（内容摘要/作者/所属文章/时间/操作：通过、拒绝、回复、删除）+ 回复抽屉。
- 说说：列表卡 + 编辑对话框（文本域 + 多图上传）。
- 相册：相册表格 + 进入相册管理照片（上传、排序、删除）。
- 留言管理、友链管理（审核）、资源管理、站点配置（分组表单 tabs：基础信息 / 首页 Hero / 关于 / 社交链接 / 其它）、个人中心（改密码、资料）。
- 通知：铃铛下拉（最近 5 条 + 未读数）+ `/notifications` 列表页（全部已读）。

菜单分组：内容（文章、分类、标签、说说、相册、资源）｜互动（评论、留言、友链）｜站点（站点配置、通知）｜账户（个人中心）。

## 5. 交互与工程细则

- 所有列表接口有 loading 骨架；空态统一 `EmptyState`（图标 + 一句提示 + 可选按钮）。
- 表单校验用 Element Plus `Form` 规则；提交按钮 loading + 防重复点击。
- 时间统一 `dayjs` 格式化（列表 `YYYY-MM-DD`，详情 `YYYY年M月D日 HH:mm`，相对时间用于说说/评论）。
- 图片统一 `object-cover` + 圆角；加载失败显示占位底色。
- 请求层：`src/api/http.ts` 单例 axios（`baseURL: '/api'`，`timeout: 15000`，请求带 token，响应统一解包 + 错误弹窗）；`src/api/*.ts` 按域导出函数与 TS 类型（`src/api/types.ts` 放全部接口类型）。
- 状态：pinia 存 `auth`（admin）、`site`（前台站点配置+主题）、`theme`。前台用 `@pinia/colada` 处理文章列表等查询缓存（`useQuery`）；后台直接用 axios + ref（更简单可控）。
- 路由：前台 history 模式，滚动行为 `scrollBehavior` 回顶部；后台 history 模式，守卫检查 token + `needPasswordChange`。
- 深浅色：`theme` store 持久化到 localStorage，`html.dark` 切换；Element Plus 暗色通过自定义 CSS 变量覆盖主要组件背景/边框/文字。
- 音乐播放器：`/wapi` 代理网易云 API（`/wapi/personalized/newsong`、`/wapi/song/url?id=`）；请求 3 秒超时、失败即整体隐藏（不显示空壳），成功则迷你条 + 播放列表抽屉；播放态用单例 `Audio`。
- TypeScript：`strict`，禁止 `any` 逃逸（用 `unknown` + 收窄）；`verbatimModuleSyntax` 下类型导入必须 `import type`。
- 构建/检查命令（两端一致）：`npx tsc --noEmit`（TS7 检查 .ts）、`node scripts/check-vue.cjs --noEmit`（TS6 宿主检查 .vue）、`npx vite build`。`package.json` 的 `build` 脚本串联三者。
