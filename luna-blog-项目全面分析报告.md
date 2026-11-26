# luna-blog 项目全面分析报告

| 项 | 内容 |
| --- | --- |
| 分析对象 | `D:\Projects\01_个人项目\furinaluna-blog` |
| 版本 | 分支 `main`，提交 `b693bbd`，共 101 次提交，工作区干净，与 `origin/main` 同步，无 tag |
| 分析日期 | 2026-11-26 |
| 方式 | **只读**。后端 65 个源文件逐行读完；前端核心文件（路由、请求层、鉴权、评论、留言、文章页、音乐、构建配置）逐行读完，其余页面做了模式扫描；两个前端另派了只读探查，其结论中写入本报告的条目我都回到源码做了二次核对。**未运行**构建、类型检查、冒烟脚本（遵守"不要修改代码"，且构建会在项目目录写 `dist`）。 |
| 配套文档 | 《luna-blog部署说明.md》（同目录） |

---

## 一、结论：是否达到可交付状态

**功能上已经开发完毕，工程底子明显好于同类个人博客项目；但现状不宜直接对外上线，属于「有条件可交付」。**

- **做完的**：前台 16 个路由、后台 20 个页面、后端 17 张表 / 约 80 个接口全部有实现，没有占位页、没有 mock 数据、没有 TODO。前后端接口路径我逐条对照过，**没有一处对不上**。鉴权、首登强制改密、访客免登录评论 + 审核、限频、敏感词、上传类型白名单、统一错误响应、优雅关闭、fail-fast 配置校验，这些都是实打实写好了的。
- **卡住的 1 件事**：后台按仓库文档挂在 `/admin/` 子路径时**打不开**（路由少传一个 base，见 P0-1）。不改代码就得换部署形态。
- **上线前该修的 6 件事**：访客评论/留言里的引号、`&`、尖括号会显示成乱码（P1-1）；客户端 IP 可伪造导致限频可被绕过（P1-2，可用 Nginx 配置兜住）；限频清理逻辑有 bug（P1-3）；令牌存放与失效机制偏弱（P1-4）；仓库里的部署样例照抄会出问题（P1-5）；在两篇文章之间直接跳转时，点赞状态会串（P1-6）。
- **上线后尽快做的**：前台每条评论没有对应样式——组件类名和全局样式类名对不上（P2-11，改动很小，建议和 P1 一起修）；SEO 基础几乎为零（P2-1）；音乐依赖第三方非官方接口（P2-2）；代码高亮依赖外网 CDN（P2-3）等。

| 维度 | 评价（5 分制，我的判断） | 一句话说明 |
| --- | --- | --- |
| 功能完成度 | 4.5 | 规划的功能全部落地； |
| 架构设计 | 4.5 | 后端分层清晰、职责单一；前端请求层抽象到位 |
| 代码质量 | 3.5 | TS strict、无 `any`、无遗留 console；但有死代码、一处编码损坏，以及评论区"样式写了却对不上类名"这类重构没收尾的痕迹 |
| 安全 | 3 | 该有的都有，但 IP 取法、限频清理、令牌三处有实际缺口 |
| 性能 | 3.5 | 列表查询写得讲究；访问统计和首包体积是短板 |
| 可维护性 | 3.5 | 文档齐全但已与代码脱节；没有迁移、没有测试、没有 CI |
| 部署就绪度 | 2.5 | 样例配置有坑，后台子路径不可用 |
| SEO / GEO | 2 | 纯客户端渲染，全站共用一个标题，无 sitemap / robots |

**建议路径**：改 P0-1 的一行 + 按部署说明里给的 Nginx 配置部署（解决 P1-2）→ 自己用一段时间验证（顺手把 P2-11 修了，否则评论区不好看）→ 对外开放前修 P1-1、P1-3、P1-4、P1-6 → 之后排期做 P2。

---

## 二、项目结构

```
furinaluna-blog/
├── blog-web/      公开前台 SPA    Vue3 + TS   约 9,000 行（其中样式 4,226 行）
├── blog-admin/    管理后台 SPA    Vue3 + TS   约 7,000 行（其中样式 1,495 行）
├── blog-server/   API 服务        Koa3 + JS   约 5,500 行，65 个文件
├── deploy/        Nginx、systemd 样例各 1 份
├── docs/          API 契约、设计规范、原型档案、参考调研、9 张截图
├── scripts/       smoke-api.mjs（唯一的测试代码，267 行）
└── README.md
```

受版本管理的文件 266 个。仓库卫生良好：`.env`、`node_modules`、`dist`、`uploads`、`_ref/`（原项目对照副本）、本地截图都没有入库，我只找到 `.env.example` 一个受跟踪的环境文件。根目录下的 `vue3-blog重写提示词.md` 已被 `.gitignore` 排除。

**后端分层**（`blog-server/src/`）：

```
config/      环境变量 zod 校验、敏感词表
core/        错误、响应、入参校验、分页、JWT、限频、文本工具（7 个小文件）
db/          Sequelize 实例 + 17 个模型
middleware/  adminAuth / adminAuthOnly / errorHandler
modules/     15 个功能域，每个域内 routes → controller → service → repository
routes/      路由汇总
```

---

## 三、技术栈与依赖

### 3.1 版本（三个 `package.json` 实测）

| 层 | 依赖 |
| --- | --- |
| 前端运行时（前台 / 后台相同） | Vue 3.5.46、Vue Router 5.5.1、Pinia 4.1.0、Element Plus 2.14.8、axios 1.21.1、dayjs 1.11.23、@pinia/colada 1.4.9、@vueuse/core 15.0.0、md-editor-v3 7.1.1 |
| 前端构建 | Vite 8.3.8、TypeScript 7.0.2、`typescript6`（`@typescript/typescript6@6.0.2` 的别名，专供 vue-tsc 3.3.14）、Tailwind CSS 4.3.5、@vitejs/plugin-vue 6.0.11 |
| 前台特有 | vue3-danmaku 1.6.7 |
| 后台特有 | mermaid ^12.3.0、katex ^0.19.1、highlight.js ^11.12.0、cropperjs ^1.6.3、screenfull ^6.0.2、prettier ^3.10.1 |
| 后端 | Koa 3.3.0、@koa/router 15.7.1、@koa/cors 5.0.0、@koa/bodyparser 6.1.0、@koa/multer 4.0.0 + multer 2.5.0、Sequelize 6.37.8、mysql2 3.24.6、zod 4.6.7、jsonwebtoken 9.0.3、bcryptjs 3.0.3、koa-helmet 9.0.0、koa-static 5.0.0、koa-compress 5.3.0、dotenv 18.0.10 |
| 运行要求 | Node ≥ 22.12（README 标注开发验证于 24.x）、MySQL 8、pnpm 10 |

