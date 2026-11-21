# 参考后端规格（vue3-blog / blog-server）

> 来源：`_ref/vue3-blog/blog-server`（Koa 2 + koa-router + Sequelize 6 + MySQL2 + koa-body + bcryptjs + jsonwebtoken）。只读侦察产出，供新库设计参照。
> 源码 → 表：`src/model/*` 每模型文件末尾自己 `Model.sync({ alter: true })`；`src/db/seq.js` 统一 `define`（`timestamps: true` 但多数模型内部 `timestamps:false` + `freezeTableName:true`，时间需业务层手写）。
> 端口：`APP_PORT=8888`；WebSocket 独立 `8889`（硬编码）。路由无全局前缀，根路由 `GET /` 返回文本"欢迎 这是后台server首页"；`/swagger`、`/swagger.json` 由 `utils/swagger.js` 挂载。

## 1. 环境变量（.env / `src/config/config.default.js`）

| key | 值/说明 |
|---|---|
| `APP_PORT` | 8888 |
| `MYSQL_HOST` `MYSQL_PORT` `MYSQL_USER` `MYSQL_PASSWORD` `MYSQL_DB` | 127.0.0.1 / 3306 / root / – / online_blog |
| `ADMIN_PASSWORD` | 超级管理员 admin 的明文密码；空则登录报"请在env配置文件里添加超级管理员密码" |
| `UPLOADTYPE` | `'local'` \| `qiniu` \| `minio` \| `online` |
| `ACCESSKEY` `SECRETKEY` `BUCKET` `REGIN` | 七牛 / MinIO 凭证；`DOMAIN` = 访问域名；`MINIO_PATH` |
| `JWT_SECRET` | `blog`（默认值，弱） |

sequelize：`dialect: mysql`、`timezone: "+08:00"`。

## 2. 数据模型（18 张表，字段名精确）

约定：`id` 为每表自增主键（下表省略）；`createdAt`/`updatedAt` 为 `DATE`，getter 输出 `"YYYY-MM-DD HH:mm:ss"`。**全库无物理外键约束**，关联全靠代码层 id。

### article 域
**`blog_article`**（timestamps:false + freezeTableName）

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| article_title | STRING | ✔ | – | 标题（业务层判重） |
| author_id | INTEGER | – | 1 | 作者 user.id |
| category_id | INTEGER | ✔ | – | → blog_category.id |
| article_description | STRING | – | – | 摘要 |
| article_content | TEXT | – | – | 正文（markdown） |
| article_cover | STRING(1234) | – | `https://mrzym.gitee.io/blogimg/html/rabbit.png` | 封面 |
| is_top | INTEGER | – | 2 | 1=置顶 / 2=普通 |
| order | INTEGER | – | null | 置顶排序，越小越前 |
| status | INTEGER | – | 1 | 1公开 / 2私密 / 3草稿箱 |
| type | INTEGER | – | 1 | 1原创 / 2转载 / 3翻译 |
| origin_url | STRING | – | – | 转载原文链接 |
| view_times | INTEGER | – | 0 | 阅读数 |
| thumbs_up_times | INTEGER | – | 0 | 点赞数（冗余计数） |
| reading_duration | DOUBLE | – | 0 | 阅读时长（ms 累加） |

**`blog_article_tag`**：`article_id` INTEGER、`tag_id` INTEGER（多对多桥表，无其他列，无唯一索引）。

**`blog_category`**：`category_name` STRING(55) UNIQUE。
**`blog_tag`**：`tag_name` STRING(55) UNIQUE。

