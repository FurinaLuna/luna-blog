# 参考前端规格（vue3-blog）

> 来源：`_ref\vue3-blog`。前台 `blog-v3`（Vue3.3 + Vite4 + Element Plus 2.2 + Tailwind3 + Pinia），后台 `blog-v3-admin`（pure-admin-thin 3.9.7，Vue3 + TS + Vite4）。
> 仅做规格摘录（表格/清单），不含实现代码；路径均相对各自 src/。

## 0. 全局事实

| 项 | 前台 blog-v3 | 后台 blog-v3-admin |
|---|---|---|
| dev 端口 | 8080（host 0.0.0.0，open） | 8848（`VITE_PORT`） |
| 路由模式 | `createWebHashHistory` | hash（`VITE_ROUTER_HISTORY="hash"`） |
| 组件库 | element-plus 2.2 + 自动按需引入 | element-plus 2.2.27（全量注册） |
| 状态 | pinia + pinia-plugin-persist（localStorage） | pinia（pure-admin 内置模块） |
| 构建产物 | `dist/`，`base:"./"` | `dist/`，`base:"./"` |
| 部署 | `server.js` express.static dist @8080 | 无独立 server，静态托管 |
| 后端 | `/api` 代理 → `localhost:8888`（去前缀） | `/api` 代理 → `127.0.0.1:8888`（去前缀） |

常量约定（前台）：点赞类型 `1=文章 2=说说 3=留言 4=评论`；评论类型 `1=文章 2=说说 3=留言`；业务成功码 `0`，前台 `res.code=="100"` 为业务提示。

---

# A. 前台 blog-v3

## A1. 路由表（`src/router/index.js`）

根 `/` = `Layout`（Header + keep-alive router-view + Footer），`redirect: /home`；无登录守卫（登录走全局弹窗 `userStore.showLogin`）。

| path | name | 组件 | keepAlive | 说明 |
|---|---|---|---|---|
| `/home` | Home | views/home | ✔ | 首页 |
| `/archives` | Archives | views/archives | | 时间轴归档 |
| `/category` | Category | views/category | | 分类词云 |
| `/tag` | Tag | views/tag | | 标签词云（PC 菜单隐藏，移动端抽屉可见） |
| `/article` | Article | views/article | | 详情，`?id=` |
| `/articleList` | ArticleList | views/article-list | | `?id&type(category/tag)&pageTitle` |
| `/photoAlbum` | PhotoAlbum | views/photo/photoAlbum | | 相册列表 |
| `/photos` | Photos | views/photo/photos | | `?id&pageTitle&bg` 照片墙 |
| `/talk` | Talk | views/talk | | 说说 |
| `/link/list` | link → list | views/links/link-list | | 友链 |
| `/resources/front` `/resources/back` | Front / Back | views/resources/category-list | | 资源分类，共用组件 |
| `/siteList` | SiteList | views/resources/site-list | | `?type&category` 站点列表 |
| `/userCenter` | UserCenter | views/user/user-center | | 个人中心 |
| `/message/list` | list | views/message/message-list | ✔ | 留言板（卡片/弹幕双模式） |
| `/message/publish` | publish | views/message/publish | | `?type=add` 发布/编辑留言 |
| `/message/detail` | detail | views/message/detail | | 留言详情 |
| `/:pathMatch(.*)*` | 404 | views/404 | | Layout 之外，全屏，5s 自动回首页 |

meta 仅 `{name, keepAlive}`；`afterEach` 滚动复位，白名单 `['/message/list','/home']` 不滚；NProgress `showSpinner:false`。

## A2. 页面功能与交互

