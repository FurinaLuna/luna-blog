# 后台管理端视觉与布局复刻规格（原 `blog-v3-admin`）

> 只读考古自：`_ref/vue3-blog/blog-v3-admin/`（pure-admin-thin **3.9.7** + Element Plus **2.2.27** + Vue 3.2.45 + Tailwind 3.2）
> 目标骨架：Vue 3.5 + Vite 8 + TS 7 + Pinia 4 + Tailwind CSS 4 + Element Plus 2.14 + vue-router 5
> 标注「需实测」= 源码未显式定义、依赖 Element Plus 默认值或需在浏览器量取。

---

## 0. 一句话结论

原后台是 **pure-admin 的标准 vertical 布局**：左侧 210px 深蓝侧栏（`#001529`）+ 48px 白色顶栏 + 38px 多标签页 + `#f0f2f5` 内容区（卡片内 margin 12px）。业务页几乎没有定制视觉——**全部是 el-card + inline 筛选表单 + pure-table + el-pagination + el-dialog** 的同一套模板，差异只在列、按钮和卡片高度。复刻成本主要落在**布局壳（sidebar/navbar/tags-view）**与**两张非表格页（仪表盘图表、说说卡片流）**。

生效配置（`public/serverConfig.json` 实际值，决定默认外观）：

```json
{ "Layout": "vertical", "Theme": "default", "EpThemeColor": "#409EFF",
  "FixedHeader": true, "HiddenSideBar": false, "HideTabs": false,
  "ShowLogo": true, "ShowModel": "smart", "DarkMode": false,
  "Grey": false, "Weak": false, "SidebarStatus": true,
  "TooltipEffect": "light", "MultiTagsCache": false, "KeepAlive": true }
```

---

## 1. 主题与视觉 Token

### 1.1 侧栏主题 9 套（`src/layout/theme/index.ts`）

每套注入 9 个 scss 变量，作用域类名 `layout-theme-<key>`（运行时切 `<body>` 上的 scope class + EP 主色变量）。

| key | 侧栏底色 menuBg | 悬浮色 menuHover | 激活底色 subMenuActiveBg | 激活文字 | 普通文字 menuText | logo 区底色 | 色板圆点 |
|---|---|---|---|---|---|---|---|
| **default（启用）** | `#001529` | `#4091f7` | `#4091f7` | `#fff` | `rgb(254 254 254 / 65%)` | `#002140` | `#1b2a47` |
| light | `#fff` | `#e0ebf6` | `#e0ebf6` | `#409eff` | `#7a80b4` | `#fff` | `#ffffff` |
| dusk | `#2a0608` | `#e13c39` | `#e13c39` | `#fff` | `rgb(254 254 254 / 65.1%)` | `#42090c` | `#f5222d` |
| volcano | `#2b0e05` | `#e85f33` | `#e85f33` | `#fff` | 同上 65% | `#441708` | `#fa541c` |
| yellow | `#2b2503` | `#f6da4d` | `#f6da4d` | `#d25f00` | 同上 65% | `#443b05` | `#fadb14` |
| mingQing | `#032121` | `#59bfc1` | `#59bfc1` | `#fff` | `#7a80b4` | `#053434` | `#13c2c2` |
| auroraGreen | `#0b1e15` | `#60ac80` | `#60ac80` | `#fff` | `#7a80b4` | `#112f21` | `#52c41a` |
| pink | `#28081a` | `#d84493` | `#d84493` | `#fff` | `#7a80b4` | `#3f0d29` | `#eb2f96` |
| saucePurple | `#130824` | `#693ac9` | `#693ac9` | `#fff` | `#7a80b4` | `#1f0c38` | `#722ed1` |

`subMenuBg` 与 `sidebarLogo` 之外的两项：`menuTitleHover`（default `#fff`）、`menuActiveBefore`（default `#4091f7`，折叠态左侧 2px 竖条色）。

### 1.2 主色与 Element Plus 变量

- 主色 **`#409EFF`**（`EpThemeColor`）。切主题时由 `setEpThemeColor()` 写内联变量：
  `--el-color-primary` + `--el-color-primary-light-1..9` + `--el-color-primary-dark-1/2`（亮色用 lighten、暗色用 darken 派生）。
- 语义色沿用 EP 默认：success `#67C23A`、warning `#E6A23C`、danger `#F56C6C`、info `#909399`。
  但业务里**手写**的高频色值（必须复刻）：`#66b1ff`（popconfirm 图标色 / 可点标题 hover）、`#67c23a`（相册"图片"图标）、`#f56c6c`（删除图标、tips 文案）、`#606266`（卡片标题/次要文本）、`#676767`（说说时间）、`#1890ff`（侧栏 logo 文字）、`#f0f2f5`（内容区底）、`#001529`（侧栏底）。
- EP 文本层级：primary `#303133`、regular `#606266`、secondary `#909399`、placeholder `#a8abb2`；边框 `#dcdfe6` / 浅边框 `#e4e7ed` / 表格线 `#ebeef5`；表头底 `#f5f7fa`（EP 2.2 默认，需实测是否被 pure-table 改）。

### 1.3 圆角 / 阴影 / 字体

| 元素 | 值 |
|---|---|
| el-card | `border-radius: 4px`，`shadow="never"` 时仅 1px 边框 + 默认 `box-shadow 0 2px 12px rgba(0,0,0,.1)` |
| 相册/背景卡 | `box-shadow: 0 0 12px rgba(0,0,0,.12)`；背景卡额外 `border-radius: 8px` |
| tags-view 标签 | `border-radius: 3px 3px 0 0`，`padding: 0 6px`，`height: 28px`，`margin-right: 4px` |
| 顶栏 / sidebar | 顶栏 `0 1px 4px rgba(0,21,41,.08)`（暗色 `0 1px 4px #0d0d0d`）；sidebar `0 0 1px #888`；tags-view `0 0 1px #888` |
| 右侧配置面板 | `0 0 15px 0 rgba(0,0,0,.05)`，遮罩 `rgba(0,0,0,.2)` |
| 右键菜单 | `border-radius: 4px`，`0 2px 8px rgb(0 0 0/15%)` |
| 按钮 / 输入框 | EP 默认（small 高 24px、default 32px；radius `2px`）需实测 |
| 全局字体 | `"Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", 微软雅黑, Arial, sans-serif`，`line-height: 1.5`，基准 14px |
| 数字/等宽 | 仅登录页 h2 用 `Consolas, Monaco, monospace` |

### 1.4 暗色模式（`src/style/dark.scss`，`html.dark`）

