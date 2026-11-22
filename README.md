# Luna Blog

一个从零重写的个人博客系统，包含**访客博客前台**、**管理后台**、**API 服务**三个独立子项目。

设计目标：访客无需注册即可评论（默认进入审核队列），只有管理员登录后台；前台以阅读体验为先，
后台以内容维护效率为先，接口契约、数据模型与设计规范全部文档化。

视觉上**沿用原型、代码全部重写**：前台还原原 `vue3-blog` 的外观（蓝色主色、全屏天空首页、
卡片化内容、波浪过渡、常驻音乐播放器），后台还原原 `pure-admin` 观感（深色侧栏、标签页、
表格化内容页），技术栈则是全新的一套，便于从旧站平滑迁移。

- 前台：分页文章列表 + 推荐位、Markdown 详情（代码高亮 / 目录 / 点赞 / 评论）、分类 / 标签 / 时间轴 / 搜索、
  说说、相册（照片墙 + 大图预览）、留言墙（默认整屏夜空弹幕，可切彩色卡片）、资源、友链、关于、RSS、404
- 后台：登录 + 首次登录强制改密、仪表盘、文章（md-editor-v3 编辑、草稿 / 发布 / 推荐）、分类、标签、
  评论审核与回复、说说、相册、留言审核、资源、友链、站点配置（含 13 个页面的横幅图自定义上传）、通知中心、个人中心
- 服务：Koa 3 + Sequelize 6 + MySQL 8，JWT 鉴权、限频、敏感词、上传、RSS、统一错误响应

## 技术栈

| 层 | 选型 |
| --- | --- |
| 前台 / 后台 | Vue 3.5 · Vite 8 · TypeScript 7 · Vue Router 5 · Pinia 4 · Element Plus 2.14 · Tailwind CSS 4（CSS-first） |
| 内容渲染 | md-editor-v3 7（预览 / 目录 / 编辑）、vue3-danmaku 1.6（弹幕）、@pinia/colada（请求缓存） |
| 服务端 | Koa 3 · @koa/router 15 · Sequelize 6 · mysql2 · zod 4 · jsonwebtoken 9 · bcryptjs 3 |
| 工程 | pnpm 10 · TS strict（禁 any）· Conventional Commits |

依赖版本全部锁定在各自 `package.json`（不使用 `^` / `~`），锁文件一并提交。

## 目录结构

```
luna-blog/
├── blog-web/          # 前台（Vue SPA，开发端口 5173）
├── blog-admin/        # 后台（Vue SPA，开发端口 5174）
├── blog-server/       # API 服务（Koa，端口 3000）
│   ├── src/
│   │   ├── config/    # 环境变量校验、敏感词表
│   │   ├── core/      # 错误、响应、校验、分页、JWT、限频、文本工具
│   │   ├── db/        # Sequelize 实例与模型
│   │   ├── middleware/# 鉴权、错误处理
│   │   ├── modules/   # 按功能域组织：articles / comments / talks / albums / ...
│   │   └── routes/    # 路由汇总
│   └── scripts/       # db:init 初始化、build 静态检查
├── docs/
│   ├── API.md         # 接口契约（响应包、分页、鉴权、限频、字段）
│   ├── DESIGN.md      # 视觉与交互规范（前后台 token、布局、页面结构）
│   ├── PROTOTYPE-*.md # 原型考古档案（前台 / 后台逐像素说明，实现依据）
│   └── reference-*.md # 原项目结构参考（重写前调研留档）
├── scripts/smoke-api.mjs  # 端到端接口冒烟（33 项断言）
└── deploy/            # Nginx / systemd 部署样例
```

界面截图见 `docs/screenshots/`：`home-hero` / `home-list` / `article` / `albums` / `message-wall` /
`message-danmaku` / `admin-dashboard`。

## 快速开始

### 0. 前置

- Node.js **>= 22.12**（开发验证于 24.x）、pnpm 10+
- MySQL **8.x**（字符集 `utf8mb4`）

### 1. 安装依赖

```bash
pnpm -C blog-server install
pnpm -C blog-web install
pnpm -C blog-admin install
```

### 2. 配置环境变量

```bash
cp blog-server/.env.example blog-server/.env   # Windows: copy blog-server\.env.example blog-server\.env
```

必填项（缺失或不合规时服务端会直接退出并提示）：