三个子项目都有 `pnpm-lock.yaml`（lockfileVersion 9.0），tarball 地址全部指向 `https://registry.npmmirror.com`。

### 3.2 依赖审计（实际执行 `pnpm audit --prod`，走官方源）

| 子项目 | 结果 |
| --- | --- |
| blog-server | 1 个中危：`uuid < 11.1.1`（`sequelize` 的间接依赖，公告 GHSA-w5hq-g745-h8pq，"传入 buf 时缺少边界检查"）。Sequelize 不走该用法，**实际可利用性很低**，等上游升级即可 |
| blog-web | 无已知漏洞 |
| blog-admin | 无已知漏洞 |

附带发现：本机 pnpm 配置的源还是已停用的 `http://registry.npm.taobao.org`（明文 HTTP），直接跑 `pnpm audit` 会报 400，我改用 `--registry` 指到官方源才跑通。建议把本机 registry 换成 `https://registry.npmmirror.com`。

---

## 四、核心功能完成度

### 4.1 前台（`blog-web/src/router/index.ts`，16 条路由，全部懒加载）

| 路由 | 页面 | 状态 |
| --- | --- | --- |
| `/` | 首页：全屏 Hero、文章列表、推荐位、侧栏资料卡 | 完成 |
| `/article/:id` | 文章详情：Markdown、目录、点赞、评论 | 完成（点赞状态串页见 P1-6；评论区样式见 P2-11；渲染问题见 P2-3） |
| `/categories`、`/category/:id`、`/tags`、`/tag/:id` | 分类 / 标签 | 完成 |
| `/archives` | 时间轴归档 | 完成 |
| `/search` | 搜索（标题 + 摘要，服务端 LIKE） | 完成 |
| `/talks` | 说说（带图、点赞、评论） | 完成 |
| `/albums`、`/albums/:id` | 相册列表 / 照片墙 + 大图预览 | 完成 |
| `/message` | 留言板：夜空弹幕 / 卡片两种模式 | 完成（转义问题见 P1-1） |
| `/resources` | 资源导航 | 完成 |
| `/friends` | 友链 + 访客申请 | 完成 |
| `/about` | 关于（Markdown） | 完成 |
| `*` | 404 | 完成 |
| 全局 | 页头 / 页脚 / 主题切换 / 公告球 / 音乐球 / 返回顶部 / 欢迎通知 | 完成 |

### 4.2 后台（`blog-admin/src/router/index.ts`，20 个页面）

登录、强制改密、仪表盘、文章列表 / 新建 / 编辑、分类、标签、说说、相册列表 / 详情、资源、评论审核与回复、留言审核、友链、站点配置（828 行，含 13 个页面横幅、音乐、欢迎语等页签）、通知中心、个人中心、403、404。**全部实现**，没有占位。后台 `index.html` 第 7 行带了 `<meta name="noindex, nofollow">`，细节到位。

提交 `e034cbf` 移除了"站内歌单与后台音乐管理页"，后台侧确认已清干净。

### 4.3 后端（15 个功能域，全部有路由 + 控制器 + 服务）

auth、article、taxonomy、comment、like、talk、message、album、resource、friend-link、notification、dashboard、visit、upload、rss、site-config。另有 `music` 域——前端已不再调用，属于遗留（见 P2-8）。

### 4.4 与最初需求对照

| 需求 | 结果 |
| --- | --- |
| 访客免登录评论、默认待审核、后台审核 | ✅ 且支持后台"一键免审"开关 |
| 仅一个管理员、关闭注册、首登强制改密 | ✅ `/api/auth` 下只有 login / profile / password |
| 音乐播放器、弹幕保留 | ✅ 实现方式由"自建网易云服务"改为"在线歌单" |
| 点赞 / 取消 | ⚠️ 只有点赞，**没有取消**（P2-10）可以,确实不需要取消 |
| 通知、个人中心、资源页、说说、相册 | ✅ |

---

## 五、模块职责与架构设计

**后端**是这份代码最扎实的部分。

- **分层严格**：`routes` 只注册；`controller` 只做入参解析（zod）和调用 service；`service` 写业务与事务；`repository` 收敛查询。以文章为例，`article.controller.js` 104 行里没有一行 SQL。
- **统一约定**：成功响应固定 `{ code: 0, message, data }`，分页固定 `{ list, total, page, pageSize, totalPages }`，错误统一走 `AppError` → `error-handler.js` 规整，Sequelize / Zod / Multer 的异常都有映射，生产环境 500 不回显堆栈（`error-handler.js:47`）。
- **横切能力**收在 `core/`：限频（滑动窗口）、分页归一化（上限 50）、入参校验片段、文本工具。每个文件都在 60 行以内。
- **鉴权设计合理**：`adminAuthOnly` 只验登录态，`adminAuth` 在此之上对"未改密"的管理员拦截所有非 GET 请求（`middleware/auth.js:27-34`），所以改密接口本身不会被自己拦住。
- **查询写得讲究**：列表用"先查 id 分页、再按 id 取关联"两步法，避开了 hasMany 连表吃掉 LIMIT 的坑（`article.repository.js:36-39` 有注释说明原因）；分类 / 标签 / 相册计数用一次 GROUP BY，没有 N+1。
- **幂等点赞**：`(target_type, target_id, ip)` 唯一索引 + 事务，并发下靠唯一键冲突兜底（`like.service.js:30-38`）。

**前台**：`api/http.ts` 统一解包、统一错误文案、带 `silent` 选项和同文案 1.5 秒去重；站点级数据放 Pinia store 且并发去重（`stores/site.ts:101-110`）；页面数据用 `@pinia/colada` 的 `useQuery`，所有 key 都带了路由参数。

