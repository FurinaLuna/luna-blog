# luna-blog API 契约（唯一事实来源）

后端：Koa 3 + Sequelize 6 + MySQL 8，监听 `3000`，所有业务接口前缀 `/api`。
前端（blog-web / blog-admin）只能调用本文档列出的接口，字段名以本文档为准，不得臆造。

## 1. 统一响应

成功一律 HTTP 200：

```json
{ "code": 0, "message": "ok", "data": {} }
```

失败一律返回对应的 HTTP 状态码，body 形如：

```json
{ "code": 400, "message": "标题不能为空", "details": [{ "field": "title", "message": "标题不能为空" }] }
```

- `code` 恒等于 HTTP 状态码；`message` 是可直接展示给用户的中文文案。
- `details` 仅在参数校验失败（400）时出现。
- 已知状态码：`400` 参数/业务校验失败、`401` 未登录或 token 失效、`403` 无权限或需先改初始密码、`404` 资源不存在、`409` 冲突（重名等）、`413` 文件过大、`429` 触发限频、`500` 服务器内部错误。
- 需要强制改密码时返回 `403`，且 `data` 为 `{ "reason": "PASSWORD_CHANGE_REQUIRED", "message": "首次登录请先修改初始密码" }`（前端据 `data.reason` 跳转改密页）。

前端 axios 拦截器统一：`response.data.code === 0` 取 `data`；否则用 `message` 弹错（`ElMessage.error`）。`401` 在后台清 token 跳登录；前台静默处理。

## 2. 鉴权

- 只有管理员登录：`POST /api/auth/login`，凭据为服务端初始化的管理员账号。
- 成功后前端带 `Authorization: Bearer <token>`，JWT 有效期 7 天。
- 访客接口（评论、留言、友链申请、点赞）**不需要 token**；服务端按 IP/邮箱限频去重。
- 管理员首个登录 `data.user.needPasswordChange === true`，前端强制跳改密页；服务端对所有 `/api/admin/*` 写接口返回 `403 PASSWORD_CHANGE_REQUIRED`，只放行 `GET /api/auth/profile`、`PUT /api/auth/password`。

权限标记：`—` 公开，`A` 管理员，`A!` 管理员且未完成首登改密时禁止。

## 3. 分页

请求 query：`page`（默认 1）、`pageSize`（默认 10，最大 50）。
响应 `data`：

```json
{ "list": [], "total": 0, "page": 1, "pageSize": 10, "totalPages": 0 }
```

## 4. 数据模型（含返回字段名）

| 模型 | 主要字段 |
| --- | --- |
| User | `id, username, nickname, avatar, email, needPasswordChange, lastLoginAt, createdAt` |
| Article | `id, title, summary, content, cover, categoryId, category{id,name}, tags[{id,name}], status('draft'\|'published'), isRecommend, isTop, views, likeCount, commentCount, readingTime(分钟), publishedAt, createdAt, updatedAt` |
| Category | `id, name, slug, description, sort, articleCount` |
| Tag | `id, name, slug, color, articleCount` |
| Comment | `id, targetType('article'\|'talk'), articleId, talkId, parentId, nickname, email(前台脱敏), website, content, isAdmin, status('pending'\|'approved'\|'rejected'), ip, likeCount, replyTo{nickname}\|null, createdAt, replies[]` |
| Talk | `id, content, images[], likeCount, commentCount, createdAt` |
| Album | `id, name, description, cover, photoCount, createdAt` |
| Photo | `id, albumId, url, title, description, width, height, sort` |
| Message | `id, nickname, content(前台展示), color, status, likeCount, createdAt, ip` |
| Resource | `id, name, url, description, icon(emoji 或图片 URL), category, sort` |
| FriendLink | `id, name, url, avatar, description, status, sort, createdAt` |
| SiteConfig | 扁平对象，见 §9 |
| Notification | `id, type('comment'\|'message'\|'friendlink'\|'system'), title, content, isRead, targetType, targetId, createdAt` |
| Like | 内部表，不直接返回；唯一键 `(targetType, targetId, ip)` |