| 变量 | 说明 |
| --- | --- |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` | MySQL 连接信息，库不存在时由 `db:init` 自动创建 |
| `JWT_SECRET` | 至少 16 位随机串，建议 `openssl rand -hex 32` 生成 |
| `ADMIN_PASSWORD` | 初始化管理员密码，至少 8 位；仅 `db:init` 与改密校验使用 |
| `SITE_URL` | 前台站点地址，用于 RSS 与绝对链接 |
| `CORS_ORIGINS` | 允许跨域的前端地址，逗号分隔 |

`PORT`（默认 3000）、`ADMIN_USERNAME`（默认 admin）、`UPLOAD_DIR`、`UPLOAD_MAX_IMAGE_MB`、
`UPLOAD_MAX_FILE_MB`、`JWT_EXPIRES_IN` 可选。**`.env` 不入库**，仓库只保留 `.env.example`。

### 3. 初始化数据库

```bash
pnpm -C blog-server db:init
```

会依次完成：创建数据库（`utf8mb4_unicode_ci`）→ 同步表结构 → 创建管理员（`needPasswordChange = true`）→
写入默认站点配置。**不会写入任何示例文章/说说/相册**，空站状态直接进后台自己写内容。

> 首次登录后台会被强制跳转改密，改密后才能调用管理接口。

### 4. 启动开发环境（三个终端）

```bash
pnpm -C blog-server dev     # http://127.0.0.1:3000
pnpm -C blog-web dev        # http://localhost:5173
pnpm -C blog-admin dev      # http://localhost:5174
```

两个前端都通过 Vite 代理把 `/api`、`/uploads`、`/rss.xml` 转发到 `http://127.0.0.1:3000`，
无需额外配置跨域。

### 5. 冒烟验证

```bash
node scripts/smoke-api.mjs
```

覆盖 33 项断言：登录 / 首登强制改密 / 旧密码失效、文章 CRUD 与搜索、**访客免登录评论 → 待审核不进前台 →
后台审核通过 → 前台可见**、敏感词与限频拦截、未登录删评论 401、点赞幂等、说说 / 相册 / 资源 / 友链 / 留言、
仪表盘、站点配置、图片上传与静态访问、RSS。可通过 `API_BASE`、`ADMIN_USERNAME`、`ADMIN_PASSWORD` 覆盖默认值。

## 常用脚本

| 位置 | 命令 | 说明 |
| --- | --- | --- |
| blog-server | `pnpm dev` | `node --watch` 启动 |
| blog-server | `pnpm start` | 生产启动 |
| blog-server | `pnpm build` | 全量语法检查 + 构建依赖图（不连库） |
| blog-server | `pnpm db:init` | 建库 / 同步表 / 写初始数据 |
| blog-web | `pnpm dev` / `pnpm build` | 开发 / 类型检查 + 生产构建 |
| blog-web | `pnpm check` | 仅类型检查（TS 7 查 `.ts`、TS 6 + vue-tsc 查 `.vue`） |
| blog-admin | `pnpm dev` / `pnpm build` | 同上（页面为自建骨架，无第三方后台模板） |

## 生产部署

### 1. 构建

```bash
pnpm -C blog-web build      # 产物 blog-web/dist
pnpm -C blog-admin build    # 产物 blog-admin/dist
```

### 2. 启动 API

```bash
cd blog-server
NODE_ENV=production node src/server.js
```

建议用进程守护（样例见 `deploy/luna-blog.service`，pm2 亦可：`pm2 start src/server.js --name luna-blog`）。
生产环境需要把 `UPLOAD_DIR` 指向持久化目录（默认 `blog-server/uploads`，已加入 `.gitignore`）。

### 3. Nginx 反向代理

参考 `deploy/nginx.conf.example`，要点：

- 前台静态目录指向 `blog-web/dist`，`try_files $uri $uri/ /index.html`（history 路由必须回退）
- 后台挂在子路径（如 `/admin/`）时，用 `vite build --base=/admin/` 构建，并同样配置回退
- `/api/`、`/uploads/`、`/rss.xml` 反代到 `127.0.0.1:3000`
- 上传目录建议单独 `client_max_body_size 10m;`

### 4. 上线前检查

- [ ] `blog-server/.env` 已配置且**未提交**；`JWT_SECRET` 已换成随机强口令
- [ ] 后台首次登录完成改密，个人中心确认密码已更新
- [ ] `CORS_ORIGINS` 改成真实域名，`SITE_URL` 同步
- [ ] 站点配置（站点名 / 头像 / 关于 / 页脚 / 备案号）已在后台填写
- [ ] `GET /rss.xml` 可访问，文章详情页 URL 与 RSS 中一致
- [ ] 上传一张图片验证 `/uploads/**` 可访问