- `.app-main` → **`#020409`**；`.navbar/.tags-view/.contextmenu/.sidebar-container/.horizontal-header/.sidebar-logo-container` → `var(--el-bg-color)`（EP 暗色 `#141414`）。
- `.el-table__cell` → `var(--el-bg-color)`；`.el-card` → `--el-card-bg-color: var(--el-bg-color)`。
- `.el-backtop` → 底 `--el-color-primary-light-9`，hover `--el-color-primary`。
- 弹窗/抽屉/MessageBox 关闭按钮 hover：`color rgba(255,255,255,.85); background rgba(255,255,255,.12)`。
- `.pure-message` 背景 `rgb(36,37,37)`、文字 `#fff`、阴影 `rgb(13 13 13/12%) 0 3px 6px -4px, …`。
- iframe 内嵌页 `filter: invert(.9) hue-rotate(180deg)`。
- 全局还有 `.html-grey{filter:grayscale(100%)}`、`.html-weakness{filter:invert(80%)}` 两个辅助模式。

---

## 2. 布局骨架

### 2.1 结构图（vertical 布局，默认）

```
body[layout=vertical]
└─ .app-wrapper (100%/100%)
   ├─ aside.sidebar-container       fixed left 0, top 0, bottom 0, w 210 (折叠 54), z 1001
   │   ├─ .sidebar-logo-container   h 68  (bg #002140)
   │   ├─ el-scrollbar              高 calc(100% - 92px)（has-logo + pc）
   │   │   └─ el-menu.outer-most    菜单项高 50
   │   └─ leftCollapse              高 40（折叠按钮，shadow 0 0 6px -2px primary）
   ├─ .main-container               margin-left 210 (折叠 54), bg #f0f2f5
   │   ├─ .fixed-header             fixed top 0 right 0, w calc(100% - 210), z 998
   │   │   ├─ .navbar               h 48
   │   │   └─ .tags-view            h 38
   │   └─ section.app-main          padding-top 85 (=48+37)
   │       └─ el-scrollbar > .main-content   margin 12px → <router-view/>
   └─ .right-panel-container        右侧配置抽屉（315px，z 40000）
```

关键数字：**侧栏 210 / 折叠 54 / logo 68 / 菜单项 50 / 折叠条 40 / 顶栏 48 / 标签页 38 / 内容内边距 12 / 内容顶留白 85**。
移动端（≤760px）：sidebar 改为 `transform: translate3d(-210px,0,0)` 抽屉式，`.app-mask` 黑色 `rgba(0,0,0,.3)` 遮罩 z 999，`.main-container` margin-left 0。

### 2.2 骨架片段（可直接照抄结构）

```html
<div class="app-wrapper">
  <div class="app-mask" />
  <aside class="sidebar-container has-logo">
    <div class="sidebar-logo-container"><a class="sidebar-logo-link"><span class="sidebar-title">小张的博客后台</span></a></div>
    <el-scrollbar class="pc"><el-menu class="outer-most select-none" mode="vertical" :collapse="isCollapse" :collapse-transition="false" unique-opened/></el-scrollbar>
    <div class="left-collapse">…</div>
  </aside>
  <div class="main-container">
    <div class="fixed-header">
      <nav class="navbar"><!-- 折叠按钮 / 面包屑 / 右侧图标组 --></nav>
      <div class="tags-view"><!-- 标签 + 右键菜单 + 下拉 --></div>
    </div>
    <section class="app-main"><el-scrollbar><div class="main-content"><router-view/></div></el-scrollbar></section>
  </div>
</div>
```

### 2.3 滚动容器归属（复刻必须对齐，否则页面高度全错）

| 区域 | 滚动者 | 说明 |
|---|---|---|
| 侧栏菜单 | `el-scrollbar`（菜单区内滚） | 高度 `calc(100% - 92px)`（有 logo + pc）；无 logo `calc(100% - 44px)`。注：scss 注释写「logo:48+leftCollapse:40+shadow:4=92」，但 `logo.vue` 实际 `height:68px`，**源码内部不一致，以浏览器实测为准** |
| 顶栏 + 标签页 | 不滚 | `.navbar{height:48px;overflow:hidden}` |
| 内容区 | `app-main` 内 `el-scrollbar` | `.app-main{height:100vh;overflow-x:hidden}`，`padding-top:85px` |
| 页面卡片 | **卡片自己滚** | 统一 `height: calc(100vh - 110px); overflow:auto`（见 §4 各页差值） |

> 因为卡片是独立滚动容器，复刻时**不要**把页面内容交给内容区滚——否则表格头吸顶、无限滚动、卡片高度都会与原版不一致。

### 2.4 侧栏细节

- 菜单项：高 **50px**、`line-height:50px`、字号 14px；`.el-menu-item`/`.el-sub-menu__title` 背景透明、`hover` 仅改文字色（`menuHover`）。
- 图标：`.sub-menu-icon{font-size:18px;margin-right:5px;vertical-align:middle;display:inline-flex;align-items:center}`；文字 `span` 溢出省略。
- 激活态：文字 `#fff`；**且**整行底色 `subMenuActiveBg`（default 即 `#4091f7`）——对应类 `.is-active.submenu-title-noDropdown.outer-most` / `.is-active.nest-menu`。
- 子菜单：字号 12px；展开/收起箭头可关动画（`MenuArrowIconNoTransition`），图标 `ep/arrow-down`→`arrow-up`、`ep/arrow-right`→`arrow-left`。
- 折叠态：`.el-menu--collapse{width:54px}`；`.el-menu-tooltip__trigger{width:54px;padding:18px !important}`；标题 `span` 宽高 0 隐藏；激活项左侧 2px 竖条：

```scss
.el-menu--collapse .is-active.submenu-title-noDropdown.outer-most::before {
  content: ""; position: absolute; top: 0; left: 2px; width: 2px; height: 100%;
  background-color: var(--menu-active-before); /* default #4091f7 */
}
```

- logo 区：高 68px，文字 `#1890ff`、20px / 600、宽 160px，`margin-top:5px`（链接）/`10px`（文字）；**没有图片 logo**，折叠时仍显示（被裁切）。
- 折叠按钮（leftCollapse）：高 40px，居中图标，`box-shadow:0 0 6px -2px var(--el-color-primary)`。
- 动画：`--pure-transition-duration: 0.016s`（几乎瞬时，避免"甩动"）；菜单展开 `0.2s ease-in-out`。

### 2.5 顶栏（navbar，48px）

三区布局：左（折叠按钮 + 面包屑）、右（`flex; min-width:280px; justify-content:flex-end; color:#000000d9`）。