### comment 域
**`blog_comment`**

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| parent_id | INTEGER | – | null | 父评论 id；**null = 一级评论** |
| type | INTEGER | – | – | 1文章 / 2说说 / 3留言 |
| for_id | INTEGER | – | – | 被评论对象 id（article.id / talk.id / message.id） |
| from_id | INTEGER | – | – | 评论人 user.id（游客为 null 或 0） |
| from_name | STRING | – | – | 评论人昵称 |
| from_avatar | STRING(555) | – | – | 评论人头像 |
| to_id | INTEGER | – | – | 被回复人 user.id |
| to_name | STRING | – | – | 被回复人昵称 |
| to_avatar | STRING(555) | – | – | 被回复人头像 |
| content | STRING(555) | ✔ | – | 内容 |
| thumbs_up | INTEGER | – | 0 | 点赞数 |
| ip | STRING | – | – | 存 `ip.split(":").pop()`（去掉端口/IPv6 段） |

层级：**仅两级**。查询一级强制 `parent_id: null`；二级 `where {type, for_id, parent_id}` 按 `createdAt ASC`。删除：`parent_id>0` 只删本条；否则删本条 + 所有 `parent_id = id` 的子条。

### 互动域
**`blog_like`**：`type` INTEGER ✔（1文章 / 2说说 / 3留言 / 4评论）、`for_id` INTEGER ✔、`user_id` INTEGER（空=游客）、`ip` STRING ✔。**无唯一索引**，去重靠应用层先查后插。

**`blog_notify`**：`message` STRING(555)、`user_id` INTEGER ✔（收件人）、`type` INTEGER（1文章/2说说/3留言/4友链）、`to_id` INTEGER（跳转目标 id）、`isView` INTEGER 默认 1（**1=未读 / 2=已读**，反直觉）。

**`blog_talk`**：`content` STRING(255)、`user_id` INTEGER、`status` INTEGER 默认 1（1公开/2私密/3回收站）、`is_top` INTEGER 默认 2、`like_times` INTEGER 默认 0。
**`blog_talk_photo`**：`talk_id` INTEGER、`url` STRING(255)。说说详情/列表附 `talkImgList: string[]`（url 数组）；写说说时先建主表再批量插图片，更新时先 `deleteTalkPhoto(id)` 再重建。

**`blog_message`**（弹幕墙留言）：`message` STRING(555)、`color` STRING 默认 `#676767`、`font_size` INTEGER 默认 12、`font_weight` INTEGER 默认 500、`bg_color` STRING、`bg_url` STRING、`user_id` INTEGER、`nick_name` STRING（游客随机 `randomNickname("游客",5)`）、`tag` STRING、`like_times` INTEGER 默认 0。
> 弹幕渲染字段即 `color` / `font_size` / `font_weight` / `bg_color` / `bg_url`。

**`blog_links`**：`site_name` STRING(55)、`site_desc` STRING、`site_avatar` STRING(555)、`url` STRING、`status` INTEGER（1待审核 / 2审核通过）、`user_id` STRING（注意是 STRING）。

### 媒体域
**`blog_photo`**：`album_id` INTEGER ✔（→ blog_photo_album.id，无 FK）、`url` STRING(555)、`status` INTEGER 默认 1（1正常 / 2回收站）。相册与照片 1:N，删相册**不级联**删照片。
**`blog_photo_album`**：`album_name` STRING(26)、`album_cover` STRING(555)、`description` STRING(55)。

### 站点域
**`blog_config`**（单行配置表）：`blog_name` STRING(55) 默认"小张的博客"、`blog_avatar` STRING 默认 rabbit.png、`avatar_bg`、`personal_say`、`blog_notice`、`qq_link`、`we_chat_link`、`github_link`、`git_ee_link`、`bilibili_link`、`view_time` BIGINT 默认 0（全站访问量）、`we_chat_group`、`qq_group`、`we_chat_pay`、`ali_pay`。
**`blog_header`**（页面背景图）：`route_name` STRING(555)、`bg_url` STRING。前台按 `route_name` 匹配当前路由取背景。
**`blog_user`**：`username` STRING(255) UNIQUE、`password` CHAR(64) NOT NULL（bcrypt）、`role` INTEGER 默认 2（1管理员/2普通用户）、`nick_name` STRING 默认 ""、`qq` STRING 默认 ""、`ip` STRING 默认 ""、`avatar` STRING 默认 ""。
**`blog_chat`**：`user_id` INTEGER、`content` STRING(555)、`content_type` STRING(55)（text/img）。**已被砍掉**——仅残留 model / service / websocket 引用，路由 `src/router/chat.js` 仍注册但前端不再使用，新设计请直接删除。
**`blog_recommend`**：`title` STRING(55)、`link` STRING。**死表**——全库无 controller/service/router 引用（grep 仅模型自身 + result 里一个同名错误码），不要据此设计推荐功能。