所有 id 为整数；时间为 ISO 8601 字符串（UTC，前端用 dayjs 本地化展示）；`images` 为 URL 字符串数组。

## 5. 接口清单

### 5.1 认证

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | — | body `{username, password}` → `{token, user}` |
| GET | `/api/auth/profile` | A | → `user` |
| PUT | `/api/auth/password` | A | body `{oldPassword, newPassword}`；成功后 `needPasswordChange=false`；新密码 8–32 位且不能与旧密码相同 |
| GET | `/api/auth/captcha` | 不实现 | 本期不做图形验证码，靠限频 |

### 5.2 仪表盘

| 方法 | 路径 | 权限 | 返回 |
| --- | --- | --- | --- |
| GET | `/api/admin/dashboard` | A | `{counts:{article,published,draft,comment,pendingComment,talk,album,photo,message,pendingMessage,friendLink,pendingFriendLink,views}, recentComments:[Comment], recentArticles:[Article], trend:[{date,articles,comments}]}`（trend 近 7 天） |

### 5.3 文章

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/articles` | — | query `page,pageSize,categoryId,tagId,keyword,sort(latest\|popular)`；仅 published |
| GET | `/api/articles/recommend` | — | query `limit`(默认 6，最大 12)；**只返回 `isRecommend` 的文章，不足不补**（没有推荐文章时返回空数组，首页推荐卡片整块隐藏） |
| GET | `/api/articles/archives` | — | → `[{year, count, months:[{month, count, articles:[{id,title,cover,createdAt}]}]}]`（时间轴页用，按发布年份/月份倒序） |
| GET | `/api/articles/:id` | — | 详情 + `prev{id,title}\|null` + `next{id,title}\|null` + `related[{id,title,cover}]`(同分类/同标签最多 4)；仅 published 可查，浏览数 +1（同 IP+文章 1 小时内不重复计） |
| POST | `/api/articles/:id/like` | — | 按 IP 去重 → `{liked:true, likeCount}`；重复点击返回 `{liked:true, likeCount}` 幂等（不报错） |
| POST | `/api/admin/articles` | A! | body 见下，缺省 `status='draft'` |
| PUT | `/api/admin/articles/:id` | A! | 同上，全量更新 |
| PATCH | `/api/admin/articles/:id/flags` | A! | body `{isRecommend?, isTop?, status?}` 局部更新 |
| DELETE | `/api/admin/articles/:id` | A! | 连带清理评论与点赞 |
| GET | `/api/admin/articles` | A | query 额外 `status(draft\|published)`、`keyword`；按 `updatedAt` 倒序 |
| GET | `/api/admin/articles/:id` | A | 编辑器回显用：任意状态均可读，含完整 `content` 与 `tags[]`（`tagIds` 由前端从 `tags` 取 id） |

文章写入 body：`{title(1-100), summary(≤200), content, cover, categoryId, tagIds:[], status, isRecommend, isTop, readingTime?}`；`readingTime` 缺省由正文长度估算（每 400 字 1 分钟，最少 1）。`summary` 为空时取正文前 160 字。

### 5.4 分类 / 标签

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/categories` | — |
| GET | `/api/tags` | — |
| POST/PUT/DELETE | `/api/admin/categories[/:id]` | A! |
| POST/PUT/DELETE | `/api/admin/tags[/:id]` | A! |

分类：`{name(必填唯一), slug?, description?, sort?}`；标签：`{name(必填唯一), slug?, color?}`。删除分类时其下文章 `categoryId` 置空；删除标签解除关联。重名 → `409`。