| 位置 | 元素 | 尺寸/样式 |
|---|---|---|
| 左 | 折叠按钮（仅 mobile 显示 topCollapse） | `padding:0 12px`，图标 `ri/menu-fold-fill`/`menu-unfold-fill` |
| 左 | 面包屑（非 mix、非 mobile） | `margin-left:16px`，`separator="/"`，行高 50px，`font-weight:400`；首级固定「首页」 |
| 右 | 搜索按钮 | `40×48`，`ep/search` 图标，点击开全屏搜索弹窗；hover 底 `#f6f6f6` |
| 右 | 用户下拉 | `.el-dropdown-link{height:48px;padding:10px}`：头像 22×22 圆形 + 昵称 14px `margin-left:10px`；**菜单只有「退出系统」**（`ri/logout-circle-r-line`，图标 `margin:5px`，`max-width:120px`） |
| 右 | 设置齿轮 | `48×40` 居中，`ri/settings-3-line`，点击 `emitter.emit("openPanel")` 打开右侧配置面板 |

> **刷新 / 通知按钮并不存在**：`navbar.vue` 里 `Notice` 组件被注释（`<!-- <Notice id="header-notice" /> -->`），无刷新按钮。复刻时若需要，按同尺寸 40×48 图标位新增，hover `#f6f6f6`。

### 2.6 标签页 tags-view（启用，`HideTabs:false`，`ShowModel:"smart"`）

高度约 38px（`padding:5px 0` + 标签 28px），白底，`box-shadow:0 0 1px #888`。
> `appMain` 的内联 `padding-top` 是 **85px**（= 48 + 37），与 38px 标签页差 1px；照抄 85 即可（需实测确认视觉无 1px 缝隙）。

```html
<div class="tags-view">
  <span class="arrow-left">‹</span>            <!-- 40×38，左滚 200px，仅溢出时显示 -->
  <div class="scroll-container">
    <div class="tab" style="transform: translateX(0)">
      <div class="scroll-item is-closable is-active">        <!-- 28px，radius 3px 3px 0 0，padding 0 6px，mr 4px -->
        <router-link to="/home">首页</router-link>
        <span class="el-icon-close">×</span>                  <!-- 10px，primary，hover 变 13px + #b4bccc 圆底 -->
        <div class="schedule-active" />                       <!-- smart 模式底部 2px 进度条 -->
      </div>
    </div>
  </div>
  <span class="arrow-right">›</span>           <!-- 40×38，右侧 0.5px 分隔线 -->
  <ul class="contextmenu" v-show="visible">…</ul>            <!-- 绝对定位右键菜单 -->
  <el-dropdown class="arrow-down" placement="bottom-end"/>   <!-- 40×38，全部 8 项 -->
</div>
```

- 激活标签：文字 `var(--el-color-primary)`，白底；首个标签（首页）不可关闭。
- 关闭按钮出现条件：**hover 时滑出**（`padding-right:18px` + `animation: close 200ms ease-in forwards`）。
- 右键菜单（`useTag.ts`）：重新加载 / 关闭当前 / 关闭左侧 / 关闭右侧 / 关闭其他 / 关闭全部 / 整体页面全屏 / 内容区全屏；`li{padding:7px 12px;font-size:13px;display:flex;align-items:center}`，hover **只变字色** primary，背景不变；`svg{margin-right:.5em}`。菜单 `top = clientY - 40`（有固定顶栏时），`left` 上限 `容器宽 - 105`。
- 右侧下拉复用同一份 8 项配置（全屏两项只在这里出现）。
- 有两种备选样式可忽略：`card` 模式（卡片边框/激活边框）、`smart` 模式（进度条，默认）。

### 2.7 固定与响应式

- `.fixed-header{position:fixed;top:0;right:0;z-index:998;width:calc(100% - 210px)}`；折叠后 `calc(100% - 54px)`；`hiddenSideBar` 时 `width:100%` 且内容区 `padding-top:37px`。
- 断点：`≤760px` 强制 vertical + 收起侧栏（mobile）；`760–990px` 自动折叠侧栏；`>990px` 自动展开（用户手动点过则不自动）。业务页另有 `798px` 断点（双列卡变上下堆叠）。

---

## 3. 登录页 / 注册页

### 3.1 登录页（`src/views/login/index.vue`）

**左右分栏**（不是居中卡片）：CSS Grid 两列 + 底部铺满的波浪背景图。

```scss
.login-container {
  width: 100vw; height: 100vh;
  display: grid; grid-template-columns: repeat(2, 1fr);
  grid-gap: 18rem; padding: 0 2rem;
}
.wave { position: fixed; height: 100%; left: 0; bottom: 0; z-index: -1; } /* 全屏背景图 */
.img  { display: flex; justify-content: flex-end; align-items: center; }
.img img { width: 500px; }                 /* 右侧插画 */
.login-box  { display: flex; align-items: center; text-align: center; }
.login-form { width: 360px; }
.avatar { width: 350px; height: 80px; }    /* 顶部 logo 文字图 */
.login-form h2 { text-transform: uppercase; margin: 15px 0; color: #999;
                 font: bold 200% Consolas, Monaco, monospace; }
```

- 背景素材：**`src/assets/login/bg.png`**（17.1 KB，全屏 `<img class="wave">`，不是 `background-image`）。另有 `avatar.svg`（350×80 标题字图）与 `illustration.svg`（13.7 KB，表单左侧插画）。
- 表单：`el-form size="large"`，账号 `ri/user-3-fill` 前缀图标 / 密码 `ri/lock-fill` + `show-password`；按钮 `type="primary" class="w-full mt-4"` 文案「登录」，支持 Enter 提交，`:loading`。
- 下方一行：左 `el-checkbox`「记住我」，右「没有账号？去注册」（`text-decoration:underline; cursor:pointer`，字号 `.8em`、色 `#676767`）。
- 标题来自 `$config.Title`（「小张的博客后台」）；右上角固定 `el-switch`（日/月图标）切暗色。
- 底部备案号：`position:absolute; bottom:5px; left:50%; transform:translateX(-50%); font-size:12px; color:#333`，链接 `hover #000`。
- 入场动效：`@vueuse/motion` 逐项上浮（`initial{opacity:0,y:100} → y:0`，delay 100/150/250ms）。
- 错误提示：表单内联校验文案（如「请输入账号」）+ 接口失败 `ElMessage.error`（EP 默认顶部居中）。
- 响应式：`≤1180px` gap 9rem / 表单 290 / 插画 360；`≤968px` 隐藏背景图与插画、改单列、表单居中。

### 3.2 注册页（`src/views/register/index.vue`）