- **首页**：`PageHeader` 在 `/home` 渲染 `HomeHeader`（100vh 欢迎区：大标题 + 社交链接 + TypeWriter）。左栏（`xs24 sm18`）：移动端先出 `RightSideTop` 卡片 → 文章列表 → 移动端站点信息卡；右栏（`sm6`）`RightSide`：博主头像/昵称/简介、社交图标、统计（文章/分类/标签/访问量）、随机色标签云。数据：`homeGetArticleList(current,size=5)`、`homeGetConfig`（blog_avatar、createdAt→运行天数、qq_group、we_chat_group、view_time）、`homeGetStatistic`、`getAllTag`。文章卡：封面 el-image、置顶标记、标题、摘要、分类/标签、时间、点赞/评论/浏览数。骨架屏 `el-skeleton` + gsap 入场 + 分页。
- **文章详情**：正文 `md-editor-v3` 的 `MdPreview`（`previewTheme/codeTheme/theme` 来自 store）+ `MdCatalog`（右侧 sticky 目录，移动端 el-drawer）；`PageHeader` 用 `article_cover` 当背景，显示标题/创建·更新日期/分类/标签/点赞(GsapCount)/浏览/阅读时长，两个 el-dropdown 切「预览主题」「代码主题」；文章信息块：作者、类型（1 原创/2 转载/3 翻译）、原文链接、`v-copy` 复制链接；点赞 `addLike/cancelLike` type=1；上一篇/下一篇卡片 + 移动端推荐网格 + 右侧推荐列表；评论滚入视区由 IntersectionObserver 自动展开 `<Comment type="article" :id :author-id>`；`onBeforeUnmount` 上报阅读时长 `PUT /api/article/addReadingDuration/{id}/{duration}`。
- **文章列表**：`type=category`→`getArticleListByCategoryId`，`type=tag`→`getArticleListByTagId`；4 列卡片（`:xs=12 :sm=8 :md=6`），每页 4 条 + el-pagination；标题取 `query.pageTitle`。
- **分类 / 标签**：`getAllCategory` / `getAllTag` → 随机字号+随机颜色的词云块，数量用 GsapCount，点击跳 `/articleList?type=…&id=&pageTitle=`。
- **归档**：`blogTimelineGetArticleList(current,size=5)` + `TimeLine` 组件 + 分页。
- **搜索**：入口在 Header 搜索图标（`components/Search/blog-search.vue`），**不跳路由**，开 `el-dialog`；输入即时 `getArticleByContent(content)` 弹窗内出结果（标题 + 命中片段高亮）；空输入时左侧「搜索历史」（localStorage `blogSearchHistory`，≤10 条、可清空）+ 右侧「热门推荐」（`getHotArticle`，①…⑤ 序号）；点击结果进 `/article?id=`。
- **相册**：`/photoAlbum` `getAllAlbum` → el-card 网格（`:xs=12 :sm=6`），封面 + 名称/描述遮罩 → `/photos?id&pageTitle&bg`；`/photos` `getAllPhotosByAlbumId` → 网格 + `el-image` 的 `preview-src-list`（整册 URL 数组）+ `initial-index` + `preview-teleported` 做大图左右切换；右侧固定 `icon-arrowleft` 打开 el-drawer 切相册；空态 svg `image404`。
- **说说**：`blogGetTalkList({current,size:5,user_id})`，IntersectionObserver（rootMargin 300px）触底加载，底部「已经到底了~ / 下拉加载更多~」；每条：方形头像、昵称、置顶 icon、文本 3 行 + 展开、图片 3 列网格（单图大图）可预览、`returnTime+"前"`、点赞 type=2（is_like 高亮）、内嵌 `<Comment type="talk" :is-show-toggle="false">`。
- **留言板**：双模式由 `staticData.messageTypeIsCard` 持久化，点页头标题切换（el-popover 提示「切换成弹幕/卡片模式」）。
  - 卡片模式：PageHeader + TypeWriter + 发布 svg-icon（开弹幕输入框或跳 `/message/publish?type=add`）；标签 tab 由 `getMessageTag` 热门标签 + 首位「全部」；按内容搜索（debounce）；无限滚动 size=8；卡片字段：头像/昵称、内容（`containHTML` 则 v-html）、`bg_color`/`bg_url`、时间、`#tag`、点赞(type=3)、评论数、本人（`user_id` 相同或 `role==1`）显示编辑/删除；点击评论进 `/message/detail`；gsap 缩放入场。
  - 弹幕模式：全屏 `vue3-danmaku`（`:loop="留言数>100"`、`useSlot`、`:speeds="60"`、`:isSuspend="true"`、`v-model:danmus`），slot 渲染 el-avatar + 昵称 + 内容（新弹幕带 "new" 角标）；星空背景；顶部 input（maxlength 555，回车发布）`addMessage` 后 `addDanmu` 立即上屏；`getAllMessage` 拉全量。
  - 详情：从 localStorage `blog-message-item` 取对象渲染大卡片（背景图/色、字号字重颜色、标签、时间、点赞）+ `<Comment type="message" :expand="true">`。
  - 发布/编辑：左侧卡片实时预览；字段 `id/message/color/font_size/font_weight/bg_color/bg_url/user_id/tag/nick_name`；四个 tab：①背景颜色 el-color-picker show-alpha ②字体（字号 12/14/16/18/20/22/24/28/32/36 + 文字颜色 + 字重 400–900）③背景图片 Upload（limit 1，280×140）④标签 el-select filterable allow-create（选项=热门标签）；校验：内容非空且 ≤555 字、标签必选；编辑从 `blog-message-item` 回填；保存后 `_removeLocalItem('blog-message-item')` + 置 `message-refresh`/`message-need-scroll` 标记 → `router.go(-1)`。