## 安全设计

- **只有管理员有账号**：后台登录 + JWT（Bearer，默认 7 天），无注册入口
- **访客评论**：填写昵称 + 邮箱即可（邮箱不公开，仅用于回复提醒），提交后状态为「待审核」，
  审核通过才进入前台列表；删除 / 回复仅管理员
- **限频**：评论（同 IP 60s/条、1 小时 10 条、同邮箱 1 小时 5 条）、留言、友链申请、点赞（10s 幂等）、
  登录（15 分钟 10 次）、全局 300 次/分钟，均返回 429 并提示剩余时间
- **内容治理**：敏感词命中直接 400；评论 / 留言 / 说说内容统一 HTML 转义后输出，长度超限拒绝
- **强制改密**：初始化管理员 `needPasswordChange = true`，改密前除读取类接口外全部返回
  `403` + `data.reason = 'PASSWORD_CHANGE_REQUIRED'`，前端据此跳转改密页
- **上传**：图片仅 jpeg/png/webp/gif/avif，附件仅 pdf/zip/txt/md（不收 svg / 脚本），
  multer 限制大小并在超限时删除已落盘文件
- **其他**：koa-helmet 安全头、CORS 白名单、`koa-compress`、错误响应统一为 `{ code, message, details? }`，
  生产环境不返回堆栈

## 文档

| 文档 | 作用 |
| --- | --- |
| [`docs/API.md`](docs/API.md) | 全部接口：响应包、分页协议、鉴权与错误码、限频表、14 张表字段、接口分组总表 |
| [`docs/DESIGN.md`](docs/DESIGN.md) | 视觉与交互规范：前后台 token、布局骨架、页面结构、工程约定 |
| [`docs/PROTOTYPE-web.md`](docs/PROTOTYPE-web.md) | 前台原型档案：原始变量、尺寸、动画、图标与换栈要点 |
| [`docs/PROTOTYPE-admin.md`](docs/PROTOTYPE-admin.md) | 后台原型档案：pure-admin 布局尺寸、17 个业务页、交互与素材清单 |

改接口先改 `docs/API.md`，改样式先改 `docs/DESIGN.md`，再同步实现。

## 已知限制与踩坑记录

- **音乐播放器依赖外部网易云 API**：通过 `/wapi` 代理访问自建 netease-music-api（开发期 Vite 代理到
  `127.0.0.1:3001`）。服务不可用时播放器**整体不渲染**（3 秒超时、无空壳、不报错），不影响其它功能。
- **TypeScript 7 与 vue-tsc 不兼容**：TS 7 的原生编译器不再提供 vue-tsc 依赖的 `typescript/lib/tsc`。
  项目主版本仍是 `typescript@7.0.2`（用于 `.ts` 检查），额外用官方兼容包 `typescript6`
  （`npm:@typescript/typescript6@6.0.2`）作为 vue-tsc 宿主，只负责 `.vue` 的 SFC 类型检查，
  入口见两个前端的 `scripts/check.cjs`。
- **业务代码不要写 `any`**：TS strict + `noUnusedLocals`，`.vue` 与 `.ts` 都要过检查才能构建。
- **模板属性里避免裸写含 `//` 的 URL**：`vue-tsc` 会把 `placeholder="https://..."` 里的 `//` 当成行注释，
  并在同一表单上抛 `TS2339`。用脚本常量传给 `:placeholder`。
- **弹幕容器必须有显式高度**：`vue3-danmaku` 需要拿到容器宽高，留言板弹幕舞台用
  `calc(100vh - 头部 - 2.5rem)` 并保底 `560px`；内容必须先 HTML 转义再拼成 `span`。
- **Windows 换行**：仓库带 `.gitattributes`（`* text=auto eol=lf`），提交前无需手动处理。
- **历史路由部署**：两个 SPA 都是 history 模式，Nginx 必须配置 `try_files` 回退到 `index.html`。
- **首页背景不依赖外部图床**：天空/云海由 CSS 多层渐变叠加本地 `clouds.png` 实现，离线可用；
  与原型使用的实景照片相比，天空略深、云层更平滑。
- **原型素材随仓库提供**：`clouds.png`、导航图标 SVG、后台登录插画与 403/404/500 插画来自原项目，
  用于保持原型观的感；未引入 iconfont / iconify / ECharts 等额外依赖，仪表盘趋势图是手写 SVG。

## License

个人项目，仅供学习参考。