完全复用登录页骨架与三个素材（`../login/utils/static`）+ `login.css`。差异：表单 4 项（账号/昵称/密码/确认密码），按钮文案「注册」，校验文案：「请输入用户名」「用户名称程度应该在5-16之间」「密码格式应为6-18位数字、字母、符号的任意两种组合」「两次密码不一致」。

---

## 4. 业务页逐一

### 4.0 统一页面模板（15 个页面里有 11 个长这样）

```html
<el-card shadow="never" class="card">   <!-- .card{height:calc(100vh - 110px);overflow:auto} -->
  <template #header>
    <div class="flex justify-between items-center">页面标题</div>
  </template>
  <el-form :inline="true" class="bg-bg_color">…筛选项… 搜索(primary)/重置</el-form>
  <el-space class="mb-4 w-[100%] flex justify-between items-center">批量删除 / 新增</el-space>
  <pure-table border row-key="id" alignWhole="center" showOverflowTooltip
              :size="tableSize" height="calc(100vh - 3xx px)" :pagination/>
</el-card>
```

- 表格右上角浮动**密度切换** `el-radio-group size="small"`（大/中/小 → `tableSize = large/default/small`，默认 small），`class="float-right mb-4"`。
- 分页统一：`{ pageSize:10, pageSizes:[10,15,20], align:"right", background:true, small:true }`，`layout: "total, sizes, prev, pager, next, jumper"`。
- 操作按钮统一 `link + size="small" + 图标`：改 `primary`、通过/恢复 `success`、删 `danger`；危险操作一律 `el-popconfirm`（`icon-color="#66b1ff"`）。
- 空态：el-card 内 el-table 自带「暂无数据」；图片类页面用 `<el-empty />`。
- 弹窗一律 **el-dialog + draggable + `:width="480"`（表单）/`400`（轻量）**，footer 右对齐「取消（default）/ 确定（primary）」或「取消 / 保存草稿（danger plain）/ 发布（danger）」。

### 4.1 仪表盘 `/home`

- 整页一个 `el-card.home`，header「首页」。
- 第一行 4 张统计卡 `el-col :xs="12" :sm="6"`：文章 / 分类 / 标签 / 用户，`HomeCard`：`el-card.m-[5px]` + 左 48×48 svg 图标（`wenzhang/fenlei/biaoqian/yonghu.svg`，hover `scale(1.1)` 0.3s）+ 右列 label（`1.2rem/600`）+ value（`1.6rem/600`）。
- 第二行 `el-col :sm="24" :xs="0"`：**提交热力图**（桌面显示，xs 隐藏）。
- 第三行两个 `el-col :sm="12"`：**柱状图** + **词云**，各 `el-card.m-[5px]`，图高 `35vh`。
- 图表库 **ECharts 5.4.0**（+ `echarts-wordcloud` 2.1.0），`useECharts` 组合式封装，主题 `isDark ? "dark" : "light"`；侧栏折叠时 debounce 300ms resize。
  - 柱状图：x 轴 2023/2024，series watchers/fork/star，`barWidth:15%`，纵向渐变（`#e6a23c→#eebe77`、`#f56c6c→#f89898`、`#409EFF→#53a7ff`），**数据为硬编码 demo**（[2,6]/[12,38]/[89,125]）。
  - 热力图：calendar heatmap，色阶 `["#ededed","#acd5f2","#7fa8d1","#49729b","#254e77"]`，`calendar.itemStyle{color:"#fafafa",borderWidth:3,borderColor:"#fff"}`，cellSize `((w-120)/366)*7`（最小 12），加载中用 `el-skeleton :rows="5"`。
  - 词云：`gridSize:10`、`sizeRange:[12,28]`、`rotationRange:[0,0]`、白底、随机彩色，尺寸为 `Math.random()*4+8`。
- 底部备案号居中（`margin-top:20px; font-size:12px; color:#333`）。

### 4.2 文章列表 `/article/articleList`

- 卡片 header「文章管理」；筛选：文章标题 input / 分类 select / 标签 select（均 `!w-[160px]`）/ 是否置顶 select（是=1 否=2）/ 发布时间 daterange / 搜索 + 重置。
- 动作区只有「新增」（primary small + plus）；随后 `el-tabs` 四页签：**所有文章 / 公开文章 / 私密文章 / 草稿箱**（`lazy`，label 外包 `el-tooltip placement="top-end"`）。
- 列：序号 55 / 标题 minW130 / 描述 minW130 / 分类（el-tag）/ 标签 minW220（多个 el-tag `margin-left:3px`）/ 封面 w200（`el-image w-[160px] h-[80px]` fit cover 可预览）/ 置顶（`el-switch` 1/2）/ 状态 minW80 / 类型 minW80 / 发布日期 / 修改日期 / 操作 **fixed right w180**。
- 操作：修改（primary+edit-pen）/ 公开·隐藏（`el-popconfirm` 「确认 隐藏/公开文章?」success+hide·view）/ 删除（popconfirm 「确认删除文章{标题}?」danger）/ 恢复（仅草稿 status==3，「确认恢复文章{标题}?」）。
- 加载文案：`text:「正在加载第一页...」`，翻页「正在加载第 N 页...」，自定义 svg spinner。

### 4.3 新增 / 编辑文章 `/article/addArticle`、`/editArticle`

- `el-card.shadow="never" class="card"`（`height:calc(100vh - 110px)`，`overflow:hidden`），header「新增文章 / 编辑文章」。
- 主表单 `el-form inline label-width="120"`：标题 `el-form-item style="width:65%" label-width="80" maxlength="55"` + 右侧 `style="width:25%"` 的「发布文章 / 修改文章」按钮（**danger + small + document-checked 图标**）。
- 编辑器：**`md-editor-v3` 的 `<MdEditor>`**，`.md-editor{height:calc(100vh - 260px)}`，`@onUploadImg` 走图片上传。这是唯一的重型第三方编辑器。
- 点发布 → `el-dialog title="发布文章"`（`width 800 / draggable / :fullscreen="true"`，但 CSS 把 `.el-dialog.is-fullscreen` 强制回 `width:800px; overflow-y:auto`），字段：
  标题（纯文本展示）/ 描述 textarea 70% maxlength150 auto2-3 + show-word-limit / 分类 select 380px（filterable allow-create）/ 标签多选 380px `multiple-limit=3` / 缩略图 Upload **260×150**（`.article-cover` 覆盖 el-upload 尺寸，无边框）/ 置顶 el-switch（是/否 1/2）/ 排序 el-input-number 20%（置顶时显示，1–9999）/ 状态 radio（公开/私密/草稿箱）/ 类型 radio（原创/转载/翻译）/ 原文链接 textarea 80%（类型≠原创时显示）。