**后台**：路由级懒加载，编辑器相关的重依赖（mermaid 等）在进入编辑路由前才加载（`router/index.ts:40-43`）；401 自动清登录态跳登录页。

**数据模型**：17 张表——user、category、tag、article、article_tag、comment、like_record、talk、message、friend_link、notification、album、photo、resource、site_config、visit、music。常用查询字段都建了索引。关联关系没有建外键约束，级联删除靠代码里的手动清理（文章、说说、相册都写了事务内清理）。

---

## 六、主要流程与数据流

**1. 登录**：后台 `POST /api/auth/login` → 按 `IP` 限频 15 分钟 10 次 → bcrypt 比对 → 签发 7 天 JWT → 前台存入 `localStorage('luna-admin-token')` → 之后每个请求带 `Authorization: Bearer`。响应里的 `user.needPasswordChange` 决定路由守卫是否把人拦在改密页。

**2. 发文**：后台编辑器 → `POST/PUT /api/admin/articles` → 校验分类与标签存在 → 事务内写文章 + 标签关联 → 前台 `GET /api/articles` 按 `isTop → publishedAt` 排序读出。摘要留空自动截正文前 160 字，阅读时长自动估算。

**3. 评论**：访客填昵称 + 邮箱 → `POST /api/comments`（无需登录）→ 三重限频 → 敏感词 → 按站点配置决定 `pending` / `approved` → 写通知 → 后台 `PATCH /review` 通过时给目标 `commentCount +1` → 前台列表只返回已通过的，且邮箱脱敏。

**4. 点赞**：`POST /api/{articles|comments|talks|messages}/:id/like` → 查 `like_record` 是否已有 `(目标, IP)` → 没有则事务内写记录 + 计数 +1 → 返回最新计数。前端同时用 `localStorage` 记住"已赞"做乐观更新。

**5. 访问统计**：前台每次路由切换 `POST /api/visit`（`router/index.ts:96-103`）→ IP 用 `JWT_SECRET` 加盐做 SHA-256 后入库 → 接口顺带返回最新 PV/UV。

**6. 音乐**：浏览器直接请求第三方 Meting 接口拉歌单（`api/music.ts:48-51`，9 秒超时）→ 过滤掉无播放地址的项 → 交给 `MusicPlayer.vue` 播放。**不经过自己的后端。**

---

## 七、接口

- 公开前缀 `/api/*`，管理接口统一在 `/api/admin/*` 且全部挂了 `adminAuth`。我逐条核对过：**所有 `/api/admin/*` 写接口都有鉴权，没有漏网的**；公开的写接口只有评论、留言、友链申请、点赞、访问上报，都有对应防护。
- **契约一致性**：前台 20 个调用点、后台 58 个调用点，方法与路径在后端全部存在。
- 静态特殊路由的先后顺序正确：`/api/articles/recommend`、`/archives` 注册在 `/:id` 之前；`/api/admin/comments/batch`、`/api/admin/music/reorder`、`/api/admin/notifications/unread-count` 同理。
- RSS 在 `/rss.xml`，输出做了 XML 转义，取最新 20 篇。
- 健康检查 `GET /api/health`。
- 文档 `docs/API.md` 255 行，但**未收录** `music`、`visit` 两组接口，且仍描述 `/wapi`（见 P2-7）。

---

## 八、配置

- `config/index.js` 用 zod 声明 17 个变量，缺 `DB_*`、`JWT_SECRET` 直接退出并打印缺哪几项；`Object.freeze` 冻结；`.env` 路径按文件位置解析，不受启动目录影响。
- `.env.example` 齐全，注释清楚。
- 上传目录支持相对 / 绝对路径，类型分图片 5MB、文件 10MB 两档。
- 前端没有任何 `import.meta.env` 业务变量，全靠相对路径 `/api`，生产环境不需要改代码。
- 时区固定 `+08:00`（`db/index.js:8`），对国内博客合理，但意味着服务器和数据库都应按北京时间理解。

---

## 九、构建、测试与工程化

| 项 | 现状 |
| --- | --- |
| 后端 `build` | `node scripts/check.js`：对 `src`、`scripts` 下所有 js 做 `node --check`，再导入 `app.js` 验证依赖图。不连库。 |
| 前端 `build` | `scripts/check.cjs` 两步类型检查（TS 7 查 `.ts`；TS 6 + vue-tsc 查 `.vue`）+ `vite build`。 |
| TS 配置 | `strict`、`noUnusedLocals`、`noUnusedParameters`、`verbatimModuleSyntax` 全开 |
| 单元测试 | **没有** |
| 集成测试 | 仅 `scripts/smoke-api.mjs`（33 项断言，需先起服务，会写库） |
| CI | **没有**（仓库无 `.github/`） |
| Lint / 格式化 | **没有配置** |
| 版本发布 | 无 tag、无 CHANGELOG |
| 数据库迁移 | **没有**，只有 `sequelize.sync()`（`models/index.js:56-58`） |

构建产物（仓库外的 `dist/`，11 月 26 日 19 点生成）：

- 前台 2.2 MB。入口 JS **886 KB**、CSS **511 KB**（未压缩体积），首页首屏要下载的主要就是这两个。
- 后台 9.9 MB，但 mermaid 的 1.46 MB 等都是进编辑器才加载；首屏入口 JS 902 KB + CSS 472 KB。
- 两个 `vite.config.ts` 把 chunk 告警阈值分别调到 1500 / 2000 KB（默认 500），等于把"包太大"的提示关掉了。

一个巧思值得肯定：TS 7 的原生编译器不提供 vue-tsc 需要的接口，项目用官方 `typescript6` 兼容包单独跑 `.vue` 检查，README 第 201–204 行有记录。

---

## 十、代码质量

**好的方面**

- 前端两个项目扫描 `TODO|FIXME|HACK|@ts-ignore|@ts-expect-error|: any|as any|console.*`：**零命中**（仅一处有意保留的 `console.warn`）。
- 后端注释密度高且有价值，解释的是"为什么"而不是"是什么"。
- 命名一致：序列化函数统一叫 `toXxxJSON`，限频 key 统一 `域:维度:值`。
- 所有 `target="_blank"` 都带 `rel="noopener noreferrer"`；封面、说说配图、资源图标都有 `loading="lazy"`。
- 无障碍细节：跳转主内容链接、`aria-label`、`aria-expanded`。