- **友链**：页头 el-descriptions（欢迎语 + 本站链接 v-copy + QQ + 「友链申请」，未登录提示先登录）；`getFriendLinks({current,size:6,status:2})` 无限滚动；卡片：`site_avatar`（缺省按 url 拼 `/favicon.ico`）+ `site_name` + `site_desc`，点击 `window.open`；本人或 `id==1` 可编辑 → `link-apply.vue` 弹窗（add→`addFriendLinks` / edit→`updateFriendLinks`），表单字段：网站头像(Upload)、网站名称、站点描述、网站地址。
- **资源导航**（纯前端静态数据，无接口）：`/resources/front|back` 按 `views/resources/data.js` 的 `frontCategory/backCategory` 渲染分类卡（前端：语言框架/UI框架/学习/推荐网站；后端：语言/工具）→ `/siteList?type&category` 渲染站点卡（favicon 头像、名称、描述、新窗口打开）。
- **个人中心**：`el-tabs`「个人信息」（头像 Upload + 昵称，预览态被 el-button 切换为编辑态，保存 `updateUserInfo`）/「密码修改」（原密码/新密码/确认密码，校验非空+两次一致，`updateUserPassword`）。
- **404**：全屏，5s 倒计时自动 `router.push("/")`，「返回上一页 / 返回首页」。
- **登录/注册弹窗**（`components/Layout/header/login/login.vue`，非路由页）：el-dialog 内两个 tab；登录 username/password + 「记住我」（`_setLocalItem` 存 `login_info`）；注册 username/nick_name/password1/password2；成功后 `getUserInfoById` 写入 userStore 的 userInfo/token/blogAvatar。

## A3. 全局组件（`src/components/`）

| 组件 | 位置/形态 | 要点 |
|---|---|---|
| Layout | `Layout/index.vue` | Header + `<keep-alive :include>` 按 `meta.keepAlive`（key=fullPath） + Footer |
| blog-header | 固定顶栏 3.6rem | 滚动 <50px 透明，否则 `var(--header-bg)`；下滚隐藏/上滚出现（`hide-header`/`fixed-header`）；左：博客头像→`/`、MessageBox 通知铃铛（仅登录）；BlogSearch；el-menu 横向：主页 `/home`、时间轴 `/archives`、「更多」子菜单（前端推荐 `/resources/front`、后端推荐 `/resources/back`）、分类 `/category`、（PC 隐藏）标签 `/tag`、相册 `/photoAlbum`、说说 `/talk`、友链 `/link/list`、留言 `/message/list`、未登录「登录」/已登录头像子菜单（个人中心 `/userCenter`、退出）；SwitchTheme；移动端 icon-menu2 开 60% el-drawer 竖排菜单（含标签） |
| blog-footer | 页脚 | © 小张的博客 2023、备案「冀ICP备2023007772号」→ beian.miit.gov.cn、4 个 shields.io 徽章（阿里云 ECS / MdEditorV3 / HEXO-BUTTERFLY / minio）；`/message/chat` 不渲染 |
| PageHeader | 页头 | `/home`→HomeHeader（100vh）；其余高 22rem：背景 `article_cover`（`/article`）> `props.bgUrl` > `pageHeaderList` 按 `route.name` 取 > 兜底图；`::before` 0.6 黑遮罩；标题= `route.meta.name`(+` - pageTitle`)，逐字 gsap；底部 Waves 波浪 |
| MessageBox | 导航铃铛 | `getNotifylist` 分页、未读标记、点击 `updateNotify` 已读并跳 `/message/list`、单条删除 `deleteNotify` |
| Music | 全局悬浮/全屏 | 见下「音乐播放器」 |
| Comment | 见 A6 | |
| SwitchTheme | el-switch | active-icon Sunrise / inactive Moon，`v-model=mainTheme`；onMounted 读 localStorage `mainTheme`，无缓存按时钟 8–18 判白天/黑夜；切换调 `staticStore.switchMainTheme()`（vueuse `useDark`） |
| BackTop | 固定返回顶部 | 滚动 >200px 才显示，props `bottom/right/svgName/svgWidth/rotateDeg`，图标按主题 darkTop/lightTop |
| ContextMenu | 全局右键菜单 | `document.contextmenu` 拦截，音乐播放器菜单（播放/暂停/上下曲/播放列表/歌词/播放模式），图标用 assets png |
| ChatRoom | 挂载但页面入口已注释 | App.vue 里仍 `<ChatRoom v-if="route.path!=='/'" />`，无对应路由视图 |
| TimeLine / TypeWriter / TextOverflow / GsapCount / Pagination / SkeletonItem / SvgIcon / ToolTip / Loading / RightSide / HomeArticle / WelcomeComps / Upload | 通用 | Upload 见 B4 |