## 3. 路由总表

图例：`A`=需登录（`auth` 中间件）；`AD`=管理员 `role===1`（`needAdminAuth`）；`SU`=非 admin 超管账号（`needAdminAuthNotNeedSuper`，role=1 且 username!=='admin'）；`ROOT`=`isSuperAdmin`（禁止 username==='admin'）；`–`=匿名可访问。

### article `/article`

| 方法 | 路径 | 鉴权 | 关键参数 | 返回要点 |
|---|---|---|---|---|
| POST | `/article/add` | A+SU | body `{article_title, author_id, category:{id?, category_name}, article_content, article_description, article_cover, is_top, order, status, type, origin_url, tagList:[{id?,tag_name}]}` | 事务创建；分类/标签不存在则自动建；成功 `result` 带新文章 |
| PUT | `/article/update` | A+SU | 同上 + `id` | 先删 `blog_article_tag` 再重建 |
| PUT | `/article/updateTop/:id/:is_top` | A+SU | path | 置顶切换 |
| DELETE | `/article/delete/:id/:status` | A+SU | path：`status`≠3→改 status=3（草稿/回收）；=3→物理删 + 删 tag 关联 + 删封面文件 | – |
| PUT | `/article/revert/:id` | A+SU | path | 从草稿恢复 |
| PUT | `/article/isPublic/:id/:status` | A+SU | path | 1↔2 公开/私密切换 |
| POST | `/article/titleExist` | – | `{id?, article_title}` | 布尔 |
| POST | `/article/getArticleList` | A | `{current, size, article_title, is_top, status, tag_id, category_id, create_time}` | `{current,size,list,total}`；**默认 `status:[1,2]`，不含草稿**；list 项 exclude `article_content`/`origin_url`，附 `categoryName`、`tagNameList` |
| GET | `/article/blogHomeGetArticleList/:current/:size` | – | path | status=1，`order: is_top ASC, order ASC, createdAt DESC` |
| GET | `/article/blogTimelineGetArticleList/:current/:size` | – | path | 按年分组 `[{year, articleList:[{id,article_title,article_cover,createdAt}]}]` |
| POST | `/article/getArticleListByTagId` | – | `{id, current, size}` | 分页 |
| POST | `/article/getArticleListByCategoryId` | – | `{id, current, size}` | 分页 |
| GET | `/article/getRecommendArticleById/:id` | – | path | `{previous, next, recommend}`，见 §7 |
| GET | `/article/getArticleListByContent/:content` | – | path | 正文 LIKE、status=1、limit 8、`view_times DESC`，返回截取片段 |
| GET | `/article/getHotArticle` | – | – | status=1，`view_times DESC` limit 5 |
| PUT | `/article/like/:id` | – | path | 限流 10/min；`thumbs_up_times +1`（**本身不去重**） |
| PUT | `/article/cancelLike/:id` | – | path | 限流 10/min；`-1` |
| PUT | `/article/addReadingDuration/:id/:duration` | – | path，duration=ms | `reading_duration` increment |
| GET | `/article/getArticleById/:id` | – | path | 详情：`view_times +1`，附 `tagIdList`、`tagNameList`、`authorName`、`categoryName` |
| POST | `/article/updateUrl` | – | 无 | 遗留数据修补：把所有 cover 的 `http://img.mrzym.top/` 替换为 `http://mrzym.top/online/`（**无鉴权，可直接触发写全表，勿照抄**） |

### category `/category`