**不足**

- 遗留死代码（P2-8）。
- 一处文件编码损坏（P3-1）。
- 前台样式有两套命名并存：全局 `index.css`（4,226 行）用下划线 / 短横线命名，部分组件又用 `xxx__yyy` 的写法且自己带 `<style>`。评论区就是两边没对上的那一个（P2-11）。
- 后台 `SiteConfigPage.vue` 828 行、`MusicPlayer.vue` 778 行、`CommentSection.vue` 489 行、`DanmakuStage.vue` 490 行，偏大但各自内聚。
- `stores/site.ts`、`api/music.ts` 等文件缩进不统一（顶格的 `const` 混在两空格缩进里），是没有格式化工具的直接后果。
- 留言在**入库时**转义（`message.service.js:74`），评论在**出库时**转义（`comment.js:17`），说说**完全不转义**（`talk.service.js:16`），三种策略并存——这正是 P1-1 的根源。

---

## 十一、缺陷与风险清单（按优先级）

> 优先级定义：**P0** 按文档部署就会失败；**P1** 上线前应修，涉及可见故障或安全；**P2** 上线后尽快修；**P3** 有空再说。
> 「已核实」= 我回到源码或产物逐行确认；「已实测」= 我执行了命令。

### P0

**P0-1 · 后台挂在 `/admin/` 子路径会直接进 404**（已核实）

- 位置：`blog-admin/src/router/index.ts:147` 写的是 `createWebHistory()`，没有传 base；整个 `blog-admin/src` 里搜不到 `BASE_URL`。
- 证据：已安装的 vue-router 5.5.1，`normalizeBase` 在不传参时固定返回 `/`，也不读 `import.meta.env.BASE_URL`。前台对应位置 `blog-web/src/router/index.ts:90` 是写了 `import.meta.env.BASE_URL` 的，后台漏了。
- 后果：按 README 第 158 行、`deploy/nginx.conf.example:32-36` 用 `--base=/admin/` 构建后，打开 `/admin/` 资源能加载，但路由认为自己在根路径，匹配到的是后台自己的 404 页。当前 `blog-admin/dist/index.html` 里资源前缀是 `/assets/`，说明至今只在根路径下验证过。
- 修法：第 147 行改为 `createWebHistory(import.meta.env.BASE_URL)`，重新用 `--base=/admin/` 构建。或改用独立子域名部署（零改动）。

### P1

**P1-1 · 评论 / 留言里的引号、`&`、尖括号会显示成 `&#39;`、`&quot;`、`&amp;`**（已核实，访客可见）

- 位置：
  - 服务端转义：`blog-server/src/db/models/comment.js:17,34`；`modules/message/message.service.js:74`
  - 前台用文本插值渲染：`blog-web/src/components/comment/CommentItem.vue:60`、`message/MessageCard.vue:50`
  - 弹幕又转义了一次：`blog-web/src/components/message/DanmakuStage.vue:75`
  - 后台同样受影响：`blog-admin/src/pages/CommentsPage.vue:242,320`、`DashboardPage.vue:300`、`MessagesPage.vue:161`
- 原因：Vue 的 `{{ }}` 是按纯文本输出的，不会解码 HTML 实体。服务端先把 `'` 变成 `&#39;` 再发给前端，前端原样显示。弹幕更糟——服务端转义一次、前端 `escapeHtml` 再转义一次，`&` 会变成 `&amp;amp;`。
- 后果：访客写 `It's good` 前台显示 `It&#39;s good`。英文评论、带引号的中文留言基本必中。
- 修法：统一为"入库存原文、出库存原文、只在拼 HTML 的那一处转义"。具体是把 `comment.js` 两个序列化函数里的 `escapeHtml` 去掉、`message.service.js:74` 去掉转义；`DanmakuStage.vue` 保留它自己的 `escapeHtml`（那里是 innerHTML，必须转）。

**P1-2 · 客户端 IP 可伪造，登录 / 评论 / 点赞限频都能绕过**（已核实,但是站长认为这可以接受）

- 位置：`blog-server/src/core/text.js:49-53` 取 `X-Forwarded-For` 的**第一段**；`deploy/nginx.conf.example:51` 用的是 `$proxy_add_x_forwarded_for`（在客户端传来的值后面**追加**）。
- 后果：请求自己带一个 `X-Forwarded-For: 1.2.3.4`，后端就认定 IP 是 1.2.3.4。每次换一个值即可：绕过登录 15 分钟 10 次的限制、评论每小时 10 条的限制、全局 300 次 / 分钟的限制；同一人无限点赞、刷浏览量、刷 PV/UV。
- 连带：`article.service.js:10-24` 的浏览防刷表和限频桶都以 IP 为 key，伪造 IP 还会让这两个内存 Map 持续膨胀。
- 不改代码的修法：Nginx 改为覆盖写 `proxy_set_header X-Forwarded-For $remote_addr;`（部署说明里的配置已经这样写）。彻底修法是 `clientIp` 直接返回 `ctx.ip`（`app.proxy = true` 时 Koa 会按可信代理规则取值）。

**P1-3 · 限频的过期清理用错了时间窗口，长周期限制实际被缩短**（已核实）

- 位置：`blog-server/src/core/rate-limit.js:8-16`
- 原因：`sweep(now, maxWindowMs)` 每 5 分钟跑一次，但用的是**触发它的那次调用**的窗口长度。全局限频（60 秒）对每个 `/api/` 请求都会调用，所以清理几乎总是以 60 秒为界，把**所有**桶里超过 60 秒的记录删掉——包括登录的 15 分钟桶、评论每小时的桶、友链的 24 小时桶。
- 后果：登录限制名义上 15 分钟 10 次，实际最多 5 分钟就重置，爆破速度可到约 3 倍；评论"每小时 10 条"同理。
- 修法：清理时按每个桶自己的窗口过滤。最简单的做法是存入 `{ ts, windowMs }`，或把窗口长度编进 key 前缀后分别清理。

**P1-4 · 登录令牌存在 localStorage，且改密码后旧令牌仍然有效**（已核实）