- 弹窗 footer 固定在右下（`.el-dialog__footer{position:absolute;bottom:0;right:5%}`）：取消 / 保存草稿（danger plain）/ 发布（danger）。

### 4.4 分类管理 `/article/categoryManagement`

- 卡片（`height:calc(100vh - 110px)`）；筛选仅「分类名称」input `!w-[160px]`；动作区左「批量删除」(danger)、右「新增」(primary)。
- 列：selection 30 / 序号 55 / 分类名称 minW130 / 创建日期 / 修改日期 / 操作 fixed right 120。
- 表格高 `calc(100vh - 360px)`。弹窗 `el-dialog width 480 draggable`「新增分类 / 编辑分类」，`el-form label-width:100px`，唯一字段「分类名称」（input `width:380px`，required「请输入分类名称」）。
- 删除文案：`删除分类{名称}?`，popconfirm `icon-color="#66b1ff"`。

### 4.5 标签管理 `/article/tagManagement`

与 4.4 同构：标题「标签管理」、筛选「标签名称」、列 `标签 / 创建日期 / 修改日期 / 操作`、弹窗「新增标签 / 编辑标签」（480，字段「标签名称」380px）、删除文案 `删除标签{名称}?`。

### 4.6 说说列表 `/talk/talkList`

**非表格页**：卡片流。

- `el-card.talk-card`（`height:calc(100vh - 110px)`，隐藏滚动条），header 左「说说列表」右「发布说说」（danger small + plus）。
- `el-tabs` 三页签：公开说说 / 私密说说 / 回收站（label 外包 tooltip）。
- `.talk-parent`（`height:calc(100vh - 260px); overflow:auto`）内每张说说是一张 384px 宽的 `el-card`（`w-[384px]`，非首项 `mt-[20px]`）：
  - header：左置顶图标（20×20 svg，`status==1 && is_top==1`），右 `el-dropdown`（触发器仅 `ArrowDown` 小箭头）菜单：编辑 / 置顶·取消置顶 / 隐藏·公开 / 恢复说说 / 删除。
  - 主体 `.talk-header`：`el-avatar :size="40" shape="square"` + 右列 299px：昵称 14px，正文用 `TextOverflow`（`width:299 maxLines:8 font-size:13`，超行显示「展开/收起」按钮，按钮 `margin-left:3px; background:#fff; color:#4091f7`）。
  - 图片：多图 `grid-template-columns:100px 100px 100px; grid-auto-rows:100px; gap:1px`；单图 120×120；均 fit cover 可预览。
  - 时间：`font-size:12px; margin-top:20px; letter-spacing:1px; color:#676767`，格式「N分钟前」。
- 底部 `.observer`（284px 居中，12px）文案「下拉加载更多 / 暂无更多」，`IntersectionObserver` 触底加载（`threshold:[1]`），每页 5 条。

### 4.7 发布 / 编辑说说 `/talk/addTalk`、`/talk/editTalk`

- 卡片 `height:calc(100vh - 130px)`，header 左标题右「取消(info small) / 保存(danger small)」。
- `el-form label-width="60px" label-suffix=":"`：内容 textarea（`max-w-[300px]`，auto 4–8 行）/ 图片 Upload **9 张 80×80**（容器 268×268，`margin:3px`，无边框圆角 0）/ 置顶 el-switch / 状态 select 120px（公开/私密）。
- 保存时三步全屏 `ElLoading`：图片压缩中 → 努力上传中，请耐心等待......→（保存）成功后 toast 并 `router.go(-1)`。

### 4.8 相册列表 `/photo/photoAlbum`

- `el-card`（body `padding:0 !important`），header「相册管理」+ 右「新增」(primary small + plus)。
- `el-row.album`（`height:calc(100vh - 210px); overflow:auto`），每项 `el-col style="padding:10px" :xs="24" :sm="12" :md="6"`：
  - `.album-card{box-shadow:0 0 12px rgba(0,0,0,.12)}`；顶部 `.pad5` 一行：标题（70% 省略，`#606266`，hover `#66b1ff`）→ 点击进图片列表；右侧 3 个操作图标：进图（`Paperclip` `#67c23a` 18）、改（`Edit` `#66b1ff` 18）、删（popconfirm「删除相册-{名称}?」，`Delete` `#f56c6c` 16，`margin-left:5px`）。
  - 描述 `font-size:.8em; padding:0 10px; width:95%; color:#606266` 单行省略。
  - 封面 `el-image` 宽 100%，**桌面高 200px / ≤798px 高 240px**，fit cover + `animate__fadeIn`。
- 分页：`page-sizes [8,12,16]`，`background=false`，`margin:0 0 10px 10px`。
- 弹窗 `el-dialog width 400`「新增相册 / 编辑相册」：`el-form inline`，字段 相册名称（`form-item50` 50% 宽）、描述（`form-item80` 80% 宽）、封面 Upload **200×200**；footer 取消 / 保存（danger plain small）。

### 4.9 图片列表 `/photo/photoList`

- `el-card.album`（body `padding:5px 5px 0`），header 两行：
  - 行 1：`图库名称 - {albumName}`（`font-weight:600; color:#606266`）。
  - 行 2 按状态切按钮：正常态「新增(primary)/编辑(success)」；编辑态「批量删除(danger)/取消(info)」；回收站「批量删除(danger)/批量恢复(success)/清空(info)」。
- `el-tabs`：相册图片 / 回收站。
- 网格 `.album-upload`（`height:calc(100vh - 280px); overflow:auto`，隐藏滚动条），空态 `<el-empty />`；每张 `.retrieve-box{margin:5px;width:108px;height:108px;display:inline-block;position:relative}`，内含 `el-image` 100% fit cover + 复选 `el-checkbox`（absolute `top:-3px; right:5px`，编辑态显示）。
- 分页 `page-sizes [40,60,100,200]`，`small=true`，`background=false`。

### 4.10 新增图片 `/photo/addPhotos`

- 卡片 header 两行：行 1 `图库名称 - {albumName}` + 右「保存(danger)/取消(info)」；行 2 `.tips{font-size:.8rem; color:#f56c6c}`：「tips: 最多上传9张照片，并且总大小不能超过30M」。
- body `.album-upload`（`height:calc(100vh - 260px); overflow:auto`），Upload 9 张 **108×108**（multiple，无预览，`margin:3px`，`border-radius:0`）。
- 保存：全屏 loading 三步（压缩 / 上传 / 保存）→ 「保存成功」回图片列表。

### 4.11 博客网站信息 `/site/siteManagement`