**弹幕实现**：`vue3-danmaku@1.6`。`<vue3-danmaku v-model:danmus="danmus" :loop :speeds :useSlot :isSuspend>`，`#dm="{ danmu, index }"` 插槽里渲染头像+昵称+内容；`ref.addDanmu({...})` 立即上屏；留言 >100 条开启循环；点击/悬停暂停用 `isSuspend`。

**音乐播放器**（`components/Music/`）：左下角悬浮「唱片」（封面旋转、歌名歌手滚动），点击展开全屏遮罩播放器（MusicList 歌单 + MusicControl 进度/音量/上下曲 + 歌词板），展开时 `document.documentElement.style.overflowY='hidden'`。`useMusic.js` 组合式（reactive state + getters/setters，provide 注入），全局单例 `new Audio()`（volume/autoplay/crossOrigin），`ontimeupdate` 同步 currentTime/duration/isPaused/当前歌词行/进度，`ended` 按模式自动下一首；状态持久化 localStorage `blog-music-player`（`musicTool` 的 `_setLocalItem`：Base64(key)+Base64(JSON)），`beforeunload` 保存、卸载 `removeAudio`。枚举：`MODELLIST=['RANDOM','LISTLOOP','SINGLECYCLE']`、`PLAYTYPE={CUSTOM,TOP}`、`LYRICTYPE={COMMON,SPECIAL}`。播放流程：`song/detail?ids` 取封面歌手 → `song/url/v1?id&level=exhigh` 取 url → `lyric?id` 解析 `[mm:ss]歌词` 成 `lyricList/lyricTimeList` → `audio.src`。歌单 `toplist/detail` + `playlist/track/all`，搜索 `search`。全部走 `/wapi` 代理（见 A8）。

## A4. 请求层（`src/config/request.js`）

- 实例：`axios.create({ timeout:10000, withCredentials:true, headers:{'Content-Type':'application/json','X-Requested-With':'XMLHttpRequest'} })`，**无 baseURL**，全部相对 `/api/...`。
- 请求拦截：有 token 则 `config.headers.Authorization = userStore.getToken`（原值，**无 Bearer**）。
- 响应拦截：直接返回 `response.data`（业务层用 `res.code/res.result`）；`code=="100"` → ElNotification 显示 message（暖色 `#e6c081`）。
- HTTP 错误：`401` → `clearUserInfo()` + `setShowLogin(true)`（弹窗登录）；`403` 权限不足；`404`「接口没有找到」；`408/429/500` ElNotification（`#f56c6c` 红 / `#e6c081` 暖）。
- 模块：`api/{article,category,tag,comment,like,config,home,message,music,photo,talk,links,notify,chat,user}.js`，函数即接口（如 `homeGetArticleList(current,size)`→`GET /api/article/blogHomeGetArticleList/{current}/{size}`；`getArticleListByTagId`→`POST /api/article/getArticleListByTagId`；`frontGetParentComment`→`POST /api/comment/frontGetParentComment`；`imgUpload`→`POST /api/upload/img` FormData）。音乐 7 个函数全指 `/wapi/*`。

## A5. 状态管理（`src/store/index.js`，pinia + persist → localStorage）

| store | persist key | 内容 | getters / actions |
|---|---|---|---|
| staticData | `staticState` | `previewThemeList`(6 个预览主题)、`codeThemeList`(8 个代码主题)、`previewTheme='default'`、`codeTheme='atom'`、`theme`、`pageHeaderList[]`、`messageTypeIsCard=false` | `mainTheme`(读 vueuse isDark)、`getPageHeaderList`、`getMessageTypeIsCard`；`switchMainTheme()`（`useDark({storageKey:'useDarkKEY',valueDark:'dark',valueLight:'light'})`）、`setPageHeaderLIst`、`setMessageTypeIsCard` |
| user | `userState` | `blogAvatar`、`userInfo`、`token`（后两者 `_encrypt` 加密后存）、`infoFlag`、`tokenFlag`、`showLogin` | `getToken`/`getUserInfo`（解密失败即 `clearUserInfo` 防阻塞）、`getBlogAvatar`、`getShowLogin`；`setToken`/`setUserInfo`/`clearUserInfo`/`setShowLogin` |