| 方法 | 路径 | 鉴权 | 参数 | 返回 |
|---|---|---|---|---|
| POST | `/category/add` | A+SU | `{category_name}` | 校验唯一 |
| PUT | `/category/update` | A+SU | `{id, category_name}` | – |
| POST | `/category/delete` | A+SU | `{idList}` | 校验是否仍被文章引用 |
| POST | `/category/getCategoryList` | – | `{current,size,category_name?}` | `{current,size,list,total}` |
| GET | `/category/getCategoryDictionary` | – | – | `[{id, category_name}]` 字典反显 |

### tag `/tag`

| 方法 | 路径 | 鉴权 | 参数 |
|---|---|---|---|
| POST | `/tag/add` | A+AD | `{tag_name}` |
| PUT | `/tag/update` | A+AD | `{id, tag_name}` |
| POST | `/tag/delete` | A+AD | `{idList}`（校验引用） |
| POST | `/tag/getTagList` | – | `{current,size,tag_name?}` |
| GET | `/tag/getTagDictionary` | – | `[{id, tag_name}]` |

### comment `/comment`

| 方法 | 路径 | 鉴权 | 关键参数 | 返回/行为 |
|---|---|---|---|---|
| POST | `/comment/add` | – | `{type, for_id, author_id, from_id, from_name, from_avatar, content}` | 限流 20/min；敏感词过滤；`from_id != author_id` 时给作者发 notify |
| POST | `/comment/apply` | – | 上述 + `{parent_id, to_id, to_name, to_avatar}` | 限流 20/min；`from_id != to_id` 时给被回复人发 notify |
| PUT | `/comment/thumbUp/:id` | – | path | 限流 10/min；`thumbs_up +1` |
| PUT | `/comment/cancelCommentLike/:id` | – | path | 限流 10/min；`-1` |
| DELETE | `/comment/delete/:id/:parent_id` | A | path | 前台作者自删；级联规则见 §2 |
| DELETE | `/comment/backDelete/:id/:parent_id` | A+SU | path | 后台删 |
| POST | `/comment/backGetCommentList` | – | `{current,size,content,to_name,from_name,time}` | 分页 |
| POST | `/comment/frontGetParentComment` | – | `{current,size,type,for_id,user_id,order}` | `order==="new"`→`createdAt DESC`，否则 `thumbs_up DESC`；强制 `parent_id:null`；项附 `ipAddress`、`is_like` |
| POST | `/comment/frontGetChildrenComment` | – | 上述 + `parent_id` | `createdAt ASC` |
| POST | `/comment/getCommentTotal` | – | `{for_id, type}` | 数字 |

### message `/message`（留言弹幕墙）

| 方法 | 路径 | 鉴权 | 参数/行为 |
|---|---|---|---|
| POST | `/message/add` | – | 限流 5/min；body `{message, color, font_size, font_weight, bg_color, bg_url, user_id, tag, nick_name}`；无 user_id 则随机昵称；敏感词过滤；`user_id != 1` 时给 admin(user_id=1) 发 type=3 notify |
| POST | `/message/update` | A | 限流 5/min；`{id, message, color, font_size, font_weight, bg_color, bg_url, tag}` |
| PUT | `/message/delete` | A | 限流 5/min；`{idList}` |
| PUT | `/message/backDelete` | A+SU | `{idList}` |
| PUT | `/message/like/:id` | – | 限流 5/min；`like_times +1` |
| PUT | `/message/cancelLike/:id` | – | 限流 5/min；`-1` |
| POST | `/message/getMessageList` | – | `{current,size,message,time,tag,user_id,ip}`；`createdAt DESC`；项附 `nick_name`/`avatar`（按 user_id 回查，游客用行内 nick_name）、`is_like`(type=3)、`comment_total`(type=3) |
| GET | `/message/getAllMessage` | – | 不分页全量 `{list,total}` |
| GET | `/message/getHotTagList` | – | 按 tag 出现次数降序取前 10 `[{tag,count}]` |

### talk `/talk`（说说）