- 外层 `el-form label-width="80"` + `el-row :gutter="10"`，两列 `el-col :sm="24" :md="12"`。
- 左卡 `.site-card`（`height:calc(100vh - 110px); position:relative`，body `height:100%; overflow:auto`），header「博客信息管理」+ 右侧「编辑(primary plain)」或「取消(info plain) / 保存(danger plain loading)」。
  - 首项是「背景 + 头像」组合块：`.avatar-form{height:160px; margin-left:-50px}`，`.bg-upload` 绝对定位铺满（封面 300×140），`.avatar-upload` 头像 **60×60 圆**（`margin:100px 0 0 30px`）。
  - 字段：博客名称（maxlength 20）/ 个性签名（textarea auto 2–4，maxlength 225 + 字数）/ 码云 / B站 / github 链接。只读态显示文本，空值显示「暂无个签 / 暂无gitee / 暂无bilibili / 暂无github」。
- 右卡 `.site-card2`（body `height:90%`）：6 个 **80×80** 二维码上传（企鹅/微信/企鹅群组/微信群组/绿宝宝/蓝宝宝）+ 博客公告 textarea（auto 2–4，maxlength 225，只读态空值「暂无公告」）。
- `≤798px` 右卡 `margin-top:10px` 堆叠。

### 4.12 背景管理 `/site/headerManagement`

- `el-card`（body `padding:0 !important`），header 左「背景管理」右「新增」(primary small + plus)；header 第二行 `.tip{font-size:.7rem; color:#f56c6c}` 两行说明。
- `el-row.page-header`（`height:calc(100vh - 210px); overflow:auto`），每项 `el-col style="padding:10px" :xs="24" :sm="12" :md="6"`：
  - `.page-header-card{position:relative; border-radius:8px; box-shadow:0 0 12px rgba(0,0,0,.12)}`。
  - `.operate` 绝对定位右上（`top:5px; right:5px`）：编辑 `Edit` 18px `#66b1ff`；删除 popconfirm「删除背景-{route_name}?」`Delete` 16px `#f56c6c`。
  - 两行标题（70% 省略、600、`#606266`、hover `#66b1ff`）：「页面名称: x」「路由: y」。
  - 预览图 `el-image` 宽 100%，桌面高 **200px** / ≤798px **240px**，fit cover + `fadeIn`。
- 弹窗 `el-dialog width 400`「新增背景 / 编辑背景」：`el-form inline label-width=100`：页面名称 select（选项来自 `routerList.js`，已占用项 disabled，切换同步路由）/ 路由 input **disabled** / 背景图 Upload 200×200；footer 取消 / 保存（danger small plain）。

### 4.13 留言管理 `/site/messageManagement`

- `el-card`（`height:calc(100vh - 110px); overflow:auto`），header「留言管理」+ 密度切换；筛选：「留言内容」input / 「留言时间」daterange / 搜索 / 重置。
- 动作区仅「批量删除」(danger small)。表格高 `calc(100vh - 350px)`。
- 列：selection 30 / 序号 55 / 昵称 120 / 头像 80（`el-avatar` + 昵称 fallback）/ 留言内容（无定宽）/ 留言日期 150 /（备注列渲染 `el-tag` 来源 qq=default、wx=success、其他=info）。
- 删除确认 `ElMessageBox.confirm("确认删除？","提示",{confirmButtonText:"确认", cancelButtonText:"取消"})`；未选时 `message("请先选择留言",{type:"warning"})`。

### 4.14 友链管理 `/site/links`

- 卡片（`height:calc(100vh - 110px)`），header「友链管理」+ 密度切换；筛选：「网站名称」input / 「申请时间」daterange / 搜索 / 重置。
- 动作区：批量删除(danger) / 批量审核(primary，status≠审核通过时显示) + `el-tabs`（所有友链 / 待审核 / 审核通过）。表格高 `calc(100vh - 400px)`。
- 列：selection 30 / 序号 55 / 头像 80（`el-avatar`，无图时取 `url + '/favicon.ico'`）/ 网站名称 / 描述 / 地址 / 状态（`el-tag` warning=待审核、success=审核通过）/ 申请日期 / 通过日期 / 操作 minW120（修改 primary、通过 success）。
- 弹窗「修改友链」480 draggable：网站名称 / 描述 / 地址（均 380px）+ 头像 Upload **80×80 圆**（`border-radius:40px`）。

### 4.15 用户管理 `/user/userManagement`

- 卡片（`height:calc(100vh - 110px)`），header「用户管理」+ 密度切换；筛选：「用户昵称」`!w-[180px]` / 「用户角色」select 180px（管理员=1 / 普通用户=2）。
- 表格高 `calc(100vh - 300px)`。列：序号 55 / 用户名 minW100 / 昵称 minW120 / 头像 minW100（`el-avatar :size="45"`）/ 角色 minW180（`el-switch` 文案 管理员·普通用户）/ IP minW180 / 创建日期 / 修改日期 / 操作 80。
- 弹窗「编辑用户」480 draggable：昵称 380px + 头像 80×80 圆。

### 4.16 个人中心 `/personal/personalManage`

- `.personal-card{height:calc(100vh - 110px); display:flex; justify-content:space-between}`，≥798px 时左右各 **40%**（右卡 `margin-left:20px`），≤798px 上下堆叠。
- 左卡 header「个人信息管理」+ 编辑/取消/保存；`el-form label-width="100"`：个人头像 Upload **80×80 圆**（`margin-left:30px`）+ 昵称（maxlength 20）。
- 右卡 header「密码管理」+ 同款切换；`label-width="120"`：原密码 / 新密码 / 二次确认（`show-password`，minlength 4 maxlength 16）。
- body `height:90%`。

### 4.17 404

`h-[640px]` 居中 flex：左 `@/assets/status/404.svg`（作为组件引入）+ 右 `ml-12`：标题「404」（`font-medium text-4xl mb-4 dark:text-white`）、文案「抱歉，你访问的页面不存在」（`mb-4 text-gray-500`）、`el-button type="primary"` 返回首页。三块用 `v-motion` 上浮（delay 100/300/500ms）。

---

## 5. 交互细节

### 5.1 动画