- 位置：`blog-admin/src/api/http.ts:5-17`；`blog-server/src/modules/auth/auth.service.js:38-49`；`core/jwt.js:8-10`
- 现状：单一 JWT，默认 7 天，无刷新令牌、无服务端吊销。`changePassword` 只改了密码哈希，没有让已签发的令牌失效。
- 后果：令牌一旦被 XSS 或共用电脑窃取，改密码也踢不掉对方，最长 7 天。目前前台没有发现 XSS 注入点（访客内容按纯文本渲染），所以是"防线薄"而非"已有洞"。
- 修法：`user` 表加一列 `tokenVersion`，写进 JWT payload，改密码时 +1，`adminAuthOnly` 校验时比对。这一处改动很小，收益很大。

**P1-5 · 仓库里的部署样例有两处照抄会出问题**（已核实）

- `deploy/nginx.conf.example:39-43, 57-62, 65-69`：这三个 `location` 里自己写了 `add_header`。Nginx 的规则是"location 内只要出现 `add_header`，就不再继承上层的"，所以第 72–74 行的三个安全头在静态资源、上传文件、RSS 上**全部丢失**。上传目录是用户可上传内容的位置，少了 `nosniff` 不合适。
- `deploy/luna-blog.service:24`：`ReadWritePaths` 写死为 `blog-server/uploads`，而 README 第 151 行又建议把 `UPLOAD_DIR` 改到持久化目录。两者不一致时，`app.js:58` 启动即 `mkdirSync` 失败，服务起不来。
- 另：样例没有 `/robots.txt`，且沿用了 P1-2 的 `X-Forwarded-For` 写法。部署说明第 8 节给了修正后的完整配置。

**P1-6 · 在两篇文章之间直接跳转时，后一篇文章的点赞状态和计数是前一篇的**（已核实代码，未在浏览器里复现）

- 位置：`blog-web/src/App.vue:113-115` 的 `<component :is="Component" />` 没有加 `:key`；`blog-web/src/utils/like.ts:43,45` 的 `liked`、`optimisticCount` 只在组件建立时读一次。
- 原因：`/article/1 → /article/2` 属于同一条路由记录，Vue Router 默认**复用同一个组件实例**，文章页里的 `useLikeTarget` 不会重新执行。
- 触发方式：文章页右侧"推荐阅读"（`ArticlePage.vue:174-186`）就是指向其它文章的链接；浏览器前进 / 后退在两篇文章间切换也一样。经过首页或列表页再进另一篇不受影响。
- 后果：给文章 A 点过赞后点"推荐阅读"进入 B，B 的点赞按钮显示"已赞"，数字停在"A 的计数 + 1"，而不是 B 自己的计数。**后端没有问题**（B 实际没被赞），只是前台显示错，刷新页面即恢复。
- 修法：`App.vue:114` 改为 `<component :is="Component" :key="route.fullPath" />`（代价：路径参数变化时页面组件会重建一次）；或者在 `useLikeTarget` 里 `watch(() => options.key())`，key 变了就重置状态。后者更稳。

### P2

**P2-1 · SEO / GEO 基础几乎为零**（已核实）

- 全站共用一个标题：`blog-web/src/App.vue:16-19` 读的是 `route.meta.title`，但 `router/index.ts` 的 16 条路由**没有一条定义了 `meta.title`**，所以每页都是「站名 · 站点描述」。文章页标题里没有文章名。
- `meta description` 永远是站点描述（`App.vue:21-22`）；没有 OG 标签、没有 canonical；`public/` 下只有一个 `favicon.svg`，没有 `robots.txt`、没有 `sitemap.xml`。
- 纯客户端渲染：`index.html` 里只有一个空的 `<div id="app">`，搜索引擎和 AI 抓取器拿到的初始 HTML 没有任何正文。
- 文章 URL 是数字 `/article/123`；分类、标签表里有 `slug` 字段但路由用的是 `:id`，`slug` 存了没用。
- 这与你早先提过的"SEO 和 GEO 是硬指标"直接冲突。如果这个目标仍然成立，需要单独立项（预渲染或 SSR、每页 meta、sitemap、slug 路由）。

**P2-2 · 音乐依赖第三方非官方公开接口**（已核实）

- 位置：`blog-web/src/api/music.ts:8,48-51`；`blog-server/src/modules/site/site-config.service.js:79-85`
- 浏览器直接请求 `https://api.injahow.cn/meting/`（Meting-API 的一个公益实例），拉取网易云 / QQ 音乐歌单和播放地址。可用性完全取决于这个别人维护的实例和上游平台的封堵策略，**随时可能失效**；失败时表现为歌单为空、播放器不显示，不影响其他功能。
- 另外，在已备案域名上通过非官方接口向访客提供版权音乐播放，合规风险需要你自己评估。这一点我不能替你下结论，但你应该知道它存在。

**P2-3 · 文章页的代码高亮 / 公式 / 图表依赖外网 CDN；后台产物缺对应样式**（产物已实测）

- 前台 `ArticlePage.vue:6,138-145` 和 `AboutPage.vue:3` 用了 `MdPreview`，但前台**没有**注册本地扩展（全项目搜不到 md-editor-v3 的 `config(`）。按后台 `editor-extensions.ts:6-8` 注释里对该库默认行为的描述，它会从 unpkg 懒加载 highlight.js / katex / mermaid。国内访客的网络下，代码块可能不高亮、公式显示成源码。
- 已实测构建产物：后台 `dist/assets/*.css` 里 `.hljs`、`.katex` 规则数都是 0（前台 CSS 有 `.hljs`，无 `.katex`）。后台编辑器注册了 JS 实例，但**样式没有随构建带出来**——这一点我是从产物推断的，建议你打开后台编辑器写一段代码和公式实际看一眼。

**P2-4 · 访问统计：每次翻页都做一次全表去重计数，且表只增不删**（已核实）

- 位置：`blog-server/src/modules/visit/visit.controller.js:33`、`visit.service.js:28-33`
- 前台每切换一次路由就 `POST /api/visit`，接口在写一行之后立刻 `COUNT(DISTINCT ip_hash)`。`visit` 表没有任何清理机制，行数 = 历史总 PV。数据量上来后这是一个越来越慢的查询，而且每个访客每次翻页都在触发。
- 修法：PV/UV 改为定时任务算好放进 `site_config`，或至少给接口加内存缓存（比如 1 分钟更新一次）；再加一个按月清理的定时任务。