| 方法 | 路径 | 鉴权 | 参数 |
|---|---|---|---|
| POST | `/talk/publishTalk` | A+SU | `{content, user_id, status, is_top, talkImgList:[{url}]}` |
| PUT | `/talk/updateTalk` | A+SU | 同上 +`id`（重建 talk_photo） |
| DELETE | `/talk/deleteTalkById/:id/:status` | A+SU | status 1/2 → 置 3；否则物理删 + 删图片 |
| PUT | `/talk/togglePublic/:id/:status` | A+SU | – |
| PUT | `/talk/toggleTop/:id/:is_top` | A+SU | – |
| PUT | `/talk/revertTalk/:id` | A+SU | status→1 |
| POST | `/talk/getTalkList` | – | `{current,size,status}`；`is_top ASC, createdAt DESC` |
| GET | `/talk/getTalkById/:id` | – | 附 `talkImgList:[]` |
| PUT | `/talk/like/:id`、`/talk/cancelLike/:id` | – | 限流 5/min；`like_times ±1` |
| POST | `/talk/blogGetTalkList` | – | `{current,size,user_id,ip}`；仅 status=1；附 `talkImgList`/`nick_name`/`avatar`/`is_like`(type=2) |

### photo `/photo`

| 方法 | 路径 | 鉴权 | 参数 |
|---|---|---|---|
| POST | `/photo/add` | A+SU | `{photoList:[{album_id,url}]}` 批量 `bulkCreate` |
| PUT | `/photo/delete` | A+SU | `{imgList, type}` → status=2（回收站） |
| PUT | `/photo/revert` | A+SU | `{idList}` → status=1 |
| POST | `/photo/getPhotoListByAlbumId` | – | `{current,size,id,status}`（id=album_id） |
| GET | `/photo/getAllPhotosByAlbumId/:id` | – | 全量且 status=1 |

### photoAlbum `/photoAlbum`

| 方法 | 路径 | 鉴权 | 参数 |
|---|---|---|---|
| POST | `/photoAlbum/add` | A+SU | `{album_name, album_cover, description}` |
| DELETE | `/photoAlbum/delete/:id` | A+SU | path（不级联删照片） |
| PUT | `/photoAlbum/update` | A+SU | `{id, album_name, album_cover, description}` |
| POST | `/photoAlbum/`（注意根路径） | – | `{current,size,album_name?}` 分页 |
| GET | `/photoAlbum/getAllAlbumList` | – | 全量 |

### links `/links`

| 方法 | 路径 | 鉴权 | 参数 |
|---|---|---|---|
| POST | `/links/add` | – | 限流 5/min；`{site_name,site_desc,site_avatar,url,user_id}`，新建默认 status=1；写 notify（user_id=1, type=4） |
| POST | `/links/frontUpdate` | – | 同上（申请人自改）；也发 notify |
| POST | `/links/backUpdate` | A+SU | 后台改 |
| PUT | `/links/delete` | A+SU | `{idList}` |
| PUT | `/links/approve` | A+SU | `{idList}` → status=2 |
| POST | `/links/getLinksList` | – | `{current,size,time,status,site_name}`；`createdAt ASC` |

### config / header / statistic / like / notify / upload

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | `/config/update` | A+AD | 整行 upsert（按 id） |
| GET | `/config/` | – | 返回 blog_config 首行；无记录返回 `tipsResult`（`code:100`，"需要初始化"） |
| PUT | `/config/addView` | – | 限流 60min/100 次；`view_time +1` |
| POST | `/pageHeader/addOrUpdate` | A+AD | `{id?, route_name, bg_url}` |
| POST | `/pageHeader/delete` | A+AD | `{idList}` |
| GET | `/pageHeader/getAll` | – | 全量 `blog_header` |
| GET | `/statistic/` | – | `{articleCount(status=1), tagCount, categoryCount, userCount}` |
| POST | `/like/addLike` | – | 限流 10/min；见 §5 |
| POST | `/like/cancelLike` | – | 限流 10/min |
| POST | `/like/getIsLikeByIdOrIpAndType` | – | `{for_id,type,user_id?}` → 布尔 |
| PUT | `/notify/update/:id` | – | 置 `isView=2`（已读），**无鉴权** |
| PUT | `/notify/delete/:id` | – | 物理删，**无鉴权** |
| POST | `/notify/getNotifyList` | – | `{current,size,userId}`；`isView ASC, createdAt DESC`；`{current,size,total,list}` |
| POST | `/upload/img` | – | 限流 100/min；form-data 字段名 `file`；见 §8 |
| POST | `/chat/add`、DELETE `/chat/deleteOne/:id`、POST `/chat/delete`、POST `/chat/getChatList` | A / – / A+AD / – | **已砍** |