### 5.5 评论（核心改动：访客免登录 + 审核制）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/comments` | — | query `targetType(article\|talk), targetId, page, pageSize`；只返回 approved；顶层分页，每条带 `replies[]`（最多 50 条，approved） |
| POST | `/api/comments` | — | body `{targetType, articleId?, talkId?, parentId?, nickname(1-20), email, website?, content(2-500)}`；**无 token**，落库 `status='pending'`，返回 `{id, status:'pending'}` 与提示「评论已提交，审核通过后展示」 |
| POST | `/api/comments/:id/like` | — | 按 IP 去重 → `{liked, likeCount}` |
| GET | `/api/admin/comments` | A | query `page,pageSize,status,targetType,keyword` |
| PATCH | `/api/admin/comments/:id/review` | A! | body `{status:'approved'\|'rejected'}` |
| POST | `/api/admin/comments/:id/reply` | A! | body `{content}`；以管理员身份创建子评论，直接 approved |
| DELETE | `/api/admin/comments/:id` | A! | 级联删除子回复 |

限频：同 IP 每 60 秒最多 1 条；同 IP 每小时 10 条；同邮箱每小时 5 条 → 超限 `429`「评论太频繁，请稍后再试」。邮箱必须合法，`email` 前台展示时脱敏为 `ab***@xx.com`。内容含敏感词 → `400`「内容包含敏感词，请修改后再提交」。正文服务端转义 HTML（`<>&"'`），前端按纯文本渲染。

### 5.6 说说

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/talks?page&pageSize` | — |
| POST | `/api/talks/:id/like` | — |
| POST/PUT/DELETE | `/api/admin/talks[/:id]` | A! |

写入 body：`{content(1-1000), images?: string[]}`。

### 5.7 相册

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/albums` | — | 含 `cover, photoCount` |
| GET | `/api/albums/:id` | — | → `{...album, photos:[Photo]}` |
| POST/PUT/DELETE | `/api/admin/albums[/:id]` | A! | `{name, description?, cover?, sort?}`；删相册连带删照片记录 |
| POST | `/api/admin/albums/:id/photos` | A! | `{url, title?, description?, width?, height?, sort?}`，可批量 `{photos:[...]}` |
| PUT/DELETE | `/api/admin/photos/:id` | A! | |

### 5.8 留言板（卡片 / 弹幕两模式共用数据）

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/messages?page&pageSize` | — | 仅 approved；`data` 额外含 `total` 供弹幕全量取用（弹幕模式请求 `pageSize=50` 循环加载） |
| POST | `/api/messages` | — | `{nickname(1-20), content(1-200), color?}`；无 token，`status='pending'`；限频同评论（IP 60 秒 1 条、每小时 10 条） |
| GET | `/api/admin/messages` | A | `status` 过滤 |
| PATCH | `/api/admin/messages/:id/review` | A! | `{status}` |
| DELETE | `/api/admin/messages/:id` | A! | |
| POST | `/api/messages/:id/like` | — | 按 IP 去重 |

### 5.9 资源导航

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/resources` | — |
| POST/PUT/DELETE | `/api/admin/resources[/:id]` | A! |

`{name, url, description?, icon?, category?, sort?}`。

### 5.10 友链

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/friend-links` | — | 仅 approved，按 sort |
| POST | `/api/friend-links` | — | 访客申请 `{name, url, avatar?, description?}` → pending + 通知；同 URL 每 IP 每天 1 次 |
| GET | `/api/admin/friend-links` | A | 全部（待审核优先） |
| POST | `/api/admin/friend-links` | A! | `{name,url,avatar?,description?,sort?,status?}`；管理员直接新增，默认 approved，不受访客限频 |
| PATCH | `/api/admin/friend-links/:id/review` | A! | `{status}` |
| PUT | `/api/admin/friend-links/:id` | A! | `{name,url,avatar,description,sort,status}` |
| DELETE | `/api/admin/friend-links/:id` | A! | |

### 5.11 站点配置

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/site-config` | — | 返回扁平配置对象（见下），未设置的 key 返回缺省值 |
| PUT | `/api/admin/site-config` | A! | body 为部分对象，按 key 合并保存 |
| GET | `/api/site-stats` | — | `{article, category, tag, comment, talk, photo, message, views, words, visit:{pv,uv}}`；`views`=文章阅读数之和，`visit.pv`=页面浏览总数（含旧站迁移基数），`visit.uv`=去重访客数（含基数） |
| POST | `/api/visit` | — | 前台每次路由切换上报 `{path, referer?}`；按 IP 哈希去重统计 UV，限频 60 次/分/IP；返回 `{recorded:true}` |