**P2-5 · 后台的"收到 403 自动跳改密页"是死代码**（已核实）

- 位置：`blog-admin/src/api/http.ts:83` 读 `body?.reason`；而后端把它放在 `body.data.reason`（`error-handler.js:62-67`、`errors.js:28-31`，`docs/API.md:23` 也是这么写的）。
- 后果：这条分支永远不触发。目前不影响主流程（路由守卫靠登录响应里的 `needPasswordChange` 已经拦住了），但当本地缓存的用户信息与服务端状态不一致时，用户只会看到一个错误提示而不会被带走。
- 修法：改成 `body?.data?.reason`。

**P2-6 · 没有数据库迁移机制**（已核实）

- 建表只靠 `sequelize.sync()`（`init-db.js:32`）。它能新增表和列，但**不会修改已有列的类型、不会删列、不会改约束**。上线后第一次需要改字段结构时，没有安全的升级路径。
- 修法：引入 `sequelize-cli` 或 Umzug 做迁移；至少从现在开始每次改表都手写一份 SQL 存进仓库。

**P2-7 · 文档已与代码脱节**（已核实）

- README 第 199–200 行仍说音乐"通过 `/wapi` 代理访问自建 netease-music-api"，实际已改为在线歌单。
- README 第 181 行列出的上传类型没有音频，而 `upload.controller.js:18-28` 实际接受 5 种音频。
- README 第 178 行说"评论 / 留言 / 说说内容统一 HTML 转义后输出"，实际三者策略各不相同（见第十节）。
- README 第 27 行说"依赖版本不使用 `^` / `~`"，而 `blog-admin/package.json:21-30` 有 6 个依赖用了 `^`。
- `docs/API.md` 没有 `music`、`visit` 接口。
- README 自称"改接口先改 API.md"，这条约定在后期的迭代里没有守住。

**P2-8 · 遗留死代码**（已核实）

- 整个后端 `music` 域：`modules/music/`（192 行）、`db/models/music.js`，仍在 `routes/index.js:17,36` 和 `models/index.js:9,52` 注册，`db:init` 仍会建 `music` 表，但前端已不调用。`upload.controller.js:18-28,45,56` 的音频类型也是为它留的。
- 从未被调用的导出：`article.repository.js` 的 `findIdsByTag`、`syncArticleTags`、`countByCategory`、`adjustCommentCount`；`comment.repository.js` 的 `countApproved`；`models/index.js` 的 `syncModels`；`rate-limit.js` 的 `resetRateLimit`（注释写"仅供测试"，但项目没有测试）。

**P2-9 · 搜索关键词里的 `%` 和 `_` 未转义**（已核实）

- 位置：`article.repository.js:52-57,200-205`；`comment.repository.js:47-53`
- 不是注入（参数是预编译的），但搜 `%` 会匹配全部文章，搜 `_` 是单字符通配。前后置 `%` 的 LIKE 也无法走索引。数据量小时无感。

**P2-10 · 点赞不能取消**（已核实,但是站长认为就这样）

- `blog-web/src/utils/like.ts:49`：`if (pending.value || liked.value) return`，已赞后再点无反应；后端 `like.service.js` 也没有 unlike 路径。最初需求写的是"点赞 / 取消"。

**P2-11 · 前台每条评论都没有对应样式——组件用的类名和全局样式写的类名对不上**（已实测，显示效果建议打开页面确认）

- 位置：`blog-web/src/components/comment/CommentItem.vue:34-80` 用的是 `comment-box__item`、`comment-box__avatar`、`comment-box__text`、`comment-box__actions` 等 15 个类名，这个文件没有 `<style>` 块；而 `blog-web/src/styles/index.css:2592-2705` 的评论样式写的是另一套命名：`.comment-item`、`.comment-avatar`、`.comment-main`、`.comment-head`、`.comment-name`、`.comment-badge`、`.comment-actions`、`.comment-replies`、`.comment-time`、`.comment-box`。
- 证据（已实测）：15 个 `comment-box__*` 在 `src` 和构建后的 `dist` CSS 里**定义数都是 0**（产物里能搜到的只是模板里的类名字符串）；反过来，`index.css` 那套 `.comment-*` 在整个 `src` 的模板里**被引用 0 次**。两套命名谁也对不上谁。组件里的新类名是提交 `4719eb5`（"前台视觉还原为原项目原型风格"）引入的。
- 后果：按代码推断，每条评论的头像、昵称、时间、正文、"回复"和点赞按钮之间没有任何布局规则（头像不会变成 42px 圆形、条目之间没有分隔线和间距、按钮没有样式）。文章页和说说页展开的评论列表都用这个组件。外层容器 `CommentSection.vue` 自带 `<style>`，不受影响。
- 修法：二选一——把 `CommentItem.vue` 的类名改回 `index.css` 的那套；或把 `index.css:2592-2705` 这段改名后挪进 `CommentItem.vue` 的 `<style scoped>`，顺手删掉没人用的 `.comment-box`。半小时的活。

**P2-12 · 留言板弹幕的循环开关永远打不开**（已核实）

- 位置：`blog-web/src/components/message/DanmakuStage.vue:43` `loopDanmaku = props.messages.length > 100`；`blog-web/src/views/message/MessagePage.vue:16` `DANMAKU_PAGE_SIZE = 50`。
- 后果：弹幕模式一页只取 50 条，条件恒为假。实际看到的是当页这 50 条弹幕，留言多了以后其余的不会以弹幕出现（卡片模式不受影响）。
- 修法：阈值改成和页大小挂钩，或给弹幕单独取一批。

### P3