### user `/user`

| 方法 | 路径 | 鉴权 | 参数/返回 |
|---|---|---|---|
| POST | `/user/register` | – | 限流 3/min；`{username, password, nick_name?}`；`username` 仅 `[A-Za-z0-9]+`；禁 `admin`；bcrypt(salt 10) 入库；返回 `{id, username}` |
| POST | `/user/login` | – | `{username, password}`；返回 `{token, username, role, id, ipAddress}` |
| PUT | `/user/updateOwnUserInfo` | A+ROOT | `{nick_name, avatar, qq}`；换头像时删旧文件 |
| PUT | `/user/updatePassword` | A+ROOT | `{password, password1, password2}`；校验旧密码（`id==2` 测试号禁改） |
| PUT | `/user/updateRole/:id/:role` | A+AD | path |
| PUT | `/user/adminUpdateUserInfo` | A+AD | 管理员改他人信息 |
| POST | `/user/getUserList` | A | `{current,size,nick_name,role}` 分页 |
| GET | `/user/getUserInfoById/:id` | – | 剔除 `password`/`username`/`ip`，附 `ipAddress`；`id=5201314` 特判返回超级管理员 |

## 4. 统一响应 / 分页 / 错误码

`src/result/index.js`：
- 成功：`result(message, result)` → `{ code: 0, message, result }`（`result` 可为对象/数组/布尔）。
- 提示：`tipsResult(message)` → `{ code: 100, message }`（"无数据/需要初始化"类，**HTTP 仍 200**）。
- 报错：`throwError(code, message)` → `{ code, message }`，由 `ctx.app.emit("error", ...)` 走 `app/errorHandler.js`：`code===100002`→HTTP 403，`code===100016`→HTTP 401，其余→HTTP 500，**body 就是 err 本体**（无 `result` 字段，无堆栈）。

错误码（`ERRORCODE`）：`USER 100001`、`AUTH 100002(→403)`、`TAG 100003`、`CATEGORY 100004`、`ARTICLE 100005`、`UPLOAD 100006`、`CONFIG 100007`、`STATISTIC 100008`、`PHOTOALBUM 100009`、`PHOTO 100010`、`TALK 100011`、`MESSAGE 100012`、`RECOMMEND 100012`（**与 MESSAGE 重复**）、`HEADER 100013`、`LINKS 100014`、`COMMENT 100015`、`AUTHTOKEN 100016(→401)`、`NOTIFY 100017`、`LIKE 100018`、`CHAT 100019`、`TIPS 111111`。
> 注意：`comment` 控制器误用 `ERRORCODE.CATEGORY` 作为自身错误码。

分页：所有分页接口 body 传 `{ current, size }`（**无默认值，必须前端传**）；服务层 `offset = (current - 1) * size`、`limit = size * 1`；返回固定 `{ current, size, list, total }`（`getAllMessage` 例外：`{list,total}` 无 current/size）。

## 5. 点赞机制

- **单一共用表** `blog_like`，`type` 区分目标：1文章、2说说、3留言、4评论；`for_id` 为目标主键。文章点赞与评论点赞共用此表。
- **去重 key 双轨**（`controller/like/index.js`）：
  - 未登录/无 `user_id`：唯一性 = `(for_id, type, ip)`；`ip = (X-Real-IP || X-Forwarded-For || ctx.ip).split(":").pop()`。
  - 已登录（body 带 `user_id`）：唯一性 = `(for_id, type, user_id)`。
  - 重复 → 报"您已经点过赞了"；取消未点过 → "您没有点过赞"。