`utils/encipher.js`：crypto-js **AES-CBC / Pkcs7**，key 与 iv 均为 `1234567812345678`，输出 hex 字符串；由 `config.ENCRYPTION=true` 开关决定是否加密。

## A6. 评论组件（`components/Comment/Comment.vue`）

- props：`type('article'|'talk'|'message')`、`id`、`authorId`、`expand`、`isShowToggle`；头部「评论 N ｜ 最热/最新 ｜ 查看更多/收起」，无评论时显示「求评论呀~」。
- 结构：**两层**——主评论列表（`ParentItem`）+ 其下子回复（`ChildrenItem`），不是「一楼/二楼」引用堆叠；回复某条子评论带 `to_id/to_avatar/to_name/parent_id`（`POST /api/comment/apply`）。
- 发布：`CommentInput`（contenteditable 富文本 + 表情 `IconList` + 发布/清空）；未登录 `ElNotification('请先登录')` 并 `setShowLogin(true)`；提交 `POST /api/comment/add`，字段 `{from_id, from_avatar, from_name, content, for_id, type(1 文章/2 说说/3 留言), author_id}`。
- 列表：`POST /api/comment/frontGetParentComment` `{current,size:5,type,for_id,order:hot|new,user_id}`，「展开更多」翻页；总数为 `frontGetCommentTotal`。
- 每条主评论：头像 `from_avatar`（**用户上传头像，非 gravatar**；未登录访客用默认头像）、昵称、`from_id==1` 显示 **UP** 徽章、内容（`containHTML` 则 v-html，否则 3 行省略）、`IP: comment.ipAddress`、点赞（`type=4`）、回复、删除（本人或 `role==1`，级联删子评论 `deleteComment(id,parent_id)`）。
- 时间：`createdAt` **原样字符串**输出（不格式化）；卡片外的时间才用 `returnTime()` 相对时间 + "前"。

## A7. 样式体系

- SCSS + CSS 变量：`styles/variable.scss` 定义 `:root`（`--primary #49b1f5`、`--font-color #4b4948`、`--hot-color #f00`、`--error #f56c6c`、`--card-bg #fff`、`--card-box-shadow 0 3px 6px 3px rgba(7,17,27,.06)`、`--header-bg rgba(29,30,31,.5)`、`--button-linear-gradient linear-gradient(300deg,#74ebd5,#9face6)`、`--wave-*`）与 `html.dark` 覆盖（`--font-color #b8b8b8`、`--card-bg #303030`、`--global-gradient #282828`、紫蓝渐变）。
- `styles/base.scss` 汇总 `@import variable / element(element.scss, dark.scss, loading.scss) / custom / markdown / transition`，并定义 `html,body{font-size:var(--global-font-size)=14px}`、字体栈、`.layout` 背景、`.header_box/.footer_box/.main_box` 尺寸；`vite.config` 用 `additionalData` 全局注入。
- 暗色模式：`html.dark` class（vueuse `useDark` 自动加）+ element-plus 的 `dark/css-vars.css` 变量。
- 响应式：统一 **768px**（`min-width:768px` = PC，`max-width:768px` = 移动），配合 el-row 的 `xs/sm/md` 栅格。
- Markdown 样式：主要由 `md-editor-v3` 自带（`markdown.scss` 仅少量定制）。
- Tailwind 3：`purge` 扫 `index.html` + `src/**/*.{vue,js,ts,jsx,tsx}`，`colors` 扩展 `primary-blue #5cbfef`，`corePlugins.preflight=false`（避免与 element-plus 冲突）。

## A8. 构建配置（`vite.config.js`）

- `base:"./"`；alias `@`→`./src`；`extensions:[".js",".vue",".json"]`。
- 插件：`@vitejs/plugin-vue`、`@rollup/plugin-commonjs`、`unplugin-auto-import` + `unplugin-vue-components`（ElementPlusResolver）、`vite-plugin-compression`（gzip，threshold 10240）、`vite-plugin-require-transform`、`vite-plugin-svg-icons`（`src/icons/svg`）。
- scss `additionalData: @import "./src/styles/base.scss"`；`hmr.overlay=false`。
- 代理：