| 编号 | 问题 | 位置 |
| --- | --- | --- |
| P3-1 | `comment.js` 文件头带 UTF-8 BOM，第 6 行中文注释已损坏成乱码（全仓仅此一处，已实测） | `blog-server/src/db/models/comment.js:1,6` |
| P3-2 | 用户名不存在时跳过 bcrypt 比较，响应时间可用来枚举用户名；没有刷新令牌机制 | `auth.service.js:18-22` |
| P3-3 | 服务监听所有网卡，依赖防火墙挡 3000 | `server.js:9` |
| P3-4 | 可以给未审核 / 已拒绝的评论点赞 | `comment.service.js:231-233` |
| P3-5 | 改文章状态后返回的数据里 `category` 为 null、`tags` 为空（没带关联查询） | `article.service.js:240` |
| P3-6 | 删除文章 / 说说时不清理对应的通知记录，通知会指向已删内容 | `article.service.js:244-261`、`talk.service.js:72-96` |
| P3-7 | 回复的"回复 @某某"永远显示顶层评论人的昵称，不是实际被回复的人 | `comment.service.js:48-56` |
| P3-8 | 编辑页点"返回列表"且 有未保存内容时会弹两次确认（`handleBack` 一次，路由守卫一次） | `ArticleEditPage.vue:232-259` |
| P3-9 | 编辑资源、相册时无法把描述、图标等可选字段清空（后端用 `??` 回退到旧值） | `resource.service.js:60-62`、`album.service.js:113-115` |
| P3-10 | 正文必填只由后端兜底（编辑器不在 `el-form` 里） | `ArticleEditPage.vue:296-320` |
| P3-11 | 后台每 60 秒轮询一次未读数；后端不可用时会反复弹错误提示 | `blog-admin/src/layouts/AdminLayout.vue` |
| P3-12 | 后台 6 个运行时依赖用 `^` 范围；`prettier` 放在 `dependencies` | `blog-admin/package.json:21-30` |
| P3-13 | `uuid` 中危公告（间接依赖） | 见 3.2 |
| P3-14 | 访问上报先写 `status = 201` 随即被 `ok()` 改回 200；评论接口采集了 `userAgent` 但没有使用 | `visit.controller.js:34-35`、`comment.controller.js:54` |
| P3-15 | 前台入口 JS 886 KB、CSS 511 KB；告警阈值被调到 1500 / 2000 KB | 两个 `vite.config.ts` |
| P3-16 | 无单元测试、无 CI、无 lint 配置 | — |
| P3-17 | 冒烟脚本会留下一个上传文件和若干条通知 | `scripts/smoke-api.mjs:234-241` |
| P3-18 | 关闭评论免审后，前台提交成功的提示仍写"审核通过后展示" | `CommentSection.vue:170` |
| P3-19 | 站点配置里的 `socialLinks[].url`、`pageBanners` 等没有校验协议 | `site-config.service.js:100-106,129` |
| P3-20 | 发留言时会把评论区保存的访客邮箱、网址清空（提交时写死 `email: ''`、`website: ''`） | `blog-web/src/components/message/MessagePublishDialog.vue:67` |
| P3-21 | 默认主题两处不一致：`index.html` 预置脚本在无记录时按 `system`，`theme.ts` 兜底返回 `dark`，首次访问可能先亮后暗 | `blog-web/index.html:15`、`src/stores/theme.ts:17` |
| P3-22 | 后台关闭音乐后，播放器只是被隐藏，正在播的音频要到页面刷新才停（`pause` 写在组件卸载钩子里） | `blog-web/src/components/music/MusicPlayer.vue:208-239`、`App.vue:122` |
| P3-23 | 首页文章列表翻页没有请求序号，快速连点时后发的请求可能被先发的慢请求覆盖 | `blog-web/src/views/home/HomePage.vue:72-86` |
| P3-24 | 接口返回了上一篇 / 下一篇，文章页没有渲染 | `blog-web/src/views/article/ArticlePage.vue` |
| P3-25 | 评论列表加载失败时显示的是「还没有评论，来留下第一条吧」，而不是错误提示（模板只区分加载中 / 为空 / 有数据） | `blog-web/src/components/comment/CommentSection.vue:277-284` |
| P3-26 | 说说卡片里 `talk-time`、`talk-grid__error` 两个类名没有样式定义（图片和按钮由 `.talk-grid img`、`.talk-foot button` 覆盖，主流程不受影响） | `blog-web/src/components/talk/TalkCard.vue:63-74` |
| P3-27 | `SectionTitle.vue` 没有任何引用 | `blog-web/src/components/common/SectionTitle.vue` |

---

## 十二、安全小结

| 检查项 | 结果 |
| --- | --- |
| 注册入口 | 无。`/api/auth` 只有 login / profile / password |
| 默认 / 测试账号 | 无。`db:init` 只建一个管理员且强制首登改密 |
| 管理接口鉴权 | 全部覆盖，无遗漏 |
| 密码存储 | bcrypt，cost 10 |
| SQL 注入 | 全程 Sequelize 参数化；仅有的 3 处原生 SQL（`taxonomy.service.js:84-90`、`dashboard.service.js:104-117`）用的是 `replacements` 或无参数常量 |
| 存储型 XSS | 访客内容（评论、留言、友链）全部按纯文本渲染；唯一用 innerHTML 的弹幕做了转义。Markdown 正文只有管理员能写 |
| 外链 | 全部带 `rel="noopener"`，评论里的网站链接还加了 `nofollow` |
| 上传 | 仅管理员；按 MIME 白名单拒收 svg 和脚本；文件名随机 UUID。不足：只信客户端声明的 MIME，不校验文件头（管理员专属接口，风险低） |
| CSRF | Bearer 令牌，不依赖 Cookie，天然免疫 |
| 安全响应头 | 后端有 helmet（CSP 关闭，静态资源由 Nginx 提供，需在 Nginx 补）；Nginx 样例的 3 个头因 `add_header` 继承规则丢失（P1-5） |
| 敏感信息 | `.env` 未入库；邮箱前台脱敏；访问 IP 只存加盐哈希；生产 500 不回显堆栈 |
| 访客隐私 | 评论区会把访客填的邮箱明文存进浏览器 `localStorage`（`utils/visitor.ts:27-33`），仅用于下次自动填充 |
| 明确缺口 | P1-2、P1-3、P1-4 |

---

## 十三、性能小结

**做得好的**：列表两步查询、GROUP BY 聚合、`koa-compress`、路由懒加载、编辑器重依赖按需加载、图片懒加载、点赞幂等不重复写。

**短板**：