- `addLike` 写一行 `blog_like` 后**分发计数**到业务表：type1→`blog_article.thumbs_up_times`、type2→`blog_talk.like_times`、type3→`blog_message.like_times`、type4→`blog_comment.thumbs_up`。`cancelLike` 反向 `decrement`。
- 另有 `/article/like/:id`、`/comment/thumbUp/:id`、`/talk/like/:id`、`/message/like/:id` 直接改计数（**不带去重**）；前端是"先 `/like/addLike` 去重、再调各自 like 接口改数"的两段式。
- `is_like` 字段：列表里按 `user_id`（有）或 `ip`（无）查 `blog_like` 得出。
- 缺陷：无唯一索引 + 先查后插 = 并发竞态；`ip` 只在 IPv4 后拼接安全。
- `sql/online_blog.sql` 与 `db/online_blog.sql` 为初始建库脚本（含字段注释），可作字段注释来源。

## 6. 通知 notify

- 只有 `create`（`addNotify`，被 controller 直接当函数调，**不走 HTTP 路由**）、`update`（置已读）、`delete`、`list`。
- 写入时机：
  1. 评论：`from_id != author_id` → 通知文章/说说/留言作者（type=评论所在 type，`to_id=for_id`）。
  2. 回复：`from_id != to_id` → 通知被回复人。
  3. 留言：`user_id != 1` → 通知 `user_id=1`（站点主），type=3，**无 to_id**。
  4. 友链申请/修改：`user_id=1`，type=4，**无 to_id**。
- 已读：`PUT /notify/update/:id` → `isView=2`；未读=1。列表 `order: isView ASC, createdAt DESC`（未读在前）。三个 notify 路由**都没挂 auth**（安全隐患）。

## 7. 推荐 recommend

- **`blog_recommend` 表无用**（见 §2），只有 `title`/`link` 两字段，无任何接口。
- 真正的"相关推荐"在 `GET /article/getRecommendArticleById/:id`，实时查 article 表：
  - `previous`：`id < :id AND status=1`，`id DESC` 取 1（不存在则回退为当前篇）。
  - `next`：`id > :id AND status=1`，`id ASC` 取 1（同上回退）。
  - `recommend`：取本文章所有 tag → 找同 tag 的 article_id → `status=1`、`createdAt DESC`、limit 6，字段 `{id, article_title, article_cover, createdAt}`。
- 结论：推荐 = "同标签最新文章"，无人工配置/权重/独立推荐位。

## 8. 上传

- `POST /upload/img`，`koa-body` 解析，字段名 **`file`**；`maxFieldsSize` 2MB；`keepExtensions: true`。
- `UPLOADTYPE`：
  - `local`：落盘 `src/upload/local/`，返回 `http://127.0.0.1:${APP_PORT}/local/<basename>`（**写死 127.0.0.1**，线上不可用）。
  - `online`：落盘 `src/upload/online/`，返回 `http://<host>:8888/online/<basename>`。
  - `qiniu`：返回 `${DOMAIN}/<hash>`（DOMAIN 无协议自动补 http）。
  - `minio`：`minioUpload(filepath)` 返回完整 URL。
- 静态服务：`koa-static` 挂 `src/upload`，所以 `/local/*`、`/online/*` 可直接 GET 图片。仓库内 `src/upload/online/` 已有 `alipay.png`、`zhifupay.png`、示例 webp。
- 统一返回 `{code:0, message:"图片上传成功", result:{ url }}`。空 `UPLOADTYPE` → 报"请配置文件上传模式"。`qiniu`/`minio` 在用户换头像时会删旧文件（`deleteImgs` / `deleteMinioImgs`），local 不删。

## 9. 敏感词与限频