| 前缀 | 目标 | rewrite | 用途 |
|---|---|---|---|
| `/api` | `http://localhost:8888` | 去掉 `/api` | 后端 |
| `/blog-images` | `http://mrzym.top:9000/blog-images` | 去掉前缀 | MinIO 图床 |
| `/wapi` | `http://mrzym.top:3000` | 去掉 `/wapi` | 第三方网易云音乐 API |

- build：`sourcemap:false`、`chunkSizeWarningLimit:4000`、产物 `static/js`、`static/[ext]`。
- 依赖：vue 3.3 / vue-router 4 / pinia 2 + pinia-plugin-persist / element-plus 2.2 / @vueuse/core / axios 0.27 / crypto-js / gsap / md-editor-v3 4.17 / mint-filter（敏感词过滤）/ nprogress / vue3-danmaku 1.6 / animate.css / tailwindcss 3；dev：vite 4.4、sass、express、unplugin-*、vite-plugin-svg-icons、eslint+prettier。
- `main.js` 全局：iconfont、element-plus 两套 css、animate.css、tailwind.css、svg 注册、指令 `v-copy`/`v-image`（图片懒加载）。
- `utils/tool.js`：`_getLocalItem/_setLocalItem/_removeLocalItem`（Base64+JSON）、`returnTime`、`numberFormate`(k/w)、`getWelcomeSay`、`isMobile`、`debounce`、`imageConversion`(压缩)、`containHTML`、`filterMessage`(mint-filter)；`utils/transform.js` 为 gsap 封装。

---

# B. 后台 blog-v3-admin

## B1. 路由/菜单（`router/modules/*`，纯静态、无接口动态菜单）

菜单按 `meta.rank` 排序；`constantMenus` 全量渲染（`filterNoPermissionTree` 但无后端 roles 下发）。

| rank | path | 标题 | 子项 |
|---|---|---|---|
| 0 | `/` → `/home` | 首页 | 首页 |
| 1 | `/article` | 文章 | 文章列表 `/article/articleList`、新增文章 `/article/addArticle`、（隐藏）编辑文章 `/article/editArticle?articleId=`、标签管理 `/article/tagManagement`、分类管理 `/article/categoryManagement` |
| 1 | `/talk` | 说说 | 说说列表 `/talk/talkList`、发布说说 `/talk/addTalk`、（隐藏）编辑 `/talk/editTalk` |
| 4 | `/photo` | 相册管理 | 相册列表 `/photo/photoAlbum`、（隐藏）图片列表 `/photo/photoList`、（隐藏）新增图片 `/photo/addPhotos` |
| 8 | `/user` | 用户管理 | `/user/userManagement` |
| 10 | `/personal` | 个人中心 | `/personal/personalManage` |
| 11 | `/site` | 网站管理 | 博客网站信息管理 `/site/siteManagement`、背景管理 `/site/headerManagement`、留言管理 `/site/messageManagement`、友链管理 `/site/links` |
| — | remaining | 登录/注册/redirect | `/login`、`/register`、`/redirect/:path` |

请求层：`utils/http`（PureHttp，axios 封装，`timeout:10000`，**无 baseURL**，相对 `/api/...`）；`Authorization` 直接放 token；白名单 `/login`、`/refreshToken`（refreshToken 接口未实现，仅预留队列）。

## B2. 业务页面（表格列 / 表单 / 操作）