1. 访问统计（P2-4）——唯一会随时间**恶化**的问题。
2. 首包体积（P3-15）——Element Plus 全量注册（`main.ts:21-25` 还注册了全部图标），886 KB 的入口 JS 在移动网络下首屏会慢。
3. 仪表盘一次请求发 13 个 COUNT + 2 条原生 SQL（`dashboard.service.js:11-40`），个人博客规模下可接受。
4. 没有任何 HTTP 缓存：`/api/site-config`、`/api/categories` 等几乎不变的数据每次都查库。
5. 归档接口一次返回全部文章（`article.repository.js:112-119`），几百篇以内无感。
6. 上传的图片原图直出，没有压缩、没有缩略图、没有 WebP 转换。

对一台 2 核 4G 的服务器来说，以上除第 1 条外都不构成近期瓶颈。

---

## 十四、可维护性与扩展性

**优势**

- 后端新增一个功能域的套路非常固定，照着 `resource` 模块（80 + 61 + 16 行）抄一遍即可。
- 接口契约、设计规范、原型档案四份文档齐全，截图 9 张。
- 版本锁定、锁文件入库、Conventional Commits 执行到位（101 次提交信息规范）。
- 部署不耦合：前端无硬编码域名，后端配置全走环境变量。

**负担**

- 没有迁移（P2-6）——这是长期维护最大的隐患。
- 没有测试和 CI：33 项冒烟断言是唯一的回归保障，且需要手动起服务、会写库。
- 文档已开始失真（P2-7），而项目自己的约定是"文档先行"。
- `site_config` 把几十个配置塞进一张 KV 表并整体返回给公开接口（`/api/site-config` 无鉴权返回全部配置，包括后台登录页背景图地址）。目前没有敏感项，但以后往里加东西时要留意。
- TS 7 与 vue-tsc 的兼容靠别名包 `typescript6` 维系，属于前沿选型带来的长期维护成本，生态工具跟上之前需要持续关注。

---

## 十五、上线前检查清单

**必须（否则部署失败或立刻出事）**

- [ ] 处理 P0-1：修路由 base，或决定改用子域名部署
- [ ] Nginx 用覆盖写的 `X-Forwarded-For`（P1-2）
- [ ] 防火墙只开 22 / 80 / 443，确认 3000、3306 不对公网
- [ ] 首次登录完成强制改密

**对外开放前**

- [ ] P1-1 转义错位（否则第一批英文评论就是乱码）
- [ ] P1-3 限频清理
- [ ] P1-4 令牌版本号
- [ ] P1-5 用部署说明里的 Nginx / systemd 配置替换样例
- [ ] P1-6 点赞状态串页（给路由组件加 `:key`，或让 `useLikeTarget` 监听 key）
- [ ] P2-11 评论区类名对齐（改动很小，越早修越省事；修完在浏览器里看一眼评论列表）

**上线后一个月内**

- [ ] P2-4 访问统计缓存与清理
- [ ] P2-5、P2-7、P2-8、P2-12（都是小改动）
- [ ] 备份任务配好并演练过一次恢复
- [ ] 就 P2-2（音乐合规）做出你自己的判断

**按目标决定优先级**

- [ ] 如果 SEO / GEO 仍是硬指标 → P2-1 需要单独立项，它是这份清单里工作量最大的一项

---

## 附录 A · 核实记录

| 结论 | 核实方式 |
| --- | --- |
| P0-1 路由 base | 读已安装 `vue-router/dist` 的 `normalizeBase` 源码；全项目搜 `BASE_URL` 零命中 |
| P1-1 转义错位 | 读服务端两个序列化函数 + 前台 5 处模板 |
| P1-2 XFF | 读 `clientIp` + Nginx 样例第 51 行 |
| CORS 行为 | 读 `node_modules/@koa/cors/index.js`：origin 函数返回空值时 `return await next()`，请求照常放行 |
| P1-5 安全头丢失 | Nginx `add_header` 继承规则 + 样例行号 |
| P2-3 样式缺失 | 在已构建的 `dist/assets/*.css` 里 grep `.hljs`、`.katex` |
| P2-7 / P2-8 | 逐行对照 README 与源码；全项目搜调用点 |
| BOM / 乱码 | `od -c` 看首 3 字节 `EF BB BF`；全仓扫描仅 1 个文件 |
| 接口契约 | 前端 78 个调用点逐条比对后端路由表 |
| 依赖漏洞 | 实际执行 `pnpm audit --prod`（官方源） |
| P1-6 点赞串页 | 读 `App.vue:114`（无 `:key`）+ `like.ts:43-45`（初值只读一次）+ `ArticlePage.vue:174-186`（"推荐阅读"链到其它文章） |
| P2-11 评论区样式 | 对 15 个 `comment-box__*` 逐个在 `src`、`dist` 里数 `.类名` 的定义数（全为 0）；对 `index.css` 的 `.comment-*` 旧类名逐个在模板里数引用数（全为 0） |
| P3-26 说说卡片 | 对 `TalkCard.vue` 的类名逐个数定义数，并读 `index.css:2846-2990` 确认 `.talk-grid img`、`.talk-foot button` 的覆盖范围 |

**更正一条我自己中途的判断**：探查过程中我曾认为"说说卡片样式缺失"，复核后不成立——它的图片和按钮由元素选择器覆盖，只有两个小类名没定义，已降为 P3-26。评论区那条经复核成立，但原因写得更准确了：样式是写了的，是类名对不上（P2-11）。

**没有做到的**：没有运行构建、类型检查、冒烟脚本，所以"当前提交能否通过构建"这一点我**无法确认**，只能说 11 月 26 日 19 点存在构建成功的产物。P1-6、P2-11 两条是读代码得出的，没有在浏览器里实际复现和截图；后台编辑器的实际显示效果、移动端表现、真实并发下的行为，都需要你亲手跑一遍。

## 附录 B · 对我此前说法的更正

之前那份《luna-blog部署提示词》里有 4 处与源码实际情况不符，以本报告和新写的部署说明为准：

1. 我写过"`CORS_ORIGINS` 写错后台会静默拿不到响应"——实际同源部署下不触发跨域检查，写错也没影响；只有跨域才需要精确匹配。
2. 我写过"冒烟脚本会真实修改管理员密码"——实际只在**尚未完成首登改密**时才会改。
3. 我写过"启用音乐需要补 `/wapi/` 反代和 netease-music-api"——项目后来已改为在线歌单，这段已不需要。
4. 我写过"后端由 systemd 守护监听 `127.0.0.1:3000`"——实际代码监听所有网卡，是靠防火墙挡住的。