| 场景 | 值 |
|---|---|
| 侧栏宽/内容左距 | `margin-left var(--pure-transition-duration)` = **0.016s** |
| 菜单展开/收起 | `.el-collapse-transition` **0.2s** ease-in-out；`MenuArrowIconNoTransition` 时箭头无动画 |
| 折叠态 tooltip | `el-tooltip :offset="-10"`，`effect` 由 `TooltipEffect`（light） |
| 路由切换 | `transition name="fade-transform"` + `mode="out-in"` + `appear`：`all .5s`，进 `opacity:0;translateX(-30px)`，出 `translateX(30px)` |
| 面包屑 | `transition-group name="breadcrumb"`：`0.4s` 进 / `0.3s` 出，`translateX(20px)`，离场 `position:absolute` |
| 标签页位移 | `.tab{transition: transform .5s ease-in-out}`，标签 `transition: all .4s` |
| 右侧面板 | `all .25s cubic-bezier(.7,.3,.1,1)`，遮罩 opacity `.3s` 同曲线 |
| 图片卡片入场 | `animate.css` 的 `fadeIn`；统计卡图标 hover `scale(1.1) 0.3s` |
| 标签页右键菜单 | `el-zoom-in-top` |

### 5.2 hover / 状态

- 顶栏图标位 hover 底 `#f6f6f6`（`.search-container / .dropdown-badge / .el-dropdown-link / .set-icon`）；暗色由 `var(--el-bg-color)` 系列覆盖。
- 标签页 close 图标：10px primary → hover 圆底 `#b4bccc` + 13px 白字。
- 右键菜单项 hover 只改字色 primary（背景不改）。
- 表格操作按钮为 `el-button link`，hover 仅加浅色底（EP 默认 `--el-button-hover-link-text-color`，需实测）。
- 侧栏菜单 hover 只改文字色（default `#fff`），不改背景。

### 5.3 消息与确认

- 统一封装 `message()`（`src/utils/message.ts`）：`ElMessage`，`customClass: "pure-message"`，**白底、无边框、`padding:10px 13px`、内容色 `#000000d9`、图标 `margin-right:8px`、关闭钮 `right:9px`**，阴影三层 `0 3px 6px -4px #0000001f, 0 6px 16px #00000014, 0 9px 28px 8px #0000000d`；位置为 EP 默认顶部居中。
- 文案风格：「登录成功」「保存成功」「修改成功」「删除成功」「发布成功」「请先选择留言/友链」（warning）。
- 危险操作：优先 `el-popconfirm`（`icon-color="#66b1ff"`，标题如 `确认删除文章{标题}?`）；批量删除用 `ElMessageBox.confirm("确认删除？","提示",{confirmButtonText:"确认",cancelButtonText:"取消"})`。
- 全屏 loading：`ElLoading.service({fullscreen:true, text:"…"})`，文案「图片压缩中」「努力上传中，请耐心等待......」「图片保存中......」。

### 5.4 弹窗汇总

| 场景 | 宽度 | 其他 |
|---|---|---|
| 分类 / 标签 / 友链 / 用户 编辑 | 480 | `draggable`，`el-form label-width:100px`，字段 `width:380px` |
| 相册新增/编辑、背景新增/编辑 | 400 | 背景弹窗 `inline` 表单 |
| 文章发布 | 800 | `draggable` + `:fullscreen="true"`（CSS 强制 800 宽、footer 绝对定位于右下） |
| 封面大图预览 | 默认 | 内嵌 `<img w-full>` |
| 右侧「项目配置」 | **315px** | 非 `el-drawer`，自写 fixed 面板：`transform:translate(100%)→translate(0)`，遮罩 `rgba(0,0,0,.2)`，header「项目配置」+ 关闭钮 20×20 rounded-4 |

### 5.5 表格加载态

自定义 spinner（svg，`viewBox="-10, -10, 50, 50"`，描边主色），文案「正在加载第一页...」/「正在加载第 N 页...」；`loading` 状态由 `useTable` 管理（纯视觉上是 EP loading 遮罩 + 半透明）。

---

## 6. 图标与素材

### 6.1 图标方案（三套并存，复刻可统一）

1. **`@iconify-icons/ep` + `@iconify-icons/ri` 离线包** → `<IconifyIconOffline :icon="Plus" />`（全局注册组件）。字符串图标（如菜单 `meta.icon`）走 `useRenderIcon`：含 `:` 走在线 Iconify，否则离线。
2. **本地 svg 单文件组件**（`?component`）：统计卡 4 个、404/403/500、日/月/全屏/上传等。
3. **iconfont**（`src/assets/iconfont/`，`FontIcon` 组件，前缀 `IF-`）。

侧栏菜单图标名（字符串）：`homeFilled`、`list`、`setting`、`user`、`userFilled`。高频图标：`ep/search`、`ep/plus`、`ep/edit`、`ep/edit-pen`、`ep/delete`、`ep/close`、`ep/close-bold`、`ep/refresh`、`ep/refresh-right`、`ep/arrow-down/up/left/right`、`ri/logout-circle-r-line`、`ri/settings-3-line`、`ri/menu-fold-fill`、`ri/menu-unfold-fill`、`ri/arrow-down-s-line`、`ri/text-direction-r/l`、`ri/text-spacing`、`ri/subtract-line`、`ri/fullscreen-fill`、`ep/document-checked`。Element Plus 内建 `@element-plus/icons-vue`：`Plus/Delete/ZoomIn/Edit/Paperclip/ArrowDown`。

### 6.2 素材清单（全部实际文件）

| 路径 | 用途 |
|---|---|
| `src/assets/login/bg.png`（17.1KB） | 登录/注册页全屏波浪背景 `<img class="wave">` |
| `src/assets/login/avatar.svg`（0.7KB，350×80） | 登录页标题字图 `.avatar` |
| `src/assets/login/illustration.svg`（13.7KB） | 登录页右侧插画（`.img img{width:500px}`） |
| `src/assets/svg/{wenzhang,fenlei,biaoqian,yonghu}.svg`（1.2–1.6KB） | 首页 4 张统计卡 48×48 图标 |
| `src/assets/svg/{day,dark}.svg` | 暗色切换开关图标 |
| `src/assets/svg/{zhiding,back_top,full_screen,exit_screen,keyboard_esc,enter_outlined}.svg` | 置顶徽标、回到顶部、全屏 |
| `src/assets/status/{403,404,500}.svg`（10–13KB） | 错误页插画（当前只用 404） |
| `src/assets/img/{earth,night,clouds,starfield,bathymetry_bw_composite_4k}.jpg/png` | pure-admin 遗留示例图，**本后台业务未使用**，复刻可丢弃 |
| `public/favicon.ico` | 站点图标 |
| `public/serverConfig.json` | 全局配置（布局/主题开关），入口动态 fetch |

无侧栏 logo 图片（纯文字 `#1890ff`）；无登录背景以外的品牌位图。

---

## 7. 迁移到自建骨架的要点

### 7.1 scss 变量 → CSS 自定义属性（Tailwind 4 可直接消费）