| 页面 | 表格列 | 表单字段 | 操作/说明 |
|---|---|---|---|
| 文章列表 | 序号、文章标题、描述、分类(el-tag)、标签(el-tag 多个)、封面(el-image 预览，200×100)、是否置顶(el-switch)、状态、类型、发布日期、修改日期、操作 | 搜索区：文章标题、分类、标签、是否置顶、发布时间 daterange | tab（`staticStore.articleTab`）：所有文章("")/公开文章(1)/私密文章(2)/草稿箱(3)；**status 3 同时充当回收站**（删除非草稿文章 → status 3 并在该 tab 出「恢复」按钮）；新增、修改、隐藏/公开（`isArticlePublic`）、删除（`deleteArticle`）、恢复（`revertArticle`）、置顶开关 `updateArticleTop`；表格大小 大/中/小 |
| 新增/编辑文章 | — | 外部：文章标题、正文（**md-editor-v3 `MdEditor`**，`@onUploadImg` 走 `mdImgUpload`）；弹窗「发布文章」：文章标题、文章描述、分类(可新建)、标签(可新建，多选)、缩略图 Upload、置顶 el-switch、排序 order、状态（公开/私密/草稿箱）、文章类型（原创/转载/翻译）、原文链接 | 编辑器上传图片 → 返回 url 插入 md；封面先 Upload 进 fileList，提交时 `imgUpload` 拿 url；标题重复校验 `titleExist`；「保存草稿」= status 3、「发布文章」= add/edit；成功后回列表 |
| 分类管理 | 序号、分类、创建日期、修改日期、操作 | 弹窗：分类名称 | 搜索分类名称、新增/编辑（`addCategory`/`editCategory`）、删除、批量删除 |
| 标签管理 | 序号、标签、创建日期、修改日期、操作 | 弹窗：标签名称 | 同上（`addTag`/`editTag`/`deleteTagList`），批量删除 |
| 说说列表 | 卡片流（非表格）：头像/昵称/内容(TextOverflow)/图片 3 列/`returnTime`、置顶角标 | 搜索：内容、时间；tab 公开/私密/回收站 | 下拉菜单：置顶(`toggleTop`)/隐藏或公开(`togglePublic`)/编辑/删除或回收(`deleteTalkById`)/恢复(`revertTalk`) |
| 发布/编辑说说 | — | 内容(el-input textarea)、图片(Upload 多图，先 `imgUpload`)、置顶(el-switch)、状态(公开/私密 el-select) | 保存/取消，`publishTalk` / `updateTalk` |
| 相册列表 | 卡片网格：封面上传、相册名、描述、图片数 | 弹窗：相册名称、相册描述、封面 Upload | 新增/编辑/删除（`addAlbum`/`updateAlbum`/`deleteAlbum`），点卡片进图片列表 |
| 图片列表 | 图片网格（el-checkbox 多选） | — | tab：相册图片(1)/回收站(2)；新增（跳 add-photos）、编辑、批量删除/批量恢复、清空、取消选择 |
| 新增图片 | — | Upload 多图（limit 不限，picture-card） | 先 `imgUpload` 逐张上传再 `addPhotos` |
| 留言管理 | 序号、昵称、头像(el-avatar)、留言内容、留言日期 | 搜索：留言内容、留言时间段 | 批量删除（`backDelete`） |
| 友链管理 | 序号、网站头像、网站名称、网站描述、网站地址、状态（1 待审核 / 2 通过，el-tag）、申请日期、通过日期、操作 | 搜索：网站名称、申请时间；弹窗：网站名称、网站描述、网站地址、网站头像 Upload | tab：所有友链/待审核/审核通过；新增/修改（`backUpdate`）、单条/批量审核（`approve`）、批量删除 |
| 网站配置（博客网站信息） | — | 博客名称、个性签名、码云、B站、github、公告、背景图 Upload、博客头像 Upload，以及图片型字段：企鹅(`qqCoverList`)、微信(`weChatCoverList`)、企鹅群(`qqGroupList`)、微信群(`weChatGroupList`)、绿宝宝/微信收款(`weChatPayGroupList`)、蓝宝宝/支付宝(`aliPayGroupList`) | 卡片「编辑」切换只读/编辑态，保存 `POST /api/config/update`；读取 `GET /api/config` |
| 背景管理 | 卡片列表：背景图、页面名称、路由 | 弹窗：页面名称(select，来自 `routerList.js`)、路由(只读/输入)、背景图 Upload | 新增/编辑/删除（`pageHeader/addOrUpdate`、`pageHeader/delete`）；页面名称枚举：Home/Archives/ArticleList/Front/Back/SiteList/LinkList/Category/Tag/PhotoAlbum/Talk/MessageList/PublishMessage/MessageDetail/UserCenter |
| 个人中心 | — | ①个人信息：个人头像 Upload、昵称；②修改密码：原密码、新密码、二次确认 | 每块「编辑/取消/保存」两态；`updateOwnUserInfo`、`updatePassword` |
| 用户管理 | 序号、用户名、昵称、头像、角色(el-switch 管理员/普通用户)、IP、创建日期、修改日期、操作 | 搜索：用户名/角色 | 角色切换 `updateRole/{id}/{role}`（1 管理员 / 2 普通用户）；编辑用户昵称头像 `adminUpdateUserInfo` |
| **评论管理** | **原项目缺失**：后台无 comment 页面/无 comment api，评论只能在前台管理（前台删除走 `/api/comment/delete`，权限=本人或 role==1） | | 新建项目需补齐（列表/审核/回复/删除/敏感词） |

## B3. 登录 / token / 守卫