- 敏感词：`mint-filter` 的 `new Mint(words)`，词表固定 12 条（脏话），外加 XSS 正则 `/script|alert|window|prompt|location|href|iframe|onload|onerror/g`。
- **命中不拦截而是替换**：请求 `https://open.iciba.com/dsapi/` 拿每日一句 `note` 作为内容返回；该外网请求失败会**永久挂起**（Promise 不 resolve，接口不返回）。
- 使用点：`/comment/add`、`/comment/apply`、`/message/add`、`/message/update`、WebSocket 聊天。
- 限流：`koa2-ratelimit`。
  - 全局：`interval {min:1}`、`max:200`（每 IP 每分钟 200 次）。
  - 单接口 `createTimesLimiter({interval:60000ms, max:N, prefixKey, message})`；`prefixKey` 必填（缺失只 `console.error` 不报错）。实际值：注册 3、留言写操作 5、说说点赞 5、友链新增 5、评论/回复 20、评论点赞 10、文章点赞 10、普通点赞 10、上传 100、`addView` 60min/100。超限文案统一"小黑子 压测我是吧"或各自定制。

## 10. RSS

**后端没有 RSS/Atom/feed 输出**。全库 `src/**/*.js|*.ejs|*.sql|*.md` 搜索 `rss|RSS|feed|atom` 零命中；`src/router/` 下无 rss 路由，`src/views/index.ejs` 只是 swagger 载体。若新站需要 RSS，属新增功能。前端（`_ref/vue3-blog`）同样无 RSS 页。

## 11. 站点配置 config

- 单表 `blog_config` + `GET /config/`（匿名，唯一入口）返回**整行**：`blog_name`、`blog_avatar`、`avatar_bg`、`personal_say`、`blog_notice`、`qq_link`、`we_chat_link`、`github_link`、`git_ee_link`、`bilibili_link`、`view_time`、`we_chat_group`、`qq_group`、`we_chat_pay`、`ali_pay`。
- 无记录时 `GET /config/` 返回 `{code:100, message:"需要初始化"}`，前端据此提示先建配置。
- 写：`POST /config/update`（A+AD，按 id upsert，无 id 则 create 新行）；访问量：`PUT /config/addView`（每浏览器会话一次）。页面背景图另表 `blog_header`（`route_name` → `bg_url`）。
- 敏感凭证/环境配置**不在** config 表，而在 `.env`（§1）。

## 12. 音乐 / `/wapi`

- **后端无音乐模块、无 `/wapi` 路由、无第三方代理**。`src/router/index.js` 只注册 §3 里列出的模块；全库无 `wapi`/`music`/`netease` 相关代码。
- 音乐播放（网易云 `/wapi` 一类接口）由前端直连第三方 API 完成，与本 Koa 服务无关。新架构若要服务端代理音乐，属从零新增（并需注意版权/鉴权）。

## 13. 迁移时必须注意的坑（原文实测）

1. `article`/`category`/`tag` 等大量模型 `timestamps:false`，`createdAt`/`updatedAt` 由业务代码 `new Date()` 手写；漏写即 null。
2. 无任何物理外键，`category_id`/`tag_id`/`album_id`/`talk_id`/`for_id` 全部裸 id，删父不级联（除 article→article_tag、talk→talk_photo 由代码处理）。
3. `isView` 语义反直觉：1=未读、2=已读。
4. `blog_like` 无唯一索引 + 应用层去重 → 并发重复计数。
5. `blog_recommend` 死表、`blog_chat` 已砍（路由未摘）；`ERRORCODE.RECOMMEND` 与 `MESSAGE` 同码。
6. 评论列表字段拼写 bug：一级评论昵称写进 `form_name`（应为 `from_name`），头像 `from_avatar`。
7. 敏感词命中时若外网失败会导致请求永不返回。
8. `/article/updateUrl`、`/notify/*`、`/chat/deleteOne`、`/user/getUserInfoById`、`/links/add` 等缺鉴权或鉴权错配，是明确的历史遗留，别照抄。
9. 上传 local 模式返回写死 `127.0.0.1` URL，线上需改写。
10. 分页参数无默认值；`total` 来自 `findAndCountAll` 的 count，筛选条件与 list 一致。