```css
/* 建议在全局 css 里声明，并由 body[data-layout-theme] / .dark 覆盖 */
:root {
  --admin-sidebar-w: 210px;
  --admin-sidebar-collapsed-w: 54px;
  --admin-logo-h: 68px;
  --admin-navbar-h: 48px;      /* 顶栏 */
  --admin-tags-h: 38px;        /* 标签页 */
  --admin-content-bg: #f0f2f5;
  --admin-content-pad: 12px;
  --admin-menu-bg: #001529;
  --admin-logo-bg: #002140;
  --admin-menu-text: rgb(254 254 254 / 65%);
  --admin-menu-active-text: #fff;
  --admin-menu-active-bg: #4091f7;
  --admin-header-shadow: 0 1px 4px rgba(0, 21, 41, .08);
  --admin-transition: .016s;
}
.dark { --admin-content-bg: #020409; --admin-header-shadow: 0 1px 4px #0d0d0d; }
```

- 原 `body[layout=vertical]` 上的 `$sideBarWidth:210px` → `--admin-sidebar-w`；折叠 `54px` 用 `[data-collapsed]` 切换。
- Tailwind 4 直接用 `w-[var(--admin-sidebar-w)]`、`bg-[var(--admin-menu-bg)]`，或写 `@theme` 里的 `--color-sidebar` 等；**不要**再保留 tailwind.config 里 `colors.primary → var(--el-color-primary)` 的旧写法，改用 `@theme { --color-primary: var(--el-color-primary) }`。

### 7.2 必须重写/替代的 pure-admin 依赖

| 原 | 复刻建议 |
|---|---|
| `@pureadmin/table`（`<pure-table>`） | 薄封装 el-table + el-pagination 即可：props `border/row-key/alignWhole/showOverflowTooltip/size/height/pagination/loadingConfig`，内部 `v-loading` + 分页组件；约 120 行 |
| `@pureadmin/utils`（`useECharts`、`storageLocal`、`useDark`、`toggleClass`、`deviceDetection`） | 自写 4 个小工具：`useECharts`（init + resize + 主题切换）、`useStorage`（pinia 或 `useStorage` from vueuse）、`useDark`（html.dark）、`isMobile` |
| `@vueuse/motion`（登录/404 入场） | 用 CSS `@keyframes fade-up` + `animation-delay`，零依赖等价 |
| `md-editor-v3` | 保留引入（`MdEditor` + `md-editor-v3/lib/style.css`），这是文章页 1:1 的唯一实际依赖 |
| `echarts` + `echarts-wordcloud` | 保留；热力图 calendar + 柱状渐变 + 词云配置照抄 |
| `@pureadmin/theme`（`toggleTheme` scope 注入） | 简化为**只保留 default 深蓝 + light 两套**（其余 7 套是模板附带，业务价值低）；用 `body[data-theme]` + CSS var 覆盖即可 |
| iconify 离线包 | 换成 `unplugin-icons` 或 `@iconify/vue` + 按需导入；图标名一一对应 |
| `IconifyIconOffline / IconifyIconOnline / FontIcon / useRenderIcon` | 保留一个 `Icon` 组件 + `useRenderIcon` 分派（字符串→iconify、函数→svg 组件），接口签名不变最省事 |

### 7.3 布局壳复刻顺序（建议工作量）

1. **Layout 容器 + 变量**（1–2h）：`.app-wrapper/.main-container/.fixed-header/.app-main`，滚动容器按 §2.3 分配。
2. **Sidebar 菜单**（3–5h）：自己写递归菜单（el-menu 直接可用，关键是 50px 行高、18px 图标、激活 `#4091f7` 整行底色、折叠 54px 与左侧 2px 竖条、logo 68px 文字 logo、底部 40px 折叠条）。
3. **Navbar**（1–2h）：48px，左右三区，用户下拉只有「退出系统」，设置齿轮开右侧面板（可选不做）。
4. **Tags-view**（4–8h，最费工）：若必做 → 标签状态存 Pinia（`multiTags`）、滚动位移 transform、hover 关按钮动画、右键菜单 8 项、下拉。**建议先做"仅展示当前路由 + 关闭按钮"的简化版**，右键菜单与左右滚动延后。
5. **登录/注册页**（2–3h）：grid 两列 + 三张素材 + 表单宽度 360。
6. **业务页**（每页 20–40min）：套用 §4.0 模板，按各页列的宽度与卡片高度差微调；仪表盘（图表配置照抄）约 2–3h；说说列表（卡片流 + 无限滚动）约 2h；图片/相册（108px 网格、缩略图弹窗）约 2h。
7. **暗色 + 主题色**（1–2h）：`html.dark` 变量 + EP 暗色 css 变量 + `--el-color-primary` 派生脚本。

### 7.4 复刻陷阱（踩了就不像）

- 内容区**不是唯一滚动容器**：卡片自己 `calc(100vh - 110px)` 并隐藏滚动条，若改成内容区滚动，页面高度、表格吸顶、无限滚动全变。
- `--pure-transition-duration: 0.016s` 是关键手感——写 `0.3s` 侧栏会明显"甩"。
- 标签页高度 38px，`.app-main` 顶留白 **85px**（48+37）；改任何一个都要同步。
- 侧栏收起是 **54px** 而不是 64px；菜单项 **50px** 而不是 56px。
- 登录页背景是 `<img>` 不是 `background`，`z-index:-1` + `fixed`，窗口缩放时不裁切（`height:100%`）。
- 危险主操作是 **danger 色**（发布/保存/删除），primary 只用于「新增/搜索」，这是原版最明显的色感特征。
- 卡片标题用 `#606266`/600，不要用 EP 默认 `#303133`。
- 表格 `showOverflowTooltip` + `alignWhole:"center"` 全站开启，文字全部居中（含操作列）。

### 7.5 工作量总评

| 类别 | 占比 | 说明 |
|---|---|---|
| 纯样式（可 1:1 像素级还原） | ~55% | 布局壳、卡片、表格、表单、按钮、登录页、暗色 |
| 需重写组件/逻辑 | ~35% | pure-table 封装、tags-view、纯手写右侧面板、图表 hook、无限滚动说说、Upload 组件（108/80/200/260×150 四种尺寸） |
| 依赖外部资源 | ~10% | 登录三张素材（可复用原文件）、md-editor-v3、echarts + wordcloud、iconify 图标 |

预计：**布局壳 + 登录 1–1.5 天；15 个业务页 2.5–3.5 天；暗色/主题/打磨 0.5–1 天**（1 人，熟悉 EP 的前提下）。