- 登录页：账号 + 密码（`REGEXP_PWD`：6–18 位，数字/字母/符号任意两种组合）+「记住我」（`storageLocal('loginInfo')` 存 `{username,password}`）；`POST /api/user/login` → `{code:0, result:{token, id, ...}}`。
- token 存储（`utils/auth.ts`）：`TokenKey='authorized-token'` 写 **js-cookie**；`sessionKey='user-info'` 写 **sessionStorage**（`{username, role}`）；`getToken()` 先 cookie 后 session；`removeToken()` 清 cookie + `sessionStorage.clear()`。
- 登录后：`setToken(result)` → `SET_ID` → `saveUserInfo(id)`（`GET /api/user/getUserInfoById/{id}` 拿 avatar/nick_name/role 存 store）→ `handleTags("equal", routerArrays)` 重置页签 → 跳转。
- 守卫（`router/index.ts`）：`whiteList=['/login','/register']`；无 session → 跳 `/login`；有 session 且 `wholeMenus.length===0` 则 `initRouter()`（仅静态路由，无后端动态菜单）后 `router.push(to.fullPath)`；`!to.matched.length` → `/error/404`；`meta.role` 一律拒到 `/error/403`；`afterEach` 关 NProgress；`resetRouter()` 清后台动态路由与缓存页。
- 退出：`logOut()` 清 store + `removeToken()` + `resetRouter()` → `/login`。
- store 模块（pure-admin 自带）：`app`(sidebar/设备)、`epTheme`、`multiTags`(页签)、`permission`(wholeMenus/cachePageList)、`settings`(布局主题)、`static`、`user`(id/username/nickname/avatar/role/token)。

## B4. 上传组件（`components/Upload/upload.vue`）

- `el-upload` `list-type="picture-card"`、`action="#"`、`:auto-upload="false"`、`:limit`、`:on-change`；props `fileList / limit(1) / preview / multiple / width(200) / height(200)`；`emit('update:fileList')` 实现 `v-model:fileList`。
- 内部 `uploadFileList` 与 props 双向 watch；达到 limit 或 preview 模式时用 `.hide-upload` 隐藏上传按钮；卡片自定义：el-image 展示 + 放大预览（`el-image-viewer`，`initial-index`）+ 删除（splice 后重新 emit）。
- **上传行为**：组件本身不发请求；父组件在提交时取 `fileList[0]`（Element 的 UploadFile，含 `raw`）调 `imgUpload(FormData)` → `POST /api/upload/img` 返回 `{code:0, result:{url}}` → 写回业务字段（封面/头像/相册封面等）；多图（说说/相册图片）逐张 `imgUpload`（ElLoading 全屏 loading 包裹）。
- 回显：编辑时把已有 url 拼成 `[{id:1, name: url.split('/').pop(), url}]` 塞回 `fileList`。

## B5. 仪表盘（`views/home/index.vue`）

- 统计卡 `HomeCard` ×4：文章、分类、标签、用户（`GET /api/statistic` → `articleCount/categoryCount/tagCount/userCount`）。
- `CodeMap.vue`：GitHub 风格贡献热力图（echarts heatmap），数据 `getCommitList()` → `/gitee/contribution_timeline?...`（代理到 `gitee.com/mrzym`），列=日期、值=commitCount。
- `Bar.vue`：echarts 柱状图，`watchers/fork/star` 为 **pure-admin 模板 demo 数据**，未接后端。
- `WordCloud.vue`：echarts-wordcloud 标签云，数据 `getTagDictionary`（标签名 + 权重）。

---

# C. 原项目缺口 / 迁移注意

1. **评论后台管理缺失**（无页面、无 api、无敏感词审核）；前台评论/留言/说说的管理权限仅靠前台按 `role==1` 显隐按钮。
2. **无 `/about` 关于页**：关于信息承载在首页右栏 `RightSide`、页脚与 `/resources` 资源导航，新建项目若要 `/about` 需新增路由+后台配置页。
3. **聊天室**：`ChatRoom` 组件与 `/api/chat/*` 接口存在，但前台页面/入口已注释，后台亦无管理页。
4. 前台**无登录路由守卫**：所有页面可游客访问，需要写操作时弹登录框；后台 **无真实 RBAC**（路由全静态，`meta.role` 直接 403，`/api/refreshToken` 未实现）。
5. 音乐播放器依赖第三方网易云 API（`/wapi` → mrzym.top:3000），属外部不稳定依赖；歌词/歌单无自有数据表。
6. 前台所有图片走 MinIO（`/blog-images` 代理或接口返回绝对 url）；富文本/Markdown 渲染与主题依赖 `md-editor-v3`（预览主题 × 代码主题双下拉）。
7. 时间展示不统一：列表/卡片用 `returnTime` 相对时间，评论 `createdAt` 原样输出。