配置 key：`siteName, siteDescription, siteKeywords, author, avatar, email, github, announcement, heroTitle, heroSubtitle, about(富文本 Markdown), footerText, icp, startDate, socialLinks[{name,url,icon}], commentNeedReview(true), pageBanners(13 个页面键 → 横幅图 URL), visitBasePv / visitBaseUv(旧站迁移的访问量 / 访客数基数，统计时叠加在真实值上)

`pageBanners` 为页面横幅图映射（值是图片 URL，最长 500，空字符串表示使用内置天空渐变横幅）：
`{ home, archives, category, tag, article, talks, albums, album, resources, friends, message, about, search }`。
后端读取时与缺省对象做浅合并，因此只 PUT 其中几个 key 不会把其它页面冲成空。

### 5.12 通知

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| GET | `/api/admin/notifications?page&pageSize&unreadOnly` | A |
| GET | `/api/admin/notifications/unread-count` | A → `{count}` |
| PATCH | `/api/admin/notifications/:id/read` | A |
| POST | `/api/admin/notifications/read-all` | A |

写入时机：新评论、新留言、新友链申请、系统事件（各生成一条 `isRead=false`）。

### 5.13 上传

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| POST | `/api/admin/upload` | A! | `multipart/form-data`，字段名 `file`；图片 jpg/png/webp/gif/avif ≤ 5MB，其它文件 ≤ 10MB；返回 `{url, name, size, mime}`；URL 形如 `/uploads/2026/11/uuid.png`（相对路径，前端自动拼 origin） |

### 5.14 RSS

`GET /rss.xml`（不在 `/api` 下）：RSS 2.0，最新 20 篇 published，绝对链接由 `SITE_URL` 环境变量拼接。

## 6. 限频汇总

| 场景 | 规则 | 超限响应 |
| --- | --- | --- |
| 登录 | 同 IP 15 分钟 10 次（失败计数） | `429` |
| 评论 | IP 60s/条、IP 10 条/h、邮箱 5 条/h | `429` |
| 留言 | IP 60s/条、IP 10 条/h | `429` |
| 友链申请 | IP 24h 1 条 | `429` |
| 点赞 | IP + 目标 10s 1 次（重复点赞幂等不报错，仅防刷） | `429` |
| 全局 | 同 IP 每分钟 300 次 | `429` |

限频在内存实现（Map + 滑动窗口，定时清理），不做持久化；单实例部署，README 中说明多实例需换 Redis。

## 7. 错误文案约定

后端直接返回面向用户的中文 `message`，例如：`用户名或密码错误`、`该分类下还有文章，无法删除`、`评论不存在`、`文件超过大小限制（5MB）`、`内容包含敏感词，请修改后再提交`。前端不再自行拼文案，只做兜底（网络错误 →「网络异常，请稍后重试」）。

## 8. 与旧项目差异（重写点，勿照抄）

- 评论：旧项目需登录才能评论；新项目访客填「昵称+邮箱」即可，默认待审核，后台新增评论管理/审核。
- 后台：旧项目无评论管理、无 RBAC、无真实通知标记；新项目补齐评论审核、通知未读、仪表盘真实统计。
- 点赞：旧项目单一 like 表两段式接口且有竞态；新项目按 `(targetType,targetId,ip)` 唯一键 + 事务幂等。
- 新增：RSS、搜索、站点配置读写、访客限频、首登强制改密、本地文件上传。
- 移除：聊天室、纯静态资源硬编码、MinIO/七牛依赖、iciba 每日一句替换敏感词。
