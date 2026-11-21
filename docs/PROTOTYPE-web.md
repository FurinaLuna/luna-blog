# PROTOTYPE-web：原 Vue3 博客前台视觉/布局复刻规格
> 只读考古产出。源码基准：`_ref/vue3-blog/blog-v3/`（Vue 3.3 + Element Plus 2.x + Tailwind 3.4 + GSAP 3）。
> 目标：用 **Vue 3.5 + Vite 8 + TS 7 + Pinia 4 + Tailwind CSS 4 + Element Plus 2.14** 1:1 还原外观。标注「需实测」= 源码未给出确定值、依赖运行时数据或作者未实现。

## 0. 关键前提（先读，影响全部尺寸）
1. **根字号 14px**：`:root { --global-font-size: 14px }` + `html,body{font-size:var(--global-font-size)}`。全项目尺寸混用 `rem` 与 `px`：
   - `1rem = 14px`（所以 `3.6rem = 50.4px`，`22rem = 308px`，`10rem = 140px`，`16rem = 224px`）。
   - 若迁移后忘记设 `html{font-size:14px}`，整站会放大约 14%。
2. **SCSS 全局注入**：`vite.config.js` 的 `css.preprocessorOptions.scss.additionalData` 把 `@import "./src/styles/base.scss"` 注入每个 `.vue` 的 `<style lang="scss">`，因此 `variable/base/element/custom/markdown/transition` 全站生效。
3. **Tailwind 3 只是摆设**：`tailwind.config.cjs` 仅 `colors:{"primary-blue":"#5cbfef"}` 且 `preflight:false`；正文里大量 `!w-[100%]`、`!mt-[20px]` 是原子类点缀，主体布局是手写 SCSS。
4. **路由为 hash 模式**（`createWebHashHistory`），路径形如 `#/home`。

## 1. 全局视觉 token
### 1.1 `src/styles/variable.scss` — `:root`（逐条，含用途）
| 变量 | 值 | 用途 |
|---|---|---|
| `--global-font-size` | `14px` | 根字号基准 |
| `--primary` | `#49b1f5` | 主色（链接 hover、菜单 active、点赞态、分类/时间轴高亮） |
| `--router-color` | `#dddddd` | 页面头部路由大标题、留言板标题文字 |
| `--font-color` | `#4b4948` | 正文字色 |
| `--second-font-color` | `#b3b7ff` | 次要强调色（文章时间、时间轴节点 hover） |
| `--hot-color` | `#f00` | 热/红标记 |
| `--md-active` | `#49b1f5` | Markdown 目录激活项 |
| `--global-white` | `#fff` | 白 |
| `--global-black` | `#000` | 黑 |
| `--global-shadow-white` | `rgba(255,255,255,.5)` | 浅白遮罩（暗色 slider 底、咖啡杯描边） |
| `--meta-color` | `#858585` | 文章卡片 meta 行 |
| `--comment-grey` | `#a4a4a4` | 评论辅助文字 |
| `--border-color` | `#7ec4f2` | 边框/时间轴节点 |
| `--hr-border` | `#a9d5f4` | 时间轴竖线 |
| `--top` | `#f26c60` | 置顶图标 |
| `--error` | `#f56c6c` | 错误提示 |
| `--music-main-active` | `#62c28a` | 音乐播放器激活色（绿） |
| `--music-main-bg` | `#fff` | 音乐面板底 |
| `--mask-bg` | `rgba(0,0,0,.5)` | 遮罩（唱片遮罩、推荐卡 hover 遮罩） |
| `--shadow-button-bg` | `rgba(210,210,210,.5)` | 按钮/相册区块底 |
| `--card-bg` | `#fff` | 卡片底（el-card） |
| `--card-box-shadow` | `0 3px 6px 3px rgba(7,17,27,.06)` | 卡片默认阴影 |
| `--card-hover-box-shadow` | `0 3px 6px 3px rgba(7,17,27,.15)` | 卡片 hover 阴影 |
| `--chat-bg` | `#e6e6e6` | 聊天室底色 |
| `--global-gradient` | `#fff` | 页面总背景（`.layout` background） |
| `--header-bg` | `rgba(29,30,31,.5)` | 滚动后 header 背景 + page-header 底色 |
| `--home-bg` | `#303030` | 首页兜底深灰 |
| `--home-mask-color` | `rgba(0,0,0,.2)` | 首页遮罩 |
| `--menu-color` | `#fff` | 导航文字（深浅色主题差异大） |
| `--message-content-bg` | `#fff` | 留言内容底 |
| `--button-linear-gradient` | `linear-gradient(300deg,#74ebd5 0%,#9face6 100%)` | 主按钮渐变（青→蓝紫） |
| `--button-linear-gradient-h` | `linear-gradient(300deg,#9face6 0%,#74ebd5 100%)` | 主按钮 hover 反向渐变 |
| `--wave-one-color` | `rgba(255,255,255,.7)` | 波浪第 1 层 |
| `--wave-two-color` | `rgba(255,255,255,.5)` | 波浪第 2 层 |
| `--wave-three-color` | `rgba(255,255,255,.3)` | 波浪第 4 层（注意：三层对应尾层） |
| `--wave-four-color` | `rgba(255,255,255,1)` | 波浪第 3 层（不透明白） |
### 1.2 `html.dark` 覆盖（只覆盖差异项）
```
--font-color:#b8b8b8   --global-gradient:#282828   --card-bg:#303030
--shadow-button-bg:rgba(0,0,0,.2)   --home-bg:#282828   --home-mask-color:rgba(0,0,0,.4)
--music-main-bg:#303030   --menu-color:var(--font-color)   --message-content-bg:#3b3b3b
--button-linear-gradient:linear-gradient(300deg,#a286a2 0%,#648faf 100%)   /* 灰紫→灰蓝 */
--button-linear-gradient-h:linear-gradient(300deg,#648faf 0%,#a286a2 100%)
--wave-one-color:rgba(40,40,40,.7)  --wave-two-color:rgba(40,40,40,.5)
--wave-three-color:rgba(40,40,40,.3) --wave-four-color:rgba(40,40,40,1)
```
暗色切换 = 给 `<html>` 加/去 `dark` 类（Element Plus 暗色也靠该类 + `element-plus/theme-chalk/dark/css-vars.css`）。
### 1.3 `base.scss` — 全局重置与骨架尺寸
- `html,body`：`width:100%; min-height:100vh; padding:0; margin:0 !important; -webkit-font-smoothing:antialiased; text-rendering:optimizeLegibility; font-size:var(--global-font-size)`。 字体栈：`Helvetica Neue, Helvetica, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif`。 `*{box-sizing:inherit; margin:0; padding:0}`（注意 `box-sizing:inherit` 而非 `border-box`，`html` 未设 `border-box`，实际等效 content-box → 迁移时建议显式 `border-box` 并复测）。 `ul{list-style:none}`；`a,a:focus,a:hover{cursor:pointer;color:inherit}`；`.clearfix`。 `.layout{background:var(--global-gradient)!important}`。 **`.header_box`**：`position:fixed; top:0; left:0; z-index:2001; width:100%; height:3.6rem; overflow:hidden`。 **`.main_box`**：仅 `box-sizing:border-box`（不设 padding，padding 由各页 `.center_box` 提供）。 **`.footer_box`**：`width:100%; z-index:2009; height:10rem; overflow:hidden; backdrop-filter:saturate(100%) blur(3px)`。 `.blog_info{padding:0 7.5px!important}`。 入场动画：`.page-header,#home{transition:all .5s; animation:fadeIn 1s}`（opacity .5→1）；`.center_box{animation:Up 1s}`（`translateY(50px)+opacity 0` → `0/1`）。 滚动条：`::-webkit-scrollbar{width:4px;height:4px}`，`track{display:none}`，`thumb{background:var(--font-color); border-radius:1em}`。
### 1.4 响应式断点（唯一断点 **768px**）
| 类 | ≤768px（手机） | ≥768px（PC） |
|---|---|---|
| `.home_center_box` | padding-top 20px；min-height `calc(100vh - 128px)` | padding-top 20px；**max-width 1080px**；margin auto；min-height 同左 |
| `.center_box` | padding `1.6rem 10px`；min-height `calc(100vh - 30rem)` | padding `2.8rem 10px`；**max-width 880px**；margin auto；min-height 同左 |
| `.article-center` | padding `1.6rem 10px`；min-height `calc(100vh - 28rem)` | padding `2.8rem 10px`；**max-width 1280px**；min-height 同左；margin auto |
| `.pc_menu` | `display:none` | `padding:0 20px` |
| `.mobile_menu` | `height:100%; padding:0 10px` | `display:none` |
| `.right-side-space` | — | `padding:7.5px 1.875px !important` |
| `.el-dialog` | 全屏：`width/height 100%!important; margin 0!important` | `min-width 30vw; margin-top 15vh; min-height 50vh; border-radius:8px` |
| `.mobile-affix` | `fixed; bottom:30%; left:0`；icon 1.8rem | `display:none` |
| `.recommend` | height `10rem` | height `12rem` |
| `.mobile-top-card`/`.mobile-bottom-card` | 显示 | `display:none` |
| `.avatar-show` | block | none |
### 1.5 `custom.scss` — 可复用工具类（复刻时直接映射 Tailwind）
```scss
.flex_center{display:flex;justify-content:center;align-items:center}
.flex_r_between{display:flex;justify-content:space-between;align-items:center}
.flex_r_around{display:flex;justify-content:space-around;align-items:center}
.flex_c_center{display:flex;flex-direction:column;justify-content:center;align-items:center}
.flex_c_between{display:flex;flex-direction:column;justify-content:space-between}
.flex_c_start{display:flex;flex-direction:column;justify-content:flex-start;align-items:center}
.flex_r_start{display:flex;justify-content:flex-start;align-items:center}
.flex_1{flex:1} .flex_wrap{flex-wrap:wrap} .inline_block{display:inline-block}
.to_pointer{transition:.3s ease-in-out;&:hover{color:var(--primary);cursor:pointer}}
.text_overflow{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.scale{cursor:pointer;transition:.3s ease-in-out;&:hover{transform:scale(1.1)}}
.pad_5{padding:5px} .iconfont{cursor:pointer} svg{cursor:pointer}
```
- **主按钮 `.apply-button`**：`position:relative; display:inline-block; padding:5px 20px; border-radius:8px; font-weight:900; font-size:16px; color:#fff; background-image:var(--button-linear-gradient); transition:all .6s; border:none; z-index:1`；`&:hover{transform:translateY(-3px)}`；`::before` 铺满同尺寸、`background-image:var(--button-linear-gradient-h)`、`opacity:0→1 .6s ease-in-out`、`z-index:-1`（渐变交叉淡入）。 `.avatar-font{font-weight:bold;color:#fff}`；`.list-enter-active,.list-leave-active{transition:all .8s ease}`；`.chat-dialog{padding:5px!important; overflow:hidden!important}` 且清空 dialog header/body padding。
### 1.6 `element.scss` — Element Plus 外观改写（关键项）
- `.el-card`：`border:none; border-radius:5px 5px 8px 8px; box-shadow:var(--card-box-shadow)!important; background:var(--card-bg); transition:all .3s`；`__body{padding:0!important}`（⇒ 所有卡片内容自己写 padding）。 `.card-hover:hover`：`box-shadow:var(--card-hover-box-shadow)!important; transform:translateY(-3px)`。 `.el-dialog__header{padding:10px}`、`__body{padding:10px 20px}`、`.el-dialog__headerbtn{position:absolute;top:-5px;right:0;font-size:1.6rem}`。 `.el-menu`：透明底无右边框；`.el-menu-item{font-size:1em;font-weight:500;padding:0 10px;color:var(--menu-color)}`；active `color:var(--primary)`；hover 同色透明底；`.el-sub-menu__title{padding:0 20px!important;color:var(--menu-color)!important}`。 `.el-button{padding:.5rem 1rem}`；`.el-input__wrapper{border-radius:12px}`。 `.el-popper.is-light`：`border:none; font-weight:600; color:#4090c9; background:linear-gradient(120deg,#faeeff,#cfebf3)`（粉→青双色渐变气泡），箭头隐藏。 `.el-collapse-item__header/__content`：同款 `linear-gradient(120deg,#faeeff,#cfebf3)`，header `font-size:1.3rem;font-weight:600;color:var(--font-color)`。 `.el-avatar`：`transition:ease-in-out 1s; background-image:var(--button-linear-gradient)`；hover `rotate(360deg)`。 栅格补偿：`.el-col*{padding:7.5px 3.75px!important}`（所有 col 统一，配合 `el-row` 默认负 margin 形成 15px gutter）。 `.el-message{top:60px!important}`；`.el-notification`：手机 `width:12rem!important`、PC `16rem!important`，均 `opacity:.7!important`。 `.el-form-item{padding:15px 0;margin-bottom:3px}`；`.el-form-item__label{font-size:20px;font-weight:900}`；`.el-switch__core{background:#676767!important}`；`.el-popover.el-popper{min-width:30px!important;padding:3px!important}`。 占位符 `input/textarea::placeholder{font-size:16px;font-weight:700}`。
### 1.7 `loading.scss` — 咖啡杯 loading + 进场动画
`.coffee_cup`：`20x24px; border:2px solid rgb(87,86,86); border-radius:0 0 5px 5px; background:#b0a5a5; position:absolute; margin:20px auto`；
`::after` 杯柄 `5x12; border:2px solid #303030; border-left:none; border-radius:0 20px 20px 0; left:20px`；
`::before` 三缕热气 `2x5; background:rgb(87,86,86); top:-10px; left:2px; box-shadow:5px 0 0 rgb(87,86,86), 5px -7px 0 rgb(87,86,86), 10px 0 0 rgb(87,86,86)`，动画 `steam 1s linear infinite alternate`（height 5px→0、translateY -2→2）。暗色下描边改 `--global-shadow-white`、底色 `rgb(87,86,86)`。
`.above-enter{animation:aboveEnter .8s ease-in-out}`（`scale .95 + translateY(-20px)`→0）；`.bottom-enter` 同理 `+20px`。三个视图的骨架/列表都用这类类名做入场。
### 1.8 `transition.scss` / `markdown.scss`
```scss
.component-enter-from,.component-leave-to{opacity:0}
.component-enter-to,.component-leave-from{opacity:1}
.component-enter-active,.component-leave-active{transition:all .6s}
.main-enter-from,.main-leave-to{transform:translateX(-10px)}   // + .6s
```
`.md-preview-v3{background:rgba(255,255,255,.3)}`（暗色 `rgba(0,0,0,.1)`）；`.code-block::-webkit-scrollbar-thumb{background:#efbcda!important}`（暗色 `#69696b`）。
### 1.9 首屏 JS 前加载动画（`index.html` 内联）
`#app` 内放 `.load`（80×80，绝对居中）含 4 个 `<hr>`（40% 尺寸、`border-radius:50%`、`animation:spin 2s ease infinite`），颜色交替 `#49b1f5 / #aadafa`，`animation-delay:-1.5s/-1s/-.5s/0`。
`@keyframes spin`：`0%,100% translate(0)` → `25% translate(160%)` → `50% translate(160%,160%)` → `75% translate(0,160%)`（四球绕方框跑圈）。

## 2. 页面骨架
```
Layout/index.vue
└─ div.layout
   ├─ BlogHeader  → div.header_box        (fixed, h 3.6rem≈50.4px, z-index 2001)
   ├─ BlogMain    → div.main_box          (router-view + keep-alive)
   └─ BlogFooter  → div.footer_box        (h 10rem≈140px, z-index 2009, 毛玻璃)
```
`App.vue` 在 Layout 之外常驻：`BackTop`（非 `/` 才显示）、移动端返回箭头、`MusicPlayer`、`ChatRoom`（非 `/` 才显示）、`ContextMenu`。
### 2.1 Header（`Layout/header/blog-header.vue`）
- 结构：`.header_box` 内并列 `.pc_menu`（≥768）与 `.mobile_menu`（<768）；末尾挂 `<Login>` 弹窗组件。 滚动行为（`debounce 5ms` 监听 window scroll）：
  - `scrollTop <= 50` → class `fixed-header`，且**内联** `background:transparent`；
  - 向上滚（`startScrollTop > scrollTop`）→ `fixed-header`；
  - 向下滚 → `hide-header`；`scrollTop>50` 时内联 `background:var(--header-bg)`。
  - `fixed-header`/`hide-header` 分别播放 `header`/`hideHeader` keyframes：`translateY(-52px)→0` / `0→-52px`，`duration .8s; fill-mode forwards`。**注意 52px 与 50.4px 高度不等，是原值**。
- `.pc_menu`：`display:flex; justify-content:space-between; align-items:center; padding:0 20px`。
  - 左：`router-link to="/"` 包 `<el-avatar :src="getBlogAvatar">`（默认 40px，Element 默认尺寸）+ `MessageBox`（仅登录后，`ml-[10px]`）。
  - 右：`BlogSearch` → `el-menu`（`mode="horizontal"`、`:ellipsis="false"`、`height:53px`、`menu-trigger="click"`、`:default-active="route.path"`）→ `<SwitchTheme />`。
  - 导航顺序（PC）：`主页 /home`(icon-home) → `时间轴 /archives`(icon-icon) → `更多`(sub-menu /resources: `前端推荐 /resources/front` icon-folder、`后端推荐 /resources/back` icon-houduankaifa) → `分类 /category`(icon-sort) → `相册 /photoAlbum`(icon-paper) → `说说 /talk`(icon-speechbubble) → `友链 /link/list`(icon-pengyouquan) → `留言 /message/list`(icon-liuyan) → 未登录 `登录 /login`(icon-timerauto) / 已登录 `el-sub-menu` 头像（`size=30`）→ `个人中心 /userCenter`(icon-gerenzhongxin)、`退出 /logout`(icon-tuichudenglu)。
    - **PC 端「标签 /tag」项被注释掉**；移动端抽屉里保留 `/tag`。
  - 图标尺寸微调：`.iconfont{font-size:1.2rem;margin-right:5px}`，`.icon-sort{1.2rem}`、`.icon-icon/.icon-label_fill{1.3rem}`、`.icon-menu{1.1rem}`、`.icon-pengyouquan/.icon-liuyan/.icon-tuichudenglu{1.3rem}`、`.icon-timerauto{1.1rem}`；`.el-sub-menu__icon-arrow{display:none}`。
- `.mobile_menu`：`display:flex; justify-content:space-between; align-items:center; height:100%; padding:0 10px`。
  - 左：`icon-menu2`（1.4rem，`color:var(--menu-color)`，点击开抽屉）+ 登录后 `MessageBox`。
  - 右：`BlogSearch` + `el-drawer`（`direction="ltr"`、`size="60%"`、`append-to-body`、内联 `style="background:#484848"`）+ `SwitchTheme`。
  - 抽屉内容：居中头像 80px（登录→跳 `/userCenter`；未登录→「去登录」，点击打开登录弹窗）+ 纵向 `el-menu`（同 PC 项，另含 `/tag`，无子菜单箭头）。
### 2.2 Main
`div.main_box` 内 `<router-view v-slot>`：`meta.keepAlive` 的页面（`/home`、`/message/list`）走 `<keep-alive>`，其余直出；两者都 `:key="$route.fullPath"`。**页面自身负责 padding/最大宽度**（见 1.4 的 `.center_box` / `.home_center_box` / `.article-center`）。
### 2.3 Footer（`Layout/footer/blog-footer.vue`）
- `v-if="route.path !== '/message/chat'"`。`.footer_box` + `flex flex-col items-center justify-center`。 内容自上而下（全部 `color:var(--font-color)`，居中）：
  1. `&copy 小张的博客 2023`（14px）
  2. `<a href="http://beian.miit.gov.cn/" target="_blank">蜀ICP备2023007772号</a>`，`mt-[5px]`，hover `color:var(--global-black)`（暗色下不明显，需实测）
  3. `mt-[5px] flex justify-center flex-wrap` 一排 4 个 shields.io 徽章（`<img>`，每张包 `<a class="p-[3px]">`）：
     - 阿里云 ECS 服务器 → `https://img.shields.io/badge/%E9%98%BF%E9%87%8C%E4%BA%91-ECS%E6%9C%8D%E5%8A%A1%E5%99%A8-orange`
     - MdEditorV3 → `.../badge/MdEditorV3-MD%E7%BC%96%E8%BE%91%E5%99%A8-159957`
     - HEXO-BUTTERFLY → `.../badge/HEXO-BUTTERFLY-blue`
     - minio → `.../badge/minio-%E5%AF%B9%E8%B1%A1%E5%AD%98%E5%82%A8%E7%B3%BB%E7%BB%9F-purple`
  - 徽章为外链图片，复刻时建议本地化或替换为纯 HTML 徽章（见第 8 章）。
`路由滚动策略`：`afterEach` 除 `/message/list`、`/home` 外都 `window.scrollTo({top:0})`；切换时有 `NProgress` 顶部进度条（`showSpinner:false`，默认 2px 蓝色条，可换 Tailwind 自绘）。

## 3. 首页原型（`/home`）
### 3.1 欢迎区（`PageHeader/index.vue` 在 `/home` 分支渲染 `home-header.vue`）
```
#home (100vw × 100vh, overflow hidden, background var(--home-bg))
├─ el-image.bg           绝对铺满、fit=cover、z-index 1（背景图）
├─ ::before              绝对铺满、z-index 2、background var(--home-mask-color)
├─ .font                 绝对 top:45% left:50% translate(-50%,-50%) z-999
│                        "小张的个人博客"，clamp(1em,4vmin,20em)，白色，padding .5rem
├─ TypeWriter.type-writer 绝对 top:60% left:50% translate(-50%,-50%) z-999，size=1.2em
├─ Waves                 绝对 bottom:0 全宽 z-999，默认高 6rem
└─ .scroll-bottom        绝对 bottom:70px left:50% translate(-50%,-50%) z-1000
                          icon-arrowdown 1.5em，bounce 2s infinite
```
- 背景图来源：`getAllPageHeader()` → `store.setPageHeaderLIst()`，按 `route.name`（`Home`）匹配 `route_name` 取 `bg_url`；兜底 `http://img.mrzym.top/FvmVKfygxBKoJbFVXJwzjgAASL9S`。 打字机文案来源：`fetch('https://wisdom.mrzym.top/api/random')` → `res.data.content`（**外部 API，需替换**）；`TypeWriter.typeList` 更新后逐字打印。 视差：`gsap.to('.bg',{scrollTrigger:{trigger:'#home',scrub:true,start:'top top',end:'bottom',ease:'power1.inOut'},scale:1.3})` —— 滚动时背景缓慢放大到 1.3。 标题 hover（`.font:hover`）：`animation:anime .5s cubic-bezier(.445,.05,.55,.95) alternate forwards`
  ```css
  from{font-variation-settings:"wght" 300,"slnt" 15; text-shadow:none}
  to  {font-variation-settings:"wght" 800,"slnt" 0;
       text-shadow:1px 1px 0 #00e6e6, 2px 2px 0 #01cccc, 5px 5px 5px #dda121}
  ```
  （依赖可变字体；普通字体下只有三重彩色投影效果）
- 下箭头：`@keyframes bounce{0%,100%{translateY(20px);opacity:.4} 50%{translateY(0);opacity:1}}`；仅在 `scrollTop<=50` 时渲染；点击 `window.scrollTo({top: #home.offsetHeight - 90, behavior:'smooth'})`。 `.type-writer`（`TypeWriter` 组件）：白字、居中、`cursor:pointer`；光标为 `<span class="space">|</span>`，`animation:showInfinite .8s infinite both`（opacity 1→0）。打印参数：`wordPrintTime=0.3s/字`（默认）、`timeSpace=0.8s` 句间停顿，`size` 可传。
### 3.2 首页主体（`home.vue`）
```
.home_center_box (padding-top 20px; max-width 1080px; margin 0 auto)
└─ el-row
   ├─ el-col(:xs=24 :sm=18)
   │   ├─ el-card.mobile-top-card   仅 <768 显示，h 31rem，m 4px
   │   │   └─ RightSideTop 的移动版排版（info-background h 12rem、common-menu padding 1rem 5.5rem）
   │   ├─ <HomeArticleList>         文章列表
   │   └─ el-card.mobile-bottom-card 仅 <768 显示，m 4px，p 1rem
   │       └─ RightSideItem "网站资讯"（文章数目/运行时间/访问次数 + 交流群二维码 80×80 圆角 8px）
   └─ el-col(:xs=0 :sm=6)
       └─ <RightSide>                右侧栏，见 3.5
```
数据：`homeGetArticleList(current,size=5)`、`homeGetConfig()`、`homeGetStatistic()`、`getAllTag()`（标签随机色）。
移动端卡片入场：`gsapTransY(['.mobile-top-card','.mobile-bottom-card'],-30,0.3,'bounce.in')` 与 `('.mobile-bottom-card',30,0.3,'none')`。
### 3.3 文章列表 `HomeArticle`（`home-article-list.vue`）
每篇文章一张卡，**左右交替**（`flex-direction: index%2==0 ? 'row' : 'row-reverse'`）：
```html
<el-col class="article-col article{i}">
 <el-card class="card-hover">
  <div class="article-box" style="flex-direction:row|row-reverse">
   <div class="article-cover">            <!-- PC 40% 宽 / 100% 高；手机 100%×14rem -->
     <div class="scale" v-image>          <!-- hover scale(1.1) -->
       <el-image :src="cover" fit="cover" class="image"/>   <!-- error → svg-icon image404 15px -->
     </div>
   </div>
   <div class="article-info flex_c_between">   <!-- PC 55%；手机 100% padding 1rem 1.5rem -->
     <span class="title text_overflow">标题</span>            <!-- 1.6rem/600/line-height2.4 -->
     <div class="meta">置顶 · 发表于 · 更新于 · 分类 · 标签 · 点赞 · 阅读</div>
     <Tooltip width="100%" size="1.2rem" align="left" :lineHeight="3" :name="摘要"/>
   </div>
  </div>
 </el-card>
</el-col>
```
- 卡片高度：PC `16rem`（224px）、手机 `28rem`（392px）；`.article-box{display:flex;align-items:center}`。 标题：`--font-color`、hover `--primary` + pointer；`text_overflow` 单行省略，`title` 属性给原生 tooltip。 meta 行：`color:var(--meta-color); line-height:1.4; font-weight:500`；项间分隔 `.article-meta__separator`（`&::after{content:"|"; top:-3px}`，`margin:0 .4rem`）。图标顺序与颜色：
  - `icon-zhiding`（置顶，`--top` #f26c60，1rem，仅 `is_top==1`）
  - `icon-calendar2` 发表于 + 日期
  - `icon-schedule` 更新于 + 日期
  - `icon-folder` 分类名
  - `icon-label_fill` 标签（`、` 连接，1.2rem）
  - `icon-icon1` 点赞数（`GsapCount`，<1000 时滚动计数，否则 `numberFormate`）
  - `icon-chakan` 阅读数（同上）
- hover：`.card-hover` 阴影加深 + `translateY(-3px)`；封面 `scale(1.1)`（`.scale`）。 骨架：加载时渲染 **5** 个 `el-card` + `ArticleSkeleton`：
  - PC：`image 45%×20rem` + 右侧文本条 `60%/50px`、`95%/40px`、`65%/30px`
  - 手机：`image 100%×18rem` + 文本条 `60%/45px`、`95%/35px`、`65%/25px`
- 空态：`.no-article{height:80vh;line-height:80vh;font-size:24px;font-weight:bold;text-align:center;color:var(--font-color)}`，文案「暂无文章，请先到后台发布文章～」。 列表入场：每张卡 `gsapTransY('.article{i}', 30, 0.3, 'none')`（PC 从第 2 张起才动画）。 翻页：`Pagination` 组件 → `el-pagination`（`background`、`layout="prev, pager, next"`、`pager-count=5`、`page-size=5`），外层 `.pagination{padding:10px 0;text-align:center}`，`!mt-[2rem]`；激活页 `background:#00c4b6; font-weight:800`（青绿，与 `--primary` 不同）。
### 3.4 头像/统计数字动画 `GsapCount`
`<span>` 内用 `gsap.to(d,{scrollTrigger:'.num-<random>', duration:1(默认), num: props.value})` 从 0 滚动到目标值，渲染 `d.num.toFixed(0)`。`scrollTrigger` 绑定随机类名 → 进入视口才触发。迁移可用 `IntersectionObserver + requestAnimationFrame`。
### 3.5 右侧栏 `RightSide`（`flex_c_center` 纵向卡片列）
```
.right-side
└─ el-row
   ├─ .info-card (h 29rem)  el-card.card-hover → RightSideTop
   ├─ .right-card 公告      h ≥10rem, padding 1rem 1.8rem, icon-gonggao(#f00) + 公告文本(min-h 6rem, 1.1rem, pre-line)
   ├─ .right-card 交流      icon-jiaoliuye(#76d703,1.5rem) + QQ群/微信群二维码 80×80 圆角8
   ├─ .right-card 标签      icon-localoffer + 标签云（随机色，`&nbsp;&nbsp;` 分隔，点击→/articleList?type=tag）
   └─ .right-card 网站资讯  icon-zixun(1.4rem) + 文章数目 / 运行时间 / 博客访问次数（右对齐值 600）
```
- `.right-side-space` 间距：PC `padding:7.5px 1.875px!important`（横向 1.875px + el-col 自身 3.75px ≈ 5.6px），纵向 7.5px。 卡片标题 `.card-title{font-size:1.2rem;line-height:2.4}`，图标 `font-weight:900`，`span{margin-left:.3rem}`。 各卡入场：`gsapTransY(`.right-side-space{i}`)` for i in 2..5，`30px / 0.3 / none`。 `RightSideTop`（资料卡）结构：
  1. `.info-background`：`h 10rem; w 100%` 背景图（`avatar_bg`，`el-image fit=cover`，error 显示 image404 10px）。
  2. `.info-avatar`：`el-avatar` **60×60**，`margin:-2rem 0 0 1rem` 上浮压住背景图，白底，hover `rotate(360deg)` 1s；右侧 `.blog-name{padding:.5rem 0 0 .5rem;font-size:14px;color:#222}`。
  3. `.personal-say`：`h 4.5rem; padding:8px; font-size:1em; font-family:"DYBlack",serif`（**自定义字体，缺字体文件时回退 serif**）。
  4. `.common-menu`：三列（文章/分类/标签）`flex_r_between`，`padding:1rem 3.5rem`；label `1rem/400/#533737`，value `1.4rem`（`GsapCount`）。
  5. `.git-ee`：`padding:0 2rem`，整宽按钮 `.git-ee__item{background:#533737;border-radius:3px;text-align:center;line-height:1.6}`，白字 1.2rem + `icon-gitee2`；hover 由左向右扫入 `--primary` 底色（`.button-animated::before` `scaleX(0→1)`，`transform-origin:0 50%`，`cubic-bezier(.45,1.64,.47,.66)`）。
  6. `.personal-link`：`padding:1rem 5rem; flex_r_around`，四个 `iconfont`（bilibili-line / github-fill / weixin1 / QQ1，1.8rem，QQ 为 1.6rem），微信与 QQ 用 `el-popover`（hover）弹二维码。
- 骨架：`RightSideTopSkeleton`（image 10rem + 头像 60px 上浮 -2rem + 3 行文本 + 3 个统计块 + 4 个圆形图标）与 `RightSideSkeletonItem`（circle 1.8rem + 35% 条 + 3 行文本 40%/90%/60%）。
### 3.6 悬浮波浪 `Waves`
```html
<svg class="waves" viewBox="0 24 150 28" preserveAspectRatio="none">
  <defs><path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z"/></defs>
  <g class="parallax">
    <use href="#gentle-wave" x="48" y="0"/><use x="48" y="3"/><use x="48" y="5"/><use x="48" y="7"/>
  </g>
</svg>
```
- `.waves{position:absolute;bottom:0;left:0;width:100%;z-index:999;height:6rem(Object);min-height:同}`；手机强制 `5rem`。 4 层分别 `fill:var(--wave-one/two/four/three)`，`animation:move-forever` 时长 `7s/10s/13s/20s`、`delay:-2s/-3s/-4s/-5s`、`cubic-bezier(.55,.5,.45,.5)`，`translate3d(-90px,0,0)→(85px,0,0)`。 `<Waves height="4rem"/>` 用于普通页面头部（`PageHeader`），首页用默认 6rem。

## 4. 其余页面逐一说明
### 4.0 通用页面头部 `PageHeader`（除首页与 404 外所有页面）
非 `/home` 时渲染 `.page-header`：
```css
.page-header{position:relative; display:flex; justify-content:center; align-items:center; background-color:var(--header-bg); background-position:center center; background-size:cover; background-repeat:no-repeat; width:100%; height:22rem; /* 308px */}
.page-header::before{position:absolute; inset:0; background-color:rgba(0,0,0,.6)} /* 暗色 .7 */
.page-header .route-font{font-size:2.4rem; font-weight:500; line-height:2.4; text-align:center; color:var(--router-color); z-index:1000; cursor:pointer; transition:all .3s; }
```
- 结构：`.route-font`（或 `#route` 具名插槽）里逐字 `<span class="char">`，切换路由时 `gsapTransFont('.char')` 逐字入场；末尾 `<slot/>` 供页面塞内容；底部 `<Waves height="4rem"/>`。 标题 = `route.meta.name`，若带 `route.query.pageTitle` 则为 `meta.name + " - " + pageTitle`（相册进具体图库时用）。 背景图：按 `route.name` 匹配 `getPageHeaderList` 的 `route_name`；`props.bgUrl` 优先（`/photos?bg=` 传相册封面）；`/article` 用文章 `article_cover`；兜底 `http://img.mrzym.top/FvmVKfygxBKoJbFVXJwzjgAASL9S`。 背景图加载中：插一个 `.loading{position:absolute;inset:0;display:flex;center}` 的空 div，由 `v-image` 指令异步写 `background-image`（避免白闪）。 二级页面的 body 直接跟在 header 后（header 不是 fixed，随页面滚走）。
### 4.1 文章详情 `/article?id=…`（`views/article/article.vue`）
**头部**（`PageHeader` 的 `/article` 分支，`props.article`）：
- `.article.main-article`：`z-index:2000; font-size:1.1rem; line-height:1.4; margin-top:5rem; color:#fff; text-align:center`；PC `max-width:60%`、手机 `90%`。 文章标题用 `Tooltip`（`width:80%`、`weight:500`、`size:2.4rem`、`color:#fff`、`align:center`）。 meta 行（`!mt-[20px]`，每项 `.to_pointer`、`padding:0 .3rem`，图标 `margin-right:.3rem`）：
  `icon-calendar2 发表于 {createdAt}` → `icon-schedule 更新于 {updatedAt}` → `|` → `icon-folder {categoryName}` → `|` → `icon-label_fill {标签、拼接}` → `|` → `icon-icon1 点赞数 {GsapCount}` → `|` → `icon-chakan 浏览次数 {GsapCount}` → `|` → `icon-speechbubble 阅读时长 {N 时 N 分 | N 分}`。
- `.toggle-theme`（`margin-top:1rem; flex; center`）两个 `el-dropdown.theme-card-dropdown`：「预览主题」「代码主题」，各自展示当前主题名 + 下拉切换。样式：`width:8rem; margin:.5rem; padding:.2rem 0; background:transparent; border:1px solid #fff; color:#fff; border-radius:8px; transition:all .5s`，hover `translateY(-3px)`。
**正文**：`.article.article-center`（PC max-width 1280px / padding 2.8rem 10px）内 `el-row.article_box`：
- 左占位 `el-col :md="4"`；主列 `:xs="24" :sm="18" :md="16"`；右栏 `:xs="0" :sm="6" :md="4"`。 主列：`el-card.md-preview` → `MdPreview`（`md-editor-v3`，`class="md-preview-v3"`，`:preview-theme` / `:code-theme` / `:theme="mainTheme?'dark':'light'"`）→ 后端 Markdown 渲染，主题名由 Pinia 持久化，可在头部下拉里换。 版权信息块：`.article-info{padding:2rem}` → `.article-info-inner{padding:1rem; color:var(--font-color); border:1px solid rgba(255,255,255,.3)}`，含「文章作者 / 类型（`el-tag` 原创·转载·翻译）/ 原文链接 或 本文链接（`v-copy` 点击复制）/ 声明」。 点赞 `.like`：`margin:1rem; flex; center`，`icon-icon1` **1.8rem**、hover `scale(1.1)`；已赞态 `.is-like{font-size:1.2rem;font-weight:600;color:var(--primary)}`。点击调 `addLike/cancelLike(type=1)` 并弹 `ElNotification`。 上下篇 `.recommend`（`padding:2rem; flex; between`，高 12rem/手机 10rem）：两个 `.recommend-box`（`width:50%`、`overflow:hidden`、白字），内含 `el-image` 铺满 + `.recommend-box-item` 绝对铺满（`background:rgba(0,0,0,.7)`、`font-size:1.2rem; line-height:1.8`，图标 1.4rem，标题 `Tooltip width=60%`）；`.prev{padding-left:2rem; align-items:flex-start}`、`.next{padding-right:2rem; align-items:flex-end}`；hover：图片 `scale:1.2`、遮罩 `background:var(--mask-bg)`，均 `.5s`。 移动端推荐文章 `.mobile-recommend`（`≥768 display:none`）：标题绝对定位 `top:0; left:2.2rem; 1.2rem/600`，两列 `el-card`（`h 8rem`）+ 标题条 `h 2rem` + 图 `6rem`。 评论区：`.comment-box{!p-[2rem]}` → `Comment type="article" :id :author-id`。进入视口（`IntersectionObserver threshold:[1]`，`intersectionRatio>0`）自动首次展开。
**右栏**：
- `el-card.command`（`header="推荐文章"`、`padding:1rem .5rem`）：`.command-box{max-height:160px; overflow-y:auto}`（滚动条隐藏），每项 `flex`：`el-image 50×40` + 标题 `Tooltip width=35% weight=600 size=1rem` + 日期 `Tooltip width=35% size=.8rem`。 `el-affix :offset="53"`（吸顶在 header 下方）→ `el-card.catalogue-card`（`header="目录"`、`margin-top:1rem; padding:1rem .5rem`）→ `.catalogue-card__box{max-height:calc(100vh - 23.1rem); overflow:auto; scrollbar-width:none}` → `MdCatalog`（`:scroll-element="document.documentElement"`）。目录项 `.md-editor-catalog-link span{color:var(--font-color)}`、激活/`hover` → `var(--md-active)`。 手机：`.mobile-affix`（`fixed; bottom:30%; left:0`）`icon-arrowright 1.8rem` → `el-drawer`「目录」`ltr 60%`。 `:deep(.el-card__header){font-size:1.6rem; padding:0!important; font-weight:bold; line-height:1.8; color:var(--font-color)}`；正文 `a{text-decoration:underline}`。 加载：主列 `el-skeleton :rows="8"`，右栏 `rows=3` + `rows=5`。
**代码块**：由 `md-editor-v3/lib/style.css` + `codeTheme` 决定；本项目只做两处覆盖——`.md-preview-v3{background:rgba(255,255,255,.3)}`（暗色 `rgba(0,0,0,.1)`）、代码块滚动条滑块 `#efbcda`（暗色 `#69696b`）。迁移时若改用 `markdown-it + shiki/highlight.js`，需自建「圆角 + 半透明底 + 细滚动条」的外壳。
### 4.2 分类 `/category`（`views/category/category.vue`）
`PageHeader` → `.category.center_box` → `el-card.category-card{padding:40px 30px}`：
- 顶部 `.category-total`：`"分类 - " + GsapCount(分类数)`，`font-size:1.4rem; line-height:2; font-weight:600; color:var(--font-color)`。 标签云：每个分类一个 `span.category-item__label`，`display:inline-block; font-weight:bold; padding:0 .8rem`，**随机字号 `Math.random()*1.6+0.6` rem**、**随机色 `rgb(30–210, 30–210, 30–210)`**，附加 `scale`（hover 1.1）+ `animate__fadeInDown`；外层 `.category-item{padding:10px; text-align:center}`。 点击 → `/articleList?id=<id>&type=category&name=<名称>`。 加载态：`el-skeleton :rows="1"`（占一个 category-item 高度）。
### 4.3 标签 `/tag`（`views/tag/tag.vue`）
与分类同构，差异：卡片 `padding:40px 50px`、标题 `.tag-total{font-size:2.2rem}`（分类是 1.4rem）、随机字号范围 `Math.random()*1.4+0.6` rem、点击 `type=tag`。
**注意**：PC 导航未暴露入口（仅移动端抽屉 + 首页右栏标签可进）。
### 4.4 归档 `/archives`（`views/archives` + `components/TimeLine/time-line.vue`）
`PageHeader` → `.archives` → `el-row.center_box` → `el-col:span=24` → `el-card.archives-card{padding:40px 50px}` → `TimeLine`：
- 容器 `el-timeline.my-timeline{width:100%; margin-bottom:2rem}`，按年份分组：先渲染 `.year`（`font-size:1.8rem; font-weight:500; color:var(--md-active)`，`to_pointer`），再逐条 `el-timeline-item`（`size="large"`、`hollow`、`hide-timestamp`、`center`）。 轴线：`:deep(.el-timeline-item__tail){height:100%; top:32px; border-left:3px solid var(--hr-border)}`，最后一项 `height:calc(100% - 30px)`。 节点：默认 `left:-2px; width/height:1rem`，`hollow` 时 `border-width:3px; border-color:var(--border-color); background:#fff`，hover 边框 `var(--primary)`；**第一项**特殊：`left:-5px; 1.4rem; border-width:4px`。 每条内容 `.timeline{padding:1rem 0; flex; center}`：封面 `.timeline-cover{100×100px; margin-right:10px}`（`scale` hover，点击进详情，error→`svg-icon image404`）+ `.timeline-info`（`flex:1`，标题 `1.2rem bold padding 5px hover var(--primary)`、时间 `padding 5px bold`）。 底部 `Pagination`（`layout="prev, pager, next"`，`size=5`）。 骨架：`4rem×2rem` 文本 + 绝对定位 `.5rem×60rem` 竖条（`left:0; top:4rem`）+ 10 行 `8rem×8rem` 图 + 文本条。
### 4.5 文章列表 `/articleList?id=&type=tag|category&name=`（`views/article/article-list.vue`）
`PageHeader` → `.center_box` → `el-card.article-list{padding:40px 30px; color:var(--font-color)}`：
- 头部 `.article-list__head`（`flex_r_between flex-wrap`）：左 `"标签 - X" | "分类 - X"`（`1.6rem; line-height:1.7; font-weight:600`），右 `"文章总数：N"`（`1.2rem`）。 网格：`el-col :xs="12" :sm="8" :md="6"`，每张 `el-card.card-hover`（点击进详情）：封面 `.article-img{width:100%; height:8rem}`（PC/手机都是 8rem）+ `.article-title{height:5rem; padding:.8rem .5rem; line-height:1.8}` 内两个 `Tooltip`（标题 `1.2rem #676767`、日期 `1rem #676767`）。 翻页 `size=4`；骨架：头部 2 条 + 4 组（`15rem×6rem` 图 + 2 条文本）。 无文章时无专属空态（需实测）。
### 4.6 说说 `/talk`（`views/talk/talk.vue`）
`PageHeader` → `.talk.center_box` → `el-card.talk-card{padding:40px 50px}`（手机 `40px 3px`）：
- 每条 `.talk-item-line{border-bottom:1px solid #b8b8b8; margin-bottom:1rem; padding-bottom:.5rem}`（暗色下边框改 `var(--font-color)`）。 `.talk-card__item{max-width:680px; padding:10px; flex; flex-start}`：
  - `.left`：方形头像 `el-avatar shape="square"` **60×60**（手机 40×40）。
  - `.right`（`width:100%; margin-left:10px`）：`.right-top`（`min-height:60px; flex col`，置顶 `icon-zhiding` 绝对右上 `.8rem color var(--top)`；昵称 `color:var(--font-color)`；正文走 `TextOverflow :maxLines="3"`，超出显示「展开/收起」，按钮 `color:var(--primary)`；`.content{margin-top:23px}` PC / `3px` 手机）。
  - **九宫格**：`>1` 张图时 `.right-bottom{margin-top:10px; display:grid; grid-template-columns:repeat(3,120px); grid-auto-rows:120px; gap:1px}`（手机 `repeat(3,100px)`/`100px`），每格 `el-image fit=cover` + `preview-src-list` 全量预览；**只有 1 张**时 `.right-bottom-one{width:220px; height:220px; grid; place-items:center}`。
  - 操作条 `.like{width:220px; flex; between; margin-top:15px}`：左 `.time{12px; letter-spacing:1px}` + `"前"`（`returnTime` 相对时间）；右侧 `icon-pinglun`（评论，16px，hover primary）+ `icon-icon1`（点赞，已赞 `color:var(--primary)`）+ 数字（`!ml-[5px]`）。
  - 内嵌 `Comment type="talk" :is-show-toggle="false"`，默认收起，点评论图标才展开。
- **无限滚动**：`IntersectionObserver`（`rootMargin:"0px 0px 300px 0px"`）观察 `.observer`；`.observer{flex; center; 1.2rem; color:var(--font-color); margin-top:30px; letter-spacing:1px}`，到底显示「已经到底了~」，否则「下拉加载更多～」，加载中显示 `<Loading :size="32"/>`。 加载骨架 PC：3 组（`80×80` 文本块 + 40% 宽文本条 + `40%×180px` 图 + 两枚小条），手机另一套（`.mobile-skeleton`）。
### 4.7 相册 `/photoAlbum`（`views/photo/photo-album.vue`）
`PageHeader`（无参数）→ `.albumList` → `el-row.center_box` → `el-col 24` → `el-card.albumList-card{padding:10px; min-height:12em; cursor:pointer}`：
- 网格 `el-col :xs="12" :sm="6"`，每格 `.albumList-box{position:relative; width:100%; height:10rem; transition:all .3s ease-in-out}`（手机 `12rem×8rem`）。 封面 `el-image` 铺满（`border-radius:8px; object-fit:cover`）。 遮罩 `.albumList-box__mask{position:absolute; top:.8rem; left:1rem; right:1rem; bottom:40%; border-radius:8px; padding:5px; z-index:999; background:rgba(0,0,0,.2)}`，含 `.name`（白、`1.4rem`、bold）与 `.desc`（白、`1rem`、bold），均单行 `text_overflow`。 hover：`filter:saturate(2) drop-shadow(0 0 5px rgba(0,0,0,.66)); transform:translateY(-5px)`。 点击 → `/photos?id=<albumId>&pageTitle=<名称>&bg=<封面>`。 骨架：8 个 `100%×8rem` 图块。
### 4.8 图库 `/photos?id=&bg=`（`views/photo/photos.vue`）
`PageHeader :bgUrl="route.query.bg"` → `.photoList` → `.center_box` → `.photoList-card{min-height:8rem; border-radius:8px; background:var(--shadow-button-bg)}`：
- `el-row.row-space{padding:5px}` + `el-col.col-space{padding:5px}`，`:xs="12" :sm="6"`；每格 `.image-box{border-radius:5px; overflow:hidden; transition:all .3s}`，hover `translateY(-5px) + saturate(2) drop-shadow(...)`；`el-image` 高 `10rem`（PC）/`8rem`（手机），`fit=cover`，点击打开全量预览（`preview-src-list` + `initial-index`），`animate__fadeIn`。 **右侧固定相册切换器**：`.affix{position:fixed; bottom:30%; right:0}` → `icon-arrowleft 1.8rem` → `el-drawer direction="rtl"`，宽度 PC `15%`、手机 `30%`；内部 `.image-list{height:100%; flex col center; padding:3px}`，`.album-box{100×70px}`（手机 `70×50px`），图片 `94×70`；当前相册 `.album-current{filter:saturate(2); border-right:2px solid #9face6}`（暗色加 `box-shadow:0 0 8px #fff`）。 骨架：6 个 `100%×10rem` 图块。
### 4.9 留言板 `/message/list`（双形态，Pinia 持久化 `getMessageTypeIsCard`）
**A. 卡片模式**（默认 `true`）
- `PageHeader` 用 `#route` 插槽把标题换成 `el-popover`（hover，`width=110`，文案「切换成弹幕/卡片模式」）包着的 `.message-title`：`font-size:2.4rem; font-weight:600; color:var(--router-color)`，点击切形态。 header 内 `.message-header{position:relative; width:100%}`：`<TypeWriter size="1.2rem" :typeList="['生活原本沉闷，但跑起来就会有风!']"/>`（`.type-writer{color:var(--router-color)}`，`!h-[1.2rem]`）+ `.publish{position:absolute; bottom:-100px; left:50%; transform:translateX(-50%)}` 包 `svg-icon name="publish" :width="4" :height="4"`（hover 提示「点我去发表留言」→ `/message/publish?type=add`）。 主体 `.message-body.center_box.relative{min-height:35rem}`：
  - 标签栏 `.search-tab{min-height:3rem; background:rgba(0,0,0,.1); border-radius:8px}`（暗色 `rgba(0,0,0,.2)`），`.tab{display:flex; flex-wrap:wrap; padding:.5rem; font-size:1.2rem; font-weight:600}`，每项 `.tab-li{height:2rem; line-height:2rem; padding:0 .6rem; border-radius:8px}`，激活 `.message-active-tab{color:#fff; background-image:var(--button-linear-gradient)}`；标签来自 `getMessageTag()`，首项固定「全部」。
  - 点击标签栏空白展开搜索框（`el-input` `width:220px; height:28px; inner radius 20px`，`animate__fadeIn/fadeOut`，leave 500ms）。
  - 卡片网格 `el-col :xs="24" :sm="12"`，`el-card.card-hover` → `.message-card{position:relative; height:22rem}`：
    - `.top{height:22rem; padding:8px; overflow:auto; white-space:pre-line; background-position:center; background-size:cover}`（滚动条隐藏，data 可带 `bg_url`/`bg_color`）。
    - `.top-header{height:4rem; flex; between}`：左 `el-avatar` + `.nick-name{margin-left:1rem; letter-spacing:1px; padding:3px 8px; background:rgba(0,0,0,.2); border-radius:8px; color:#fff}`；右 `.option-top`（编辑 `Edit`/删除 `Delete`，仅本人或 `role==1`，白字 + 同款半透明底）。
    - `.content{height:15rem; overflow:auto; word-break:break-all}`，字号/字重/颜色由留言数据 `font_size/font_weight/color` 内联；支持 HTML（`filterMessage` 过滤后 `v-html`）。
    - `.bottom{height:2rem; padding:8px; flex; between}`：左 `.left`（`background:rgba(0,0,0,.2); border-radius:8px; padding:3px 8px`）含 `.time{12px; color:#fff; letter-spacing:1px}` + 评论数 + `.index-tag{#标签, 12px, #fff}`；右 `.option`（同款底，`padding:1px 8px`）含心形 `svg-icon redHeart/greyHeart :width="1.5"` + 计数。
  - 加载态：`el-skeleton` 的 `#template` 是 22rem 高的**咖啡杯**居中区。
  - 底部 `.observer` 无限滚动（同 §4.6）。
**B. 弹幕模式**（`getMessageTypeIsCard=false`）
- 整屏 `position:relative; width:100%; height:100vh; flex col center`；中央 `.message-title`（同上 2.4rem，`z-2000`）点击切回卡片。 中间输入：默认只有一个 `svg-icon publish`（4/4），hover 触发 `showMessageInput` → `el-input` 出现（`transition name="down"`：`translateY(-80px)+opacity0` → `0/1`，`.8s`），尺寸 `300×60`、`border-radius:60px`、`background:#676767`（暗色同），`maxlength=555`，`@keyup.enter` 发送，失焦收起。 弹幕层：`vue-danmaku`（`vue3-danmaku` 库）`position:absolute; top:60px; left:0; width:100%; height:calc(100vh - 60px); z-index:2`，`speeds=60`、`isSuspend`、`loop`（>100 条时）；每条 `.danmu-item{display:flex; align-items:center; font-size:20px; color:#fff}` + `el-avatar` + `：` + 文本；新发的加 `.new-item` 右上角红色 `new` 角标（`#ff1900`，`border-radius:8px`，`top:-5px; right:0`）。 背景：`.shooting_stars{position:absolute; inset:0; height:100vh; overflow:hidden; background:radial-gradient(ellipse at bottom,#1b2735 0%,#090a0f 100%)}` → `.night{transform:rotateZ(45deg)}` → 20 个 `.shooting_star`（`height:2px; background:linear-gradient(-45deg,rgba(95,145,255,1),rgba(0,0,255,0)); border-radius:999px; filter:drop-shadow(0 0 6px rgba(105,155,255,1))`），双动画 `tail 5s`（宽 0→100px→0）、`shooting 5s`（`translateX(0→800px)`），随机 `top/left/animation-delay`（Sass `random()` 生成，**编译期固定**）。
**C. 发布/编辑 `/message/publish?type=add|edit`**
- `PageHeader #route` 标题「发布留言 / 编辑留言」；`.center_box` PC `max-width:600px`。 预览卡：`el-card` 内 `!h-[22rem]` + `.top{height:22rem; padding:8px; background-position:center; background-size:cover}`，含头像行、`contenteditable` 的 `.content{height:15rem}`（初始占位文案「留下点什么再走吧~」，聚焦清空，光标移到末尾 `keepLastIndex`）、标签行 `.bottom{flex; flex-end}` + `.tag`（12px 白字半透明底）。 配置 Tab：`ul.tab`（同留言标签栏样式，`background:rgba(0,0,0,.2)`，`.tab-li{width:6rem; height:2rem}`，激活渐变）：① 背景色 `el-color-picker show-alpha`；② 字号 `el-select 160px` + 文字色 `el-color-picker` + 字重 `el-select 160px`；③ 背景图 `Upload`（`280×140`，`radius 8px`）；④ 标签 `el-select 180px filterable allow-create clearable`。 发布按钮 `.apply-button !w-[200px]`（加载文案「努力上传中...」）；全局 loading 遮罩内咖啡杯 `transform:scale(2)`。
**D. 详情 `/message/detail`**
- `PageHeader #route` 标题「留言详情」；`.center_box` PC `max-width:600px`（覆盖为 `!important`）。 单张卡片，复刻 §4.9A 的 `.message-card`（22rem，无编辑按钮），下方 `Comment type="message" :expand="true"`。 数据来自 `sessionStorage/localStorage`（`_getLocalItem("blog-message-item")`），刷新型标记 `message-refresh`。
### 4.10 友链 `/link/list`（`views/links/link-list.vue`）
`PageHeader` → `.center_box` → `el-card{!m-[3px] !p-[10px]}` → `el-descriptions :column="1"`：
- `#title` → `.desc-title{font-size:1.8rem}`「欢迎来到{blogName}」。 行 1「博客链接」：`span v-copy="'http://mrzym.top/'"`（点击复制，`cursor:pointer`）；行 2「QQ」：`v-copy="'2715158815'"`；行 3 无 label：`.desc-remark`（`flex; between; text-shadow:none`）「快来申请小张的友链吧」+ `.apply-button`「友链申请」（未登录弹提示「请先登录」）。 列表 `el-row.site`，`el-col :xs="24" :sm="8"`，每张 `el-card.card-hover` → `.site-item.site-mask`（`height:11rem; padding:10px; background-size:cover; background-position:center; cursor:pointer`，`::before` 铺满 `rgba(0,0,0,.3)` `z-index:-1`）：
  - `.top{flex; between}`：`el-avatar :size="64"`（`src = site_avatar || url + /favicon.ico`，失败回退站名文字）+ `.name{1.8rem bold 白; width:10rem; 单行省略; hover scale 1.1}`（点击 `window.open`）。
  - `.bottom .desc`：`1rem bold 白`，3 行 `-webkit-line-clamp:3`。
  - `.op-icon{position:absolute; top:3px; right:10px; color:#fff; font-size:24px}`（仅本人/管理员可编辑）。
- 骨架：2 条 `.link-skeleton{height:11rem; background:rgba(255,255,255,.5); border-radius:6px}`（暗色 `rgba(0,0,0,.2)`）。 底部无限滚动 `.observer`。 申请/修改弹窗（`link-apply.vue`）：`el-dialog`（`width="120"`，实际按 Element 语义为 120px→**需实测**，mobile 下被全局 `.el-dialog` 全屏规则覆盖），`#header` 为 `<h1>友链申请/修改</h1>`；表单四项——网站头像（`Upload` `150×150`，`radius 8px`）、网站名称、网站描述（`textarea` `maxlength=125`、`autosize 2~3`、`show-word-limit`）、网站地址（校验必须含 `http`）；输入框高 `40px`；提交钮 `.apply-button` 整宽。手机 `.apply-box{height:88vh}`。
### 4.11 资源导航 `/resources/front`、`/resources/back`（`views/resources/category-list.vue`）
`PageHeader` → `.center_box` → `el-row.category` → `el-col :xs="12" :sm="6"` → `el-card.card-hover` → `.category-item`（`flex; padding:20px 10px; cursor:pointer`）：
- `.left{position:relative; width:60px; height:60px; transition:all .8s}`，hover `scale(1.1)`；用 `.top`/`.bottom` 两个**半圆装饰**夹住头像：`width:66px; height:33px; left:-3px; top:-3px / bottom:-3px; border-radius:33px 33px 0 0 (上) / 0 0 33px 33px (下); background:var(--shadow-button-bg)`；hover 时分别播 `up`（`translateY(0→-33px)` + 底色透明）与 `down`（`translateY(0→33px)`），`.8s forwards`。 `el-avatar :size="60"` 内显示分类名文字。 `.right{width:70%; margin-left:10px; flex col}`：`.name{1.2rem; 600; line-height:1.7; 单行省略; hover var(--primary)}`，`.desc{0.8rem; height:2.4rem; 2 行 clamp}`。 点击 → `/siteList?type=front|back&category=<分类 key>`；数据来自本地 `views/resources/data.js`（**纯静态数据，无接口**）。
### 4.12 网站列表 `/siteList?type=&category=`（`views/resources/site-list.vue`）
`PageHeader` → `.center_box` → `.title{font-size:1.4rem; font-weight:600; text-align:center}`「{前端|后端} - {分类名}」→ `margin-top:30px` 的 `el-row.site`：
- 卡片结构与 §4.11 完全一致（同样的半圆装饰动画），差异：头像 `src = url + "/favicon.ico"`（远程抓站点图标，易 404），名称是 `<a target="_blank">`，整体点击 `window.open(item.url)`。 无分页（静态数组全量渲染）。
### 4.13 用户中心 `/userCenter`（`views/user/user-center.vue`）
`PageHeader` → `.center_box{flex col center}` → `.info{max-width:400px; padding:0 20px}` → `el-tabs`（`:deep(.el-tabs__nav-scroll){flex; center}` 使 tab 居中）：
- **个人信息**：`el-form label-width="120px" label-suffix=":"`；头像项 `.user-avatar{height:140px}`，`Upload` **100×100 圆形（`border-radius:50px`）**，可预览；昵称（预览态显示文本，编辑态 `el-input 220px clearable`）；`.pos{width:400px; padding:.8rem 0 12px 10rem}` 放按钮：预览态「编辑」，编辑态「取消（`.cancel{color:rgb(255,118,118)}`）+ 保存」，均 `.apply-button`。 **密码修改**：三个 `el-input 220px show-password`（原密码/新密码/确认密码），正则校验「6–18 位、数字字母符号任意两种组合」，提交后清登录态跳首页。 `:deep(.el-form-item){padding:15px 0; width:400px}`（全局已是 `padding:15px 0`）。
### 4.14 404（`views/404/index.vue`）
**无 PageHeader**。`.not-found{height:calc(100vh - 140px); flex col center}`：
1. 一行：`el-button type="primary" size="small"`「返回上一页」(`router.go(-1)`) + `span`「返回首页」（`!ml-[5px] text-sm hover:text-primary-blue`；`primary-blue` = `#5cbfef`，Tailwind 自定义色，全项目唯一实际用到的 Tailwind 扩展色）。
2. `<p class="!mt-[5px]">{{ 5 - time }} 秒后自动返回首页......</p>`，`setInterval 1s` 倒计时 5s 后 `router.push('/')`。
3. `svg-icon name="404" :width="30" :height="30"`（本地 SVG 精灵图 `src/icons/svg/404.svg`）。
### 4.15 搜索
**没有独立 `/search` 路由**。搜索是 header 内的 `BlogSearch` 弹层（见 §5.6）。
### 4.16 聊天室
路由表里的 `/message/chat` 被注释，页面不存在；但 `ChatRoom` 组件在 `App.vue` 里常驻（非 `/` 显示），见 §5.8。
### 4.17 评论区 `components/Comment`（文章详情 / 说说 / 留言详情共用的二级评论）
外层 `Comment.vue`：
```
.comment (w 100%)
├─ .comment-header (flex between)
│  ├─ 左：span.total-value「评论 {numberFormate(total)}」(0.8rem, 点击展开)
│  │    └─ 展开后：最热 | 最新（.comment-tab 0.8rem ml .8rem，.active-order{color:var(--primary)}）
│  └─ 右：span.more（0.8rem/600；有评论→「查看更多/收起」；无评论→「求评论呀~/取消发布」）
└─ v-if isExpand
   ├─ #commentInput（!mt-[1rem] flex）
   │  ├─ .avatar-box：el-avatar（PC 45×45 / 手机 32×32，未登录显示「登录」并打开登录弹窗）
   │  └─ CommentInput（parent=true）
   └─ .comment-list → ParentItem
```
- `CommentInput`：`contenteditable` 的 `.comment-content`（`background:var(--global-shadow-white)`、`border-radius:8px`、`padding:12px`、`font-size:1.2rem`、`font-weight:700`、`color:var(--font-color)`、`word-break:break-all`、`box-shadow:0 3px 6px 3px rgba(7,17,27,.06)`，hover 提到 `.15`）；空时用 `:empty::before{content:attr(placeholder)}` 显示占位（`font-size:var(--size)`、`color:var(--comment-grey)`、700，`--size` 父级 `1.2rem`/子级 `1rem`）；`min-height` PC 120（父）/80（子）、手机 100/60。 聚焦后底部出现一行：左表情入口 `IconList`（`el-dropdown trigger=click`，`svg-icon name="smileFace" 25px`），弹层 `.icon-list{width:300px; min-height:100px; max-height:200px; display:grid; grid-template-columns:repeat(9,30px); grid-auto-rows:30px; gap:3px}`，共 101 个 emoji 实体（`&#128512` 起，`v-html` 渲染、字号 2rem）；右「清空」（`background:#efbcda` 覆盖 `--top`）+「发布」（`background:var(--primary)`），均 `font-weight:700`，PC `height:1.8rem`、手机 `1.5rem`。 `ParentItem`（主评论）：每条 `!mt-[0.5rem] animate__fadeIn`，`flex; flex-start`：头像（45/32）+ `.right`（`margin-left:10px`）：
  1. 昵称 + `<span class="up">UP</span>`（`from_id==1`，`.8rem/800/color:var(--hot-color)`）
  2. 内容 `#comment-content !mt-[1rem]`：含 HTML 走 `v-html`，否则 `TextOverflow maxLines=3` + 展开/收起
  3. 操作行 `!mt-[0.5rem]`：`IP: {ipAddress}`（`.8rem`）→ `icon-icon1` 点赞数（`.thumbs{font-size:1rem}`，`.like-active{color:var(--primary);transform:scale(1.05)}`）→「回复」（`color:var(--md-active)`，hover primary）→「关闭」→「删除」（`.delete{color:var(--top)}`，仅本人/管理员）
  4. 时间 `!mt-[0.5rem]`（原始 `createdAt` 字符串）
  5. `ChildrenItem !mt-[1.5rem]`（子评论，结构同上但字号 `.8rem`，回复框内联展开）
- 底部：`Loading :size="32"`（加载中）/「展开更多」（`.show-more{font-size:.8rem; cursor:pointer}`，`page size=5`）/ 空占位 `<div class="h-[48px]">`。 交互：点赞 `type=4`、回复 `parent_id` 关联、删除 `ElMessageBox.confirm("确认删除此条评论吗？子级评论也会被删除哦")`；所有增删改都走 `ElNotification`（成功 `#7ec050`、失败 `#f56c6c`）。

## 5. 全局常驻组件
层级速查（z-index 从高到低）：`el-dialog/消息框 ~2000+` · **音乐播放器 2002** · **footer 2009** · 歌词板 2000 · header 2001 · 右键菜单 2001(见 5.3) · 404 内容 2000 · 弹幕层 2。`App.vue` 里常驻的顺序：`router-view` → `BackTop` → `MusicPlayer` → `ChatRoom` → `ContextMenu`。
### 5.1 音乐播放器 `components/Music`（全局 fixed，网易云 API 支撑）
**A. 收起的唱片胶囊（默认态）**
```css
.music-disc{position:fixed; left:0; bottom:50px; /* 手机 bottom:30px */ height:60px; min-width:60px; border-radius:30px; /* 手机 50px/25px */ background:var(--global-shadow-white); display:flex; align-items:center; z-index:2002; cursor:pointer; transition:left .2s; }
.music-disc img.music-img{width:50px;height:50px;border-radius:25px;margin:5px} /* 手机 40/20 */
.music-disc .info-box{width:0; overflow:hidden; font-weight:bold; letter-spacing:1px; transition:width .2s}
.music-disc:hover .info-box{width:100%; padding-right:10px}
```
- 结构：`<img :src="musicDescription.al.picUrl || blogAvatar">` + `.info-box`（`.info` 两行 `text-sm whitespace-nowrap`：歌名 / `ar[0].name || "歌手走丢了"`）+ 播放/暂停图标（`icon-bofangzhong` / `icon-zanting`）。 **唱片 18s 匀速旋转**（`@keyframes rotate360`），暂停时 `animation-play-state:paused`；切换歌曲瞬间取消旋转（`isToggleImg`）。 **暂停态整体左移缩出屏幕**：`.music-disc.music-left{left:-30px}`（手机 `-25px`），只留半个圆，hover 后 `left:0` 展开信息。 首次挂载弹 `ElNotification({offset:60,title:"左下角听听歌吧～"})`。 状态持久化：`localStorage`（`_getLocalItem(musicKey)`，`beforeunload` 时写回）；默认 `volume:0.5`、`isPaused:true`、`playModel:RANDOM`（`MODELLIST[0]`）。
**B. 全屏播放器（点击唱片展开）**
```css
.music{position:fixed; inset:0; background:var(--mask-bg); z-index:2002; opacity:0; display:none}
.music.show-music{display:block; animation:showPlayer .3s ease-in-out forwards}   /* opacity 0→1 */
.music.hide-music{animation:hidePlayer .3s ease-in-out forwards}                  /* opacity 1→0 后 display none */
.music-box{width:100%; max-width:1024px; max-height:580px; height:100%; border-radius:12px;
           background:var(--music-main-bg); overflow:hidden; position:relative}   /* 手机 width/height 100% 无圆角 */
```
- 右上关闭：`.icon-off-search{position:absolute; top:8px; right:8px; font-size:1.4rem; z-index:2001; background:var(--shadow-button-bg); padding:10px; border-radius:20px}`（手机 `top:5px`）；播放器打开时 `<html style="overflow-y:hidden">` 锁滚动。 上半 **歌单区** `.list{padding-top:30px}` —— `flex`，左右各 50%：
  - 左「分类歌单」：`.header{padding-left:20px; font-size:1.2rem; font-weight:600}` + `el-row`，每个 `el-col:span="6"` 里 `.top{width:80px;height:80px}`（封面）+ 悬停遮罩 `.play{position:absolute; inset:0; background:rgba(0,0,0,.3); display:flex; center; visibility:hidden}` 内 `icon-zanting 2rem` 白色；`visibility:hidden→visible`。手机端整块 `display:none`。
  - 右：标题行 `.top-name{1.2rem;600; max-width:40%}`（当前榜单名）+ `icon-nav-search 1.6rem` → `el-popover(placement=bottom,width=330,show-arrow=false,teleported=false)` 内搜索歌曲面板；表头 4 列 `歌曲30% / 作者25% / 其他35% / 操作15%`（1.1rem/600）；行同上比例，歌名 hover `var(--music-main-active)`，操作列 `icon-tianjiadao`（已加 `.active{color:var(--music-main-active)}`）；底部 `.observe{color:var(--primary); cursor:pointer}` 文案「下拉/点击加载更多～」/「已经到底了」，加载时 `<Loading :size="24"/>`。
- 下半 **控制条** `.music-controls`（`background:var(--music-main-bg)`）：
  - 进度条：`el-slider :step=".1" :show-tooltip="false"`，`:deep(.el-slider){height:6px}`、`.el-slider__bar{background:var(--music-main-active); border-radius:0}`、`.el-slider__button{6×6px; border:3px solid var(--music-main-active)}`。
  - 主体 `.music-body{padding:8px 3rem 5px; flex between}`，左 33% 信息、右 67% 控制（手机 `.main{width:414px}`、padding `8px 1rem 0`，比例 30%/70%）：
    - 左：唱片 `60×60`（radius 30，旋转 18s）+ 歌名 `0.7rem` / 歌手 `0.8rem`（均单行省略），`margin-left:.5rem`；点唱片切歌词板。
    - 右 `.audio-controls{padding-left:15%}`：`.left{width:20%; flex around}` 上一首/播放/下一首（`icon-shangyiqu`、`icon-bofangzhong` ↔ `icon-zanting`、`icon-xiayiqu`；普通 1.8rem，播放键 **2.8rem**）；`.right` = `TimeVolume`（`width:30%`，本身 `width:120px; flex around`）含四枚 1rem 级元素：
      1. 播放模式 `icon-suijibofang → icon-liebiaoxunhuan → icon-danquxunhuan` 循环切换；
      2. 时间 `mm:ss / mm:ss`（1rem）；
      3. 音量 `icon-yinliang`（1.6rem）→ `el-popover(width=42, placement=top)` 内竖向 `el-slider height="60px"`；
      4. 播放列表 `icon-bofangliebiao` → `el-popover(width=350, show-arrow=false, teleported=false)` 内 **自选歌单**：`padding:5px; border-radius:8px`，表头同 4 列但 `30/30/25/15`，`.body{max-height:300px; overflow:auto}`，每行 1rem 单行省略，删除用 `svg-icon delete width="1rem"`，空态「空空如也」（`.8rem`）；面板右上 `icon-off-search` 手动关闭。
    - 手机端隐藏音量图标。
**C. 歌词板 `.lyric-board`（点唱片或播放器内切 lyric 面板）**
```css
.lyric-mask{position:absolute; inset:0; z-index:2000; padding:35px 0;
            background-color:var(--music-main-bg); background-size:cover; background-position:center; overflow:hidden; display:none}
.lyric-mask-show{display:flex; animation:showBoard .3s ease-in-out forwards}  /* top 100% → 0（从底部滑入） */
.lyric-mask-hide{animation:hideBoard .3s ease-in-out forwards}                /* top 0 → 100% */
```
- **COMMON 模式**（默认）：左 50%（歌名 `text-4xl font-semibold` + `.disc-box{30rem×30rem; display:grid; place-items:center}`，中间 `img 20rem`、`border-radius:10rem`、**36s 旋转**、点击进全屏）；右 50%（`padding:20% 5%; overflow:auto` 隐藏滚动条）：首行歌名 `text-2xl leading-loose text-center`，随后逐行 `.lyric-word{font-size:1.2rem; line-height:2; opacity:.5; text-align:center; transition:all .3s}`，当前行 `.current{font-size:1.3rem; font-weight:bold; opacity:1}`；当前行自动居中滚动（`offsetTop - boxHeight/2 + h/2 - 30`，`behavior:"smooth"`，用户手动滚动后 1s 内不抢滚动）；点歌词跳播放进度。手机隐藏左半边。 **SPECIAL 模式**（沉浸式）：背景 = 当前封面（`background-image`）+ `.special-mask{inset:0; z-index:1; background:rgba(0,0,0,亮度)}`；居中标题（`SpecialTitle`）+ 歌手名（两侧 30×30 透明热区调字号/点歌手调背景亮度）+ 单行大歌词 `.special-lyric{min-height:80px; text-align:center; background:#aaaaaa -webkit-linear-gradient(left,#fff,#fff) no-repeat 0 0; -webkit-text-fill-color:transparent; -webkit-background-clip:text; background-size:0% 100%}`——由 GSAP 把 `background-size` 从 `0% 100%` 推到 `100% 100%`（参数见 §6），实现「卡拉 OK 逐字点亮」。 底部悬浮控制条 `.bottom-control{position:absolute; bottom:0; left:50%; transform:translateX(-50%); width:100%; height:80px; z-index:2000}`，`.control{width:100%; margin:0 10px; padding:10px 20px; border-radius:60px; background:var(--mask-bg); flex; center}`：左 `.close-board`（absolute left 50px，`icon-arrowdown` 收起歌词板、`icon-paper` 切专业模式）、中间 `.control-group{width:15%}` 上一首/播放/下一首、右 `.toggle-type`（absolute right 50px：上传自定义背景 `icon-icon-test2`、SPECIAL→COMMON `icon-icon-test1`、COMMON→SPECIAL `icon-icon-test`、`icon-off-search` 关闭播放器）。鼠标移入显示、移出 **2s 后**隐藏（`showControl .6s`：`translateY(30px)+opacity 0` → `0/1`）。手机 `.close-board/.toggle-type` 移到 30px、`.control-group` 30%。 特殊入口：任意路由带 `?showSpecial=1` 时自动展开播放器 + 歌词板 + SPECIAL 模式。
**D. 搜索歌曲面板 `search-list.vue`（播放器内右上放大镜的 popover 内容）**
```css
.search-music-list{position:relative; width:320px; border-radius:8px; overflow:hidden}
.search-music-list .search{position:absolute; top:10px; left:3px; width:100%; height:30px}
.search-music-list__detail{position:relative; width:330px; height:340px; overflow-y:scroll; overflow-x:hidden}
.search-music-list__detail .header{display:flex; .title{font-weight:600; font-size:1.1rem} .title1{width:40%} .title2{width:45%} .title3{width:15%}}
.search-music-list .name{width:40%; cursor:pointer} .name:hover{color:var(--music-main-active)}
.search-music-list .author{width:45%} .add-music{width:15%} .add-music:hover{color:var(--music-main-active)}
.search-music-list .text-overflow{font-size:1rem; display:inline-block; width:90%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}
.search-music-list .empty{width:100%; height:100%; font-size:.8rem; display:flex; center}
:deep(.el-input-group__append){color:#fff; background:var(--music-main-active); border-radius:0 8px 8px 0}
```
- `el-input`（placeholder「请输入歌名或歌手」、`clearable`、回车搜索）+ `#append` 按钮「搜索」（底色 `var(--music-main-active)`、白字、右侧圆角 8px）。 表头 `歌曲 40% / 作者 45% / 操作 15%`；行：歌名点击即播放（`setMusicInfo(id)`）、作者 `artists.map(name).join(",")`、操作列 `icon-tianjiadao`（已在自选歌单内则 `.active{color:var(--music-main-active)}`，重复添加直接 return）；列表 `.body{max-height:320px}`。 空态「空空如也」（.8rem 居中）；底部 `.observe{height:30px; color:var(--primary); cursor:pointer; line-height:30px; text-align:center}`，文案「点击加载更多～」/「已经到底了」，加载中 `<Loading :size="24"/>`；分页 `limit=20`，点击累加 offset（`params.offset += limit`）。 交互反馈：`ElNotification({offset:60, duration:1000, message:<div style="color:#7ec050;font-weight:600">添加成功</div>})`；无结果时「没有相关的歌曲」。
**E. SPECIAL 模式标题 `special-title.vue`**：`div.glitch`（`text-align:center; color:#fff; font-size:52px; margin:0 auto; z-index:2000; position:relative`），props `title / size=4（→内联 font-size:4rem）/ isSpecial（true 时 font-weight:300）`，`data-text={title}` 供 CSS 伪元素做故障字效果。
### 5.2 回到顶部 `BackTop`（`App.vue` 里 `v-if="route.path!=='/'"`，首页不渲染）
```css
.back-top{position:fixed; overflow:hidden; transition:all ease-in-out .3s}   /* bottom/right 内联 */
```
- 参数：`bottom` 默认 `"60px"`、`right` 默认 `"20px"`（纯数字自动补 `rem`；`App.vue` 传 `:right="isPc ? 3 : 0"` → PC `3rem`、手机 `0`）；`svgWidth` 默认 3（rem）；`rotateDeg` 默认 0。 图标随主题换：`lightTop.svg` / `darkTop.svg`（`mainTheme ? 'darkTop' : 'lightTop'`）。 显隐：`scroll > 200px` 显示（滚动监听 debounce 10ms）；首次进入页面在滚过 200px 之前**整个元素不渲染**（`v-if="!isFirst"`）。 动画：显示 `@keyframes show .8s`（`translateY(100px)+opacity 0` → 80% 时 `translateY(0)+opacity 1`）；隐藏 `@keyframes hide .8s`（`opacity 1→0`、`translateY(0→300px)`，末帧再 `translateX(300px)`，即「掉落 + 右滑收起」）。 点击 `window.scrollTo({top:0,behavior:"smooth"})`。
### 5.3 右键菜单 `ContextMenu`（全站接管原生 `contextmenu`）
```css
.context-menu{width:130px; position:fixed; background:var(--card-bg);
  border:1px solid var(--border-color); border-radius:4px; padding:5px 0; z-index:2000}
.menu-item{padding:8px 16px; font-size:14px; display:flex; align-items:center; gap:8px;
  color:var(--text-primary); cursor:pointer}
.menu-item:hover{background-color:var(--hover-bg)}
.menu-item img{width:20px; height:20px; margin-left:7px}
```
- 定位：`left/top = 鼠标 clientX/clientY`；**越界翻转**：`x + menuWidth > innerWidth` 时改 `x - menuWidth`，Y 同理（菜单尺寸在 `nextTick` 里量 `offsetWidth/offsetHeight`）。 触发：`App.vue` 全局 `contextmenu` → `show(e)`（`preventDefault`）；全局 `click` → `hide()`；菜单项点击后各自 `hide()`。 **八项**（顺序固定，图标是 `src/assets/context-menu/*.png`，20×20）：
| # | 文案 | 图标 | 行为 |
|---|---|---|---|
| 1 | 刷新页面 | `shuaxin.png` | `window.location.reload()` |
| 2 | 返回上页 | `xiangzuo.png` | `router.back()` |
| 3 | 前进下页 | `xiangyou.png` | `router.forward()` |
| 4 | 复制链接 | `fuzhi1.png` | `navigator.clipboard.writeText(location.href)` + `ElMessage.success("链接已复制到剪贴板")` |
| 5 | 深色模式 / 浅色模式 | `shensemoshi.png` / `qiansemoshi.png`（随主题互换） | `staticStore.switchMainTheme()` |
| 6 | 添加友链 | `link.png` | `router.push('/link/list')` |
| 7 | 随便逛逛 | `suiji.png` | 预取 `/api/article/blogHomeGetArticleList/1/999`，随机取一篇 → `/article?id=` |
| 8 | 全部分类 | `fenlei.png` | `router.push('/category')` |
（`assets/context-menu` 里另有 `bofang / bofangliebiao / danquxunhuan / lrc / quanbuxunhuan / shangyishou / shunxubofang / suijibofang / xiayishou / zanting / tupian.jpeg` 共 11 张**当前没有被任何组件引用**，是音乐播放器的历史遗留素材。）
### 5.4 搜索弹窗 `BlogSearch`（header 右侧，无独立路由）
- 触发：header 里 `icon-nav-search`（1.8rem，`color:var(--menu-color)`，hover `scale`）→ `el-dialog`（`class="my-search-dialog"`、`title="搜索"`、`append-to-body`、`:close-on-click-modal="false"`，宽度见 §1 的 `.my-search-dialog` 覆盖）。 结构：
  1. `el-input`（`height:35px; border-radius:8px`，`prefix-icon=Search`，`clearable`，聚焦 `box-shadow:0 0 0 1px var(--primary) inset`，前缀图标 1.6rem）；
  2. `.search-main__box{margin-top:10px}` 内左右各 50%：
     - 左「搜索历史」：右上「清空搜索历史 `icon-off-search`」（0.8rem），下面 `el-tag` 流式排列（`margin:.3rem`，点击回填搜索）；数据存 `localStorage["blogSearchHistory"]`，最多 11 条（超 10 时 `shift()`）。
     - 右「热门推荐」：标题右侧 `icon-hot`（1.4rem，`var(--hot-color)`），下面 5 条，序号用 HTML 实体 `&#9312;`–`&#9316;`（①②③④⑤，绝对定位 `left:-.4rem`、`color:var(--hot-color)`），标题宽 180px 单行省略。
     - 有结果时左列切换为结果列表（`.search-result-box{max-height:250px; overflow:auto}`）：标题 1rem + 摘要行（命中词 `span.highlight{background:#c6e0ff}` 高亮 + 剩余内容 0.8rem）。
  3. 点结果 → 关闭并 `router.push({path:'/article',query:{id}})`。
### 5.5 主题切换 `SwitchTheme`（header 最右）
- `el-switch`（`size="default"`、`inline-prompt`、`:active-icon="Sunrise"`、`:inactive-icon="Moon"`），双向绑 `mainTheme` → `staticStore.switchMainTheme()`。 初始化逻辑（`onMounted`）：① `localStorage["mainTheme"]` 存在且与当前不一致 → 切换；② 无缓存时按本地时间 **8–18 点算白天**，不匹配就切。 切换的视觉实现：`html` 上增删 `dark` class + `html{transition:background-color .3s}`（详见 §1、§6.6）。
### 5.6 站内消息 `MessageBox`（header 左，头像旁）
- 触发器：`i.iconfont.icon-xiaoxi`（1.6rem，`var(--menu-color)`）+ 绝对定位 `el-badge`（`bottom:6px; left:12px`，`:value="redTotal"`、`:max="9"`）。 点击 → `el-drawer`（`direction="ltr"`、`size` PC `40%` / 手机 `80%`、`title="我的消息"`、`append-to-body`）。 列表：每条 `el-card`（`padding:15px`、`margin-top:10px`、`card-hover`）；未读用 `el-badge value="new"` 包裹正文，已读整块 `.grey{color:#ccc}`；右下角两个图标——跳转 `Compass`（`var(--primary)`，hover `var(--md-active)+scale(1.1)`）、删除 `Delete`（`var(--hot-color)`，hover 红 + `scale(1.1)`，外套 `el-popconfirm width=120 title="确定删除吗?"`）。 跳转规则按 `type`：1→文章详情、2→说说详情、3→留言板、4→`window.open("http://mrzym.top/admin")`。 底部 `.observer`：`Loading :size="32"` / 「点击加载更多～」/「已经到底啦」（1rem、`var(--primary)`、letter-spacing 1px）。
### 5.7 原子组件
- **`Loading`**：`size` 默认 30；6 个 `<span>` 绝对叠放，`animation:move 3.5s linear infinite`（delay 0/.1/.2/.3/.4/.5s），每个 span 底部有个 `var(--primary)` 圆点（`size>30` → 5×5px，否则 3×3px）；关键帧：`74% rotate(600deg)` → `79% rotate(720deg) opacity 1` → `80% rotate(720deg) opacity 0` → `100% rotate(810deg) opacity 0`。 **`SvgIcon`**：`<svg><use xlink:href="#icon-{name}"/></svg>`，`width/height` 默认 `3rem`（纯数字自动补 `rem`），`fill:currentColor`、`vertical-align:-.15rem`。数据来自 `vite-plugin-svg-icons` 对 `src/icons/svg/*.svg` 的 sprite（`virtual:svg-icons-register`）。 **`TextOverflow`**：props `text/maxLines=3/width/color/fontSize=14`；核心 `display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:{maxLines}; white-space:pre-line; text-overflow:ellipsis`，展开时 `line-clamp:unset`；测量 `scrollHeight>clientHeight` 才在文本下方 `bottom:-25px` 渲染「展开/收起」插槽。 **`ToolTip`**：`el-tooltip(placement="top", effect="light")`，**仅当 `offsetWidth < scrollWidth`（真截断）才启用**；`span` 单行省略，props：`width:100% / size:1rem / color:#676767 / weight:400 / align:left / lineHeight:1`，带 `animate__fadeIn`。 **`Upload`**：`el-upload list-type="picture-card" action="#" :auto-upload="false"`；`#file` 插槽用 `el-image`（`width/height` 默认 200×200，`fit=cover`）+ 预览（`el-image-viewer`）+ 删除；满 `limit` 时 `.hide-upload .el-upload--picture-card{display:none}`。
### 5.8 聊天室 `ChatRoom`（`App.vue` 常驻，`v-if="route.path!=='/'"`）
- 浮标：
```css
.blog-chat{position:fixed; right:-8px; bottom:120px}      /* 故意贴出右边缘 8px，只露半个胶囊 */
.blog-chat-btn{width:26px; padding:3px; border-radius:3px; text-align:center;
  color:var(--global-white); background:var(--primary); cursor:pointer; transition:.3s}
.blog-chat-btn:hover{transform:translateX(-10px)}          /* hover 向左滑出，露出「聊天室」竖排文字 */
```
  图标 `svg-icon name="chat"`（1rem）+ 文字「聊天室」（2 字竖排换行）。
- 面板：`el-dialog class="chat-dialog" width="50%" :show-close="false" append-to-body`（手机 `90%`，需实测）→ `.chat-room`（`100%` 高，`display:grid; place-items:center`）→ `.chat-card` → `.chat-bg`（`border-radius:8px`，透明背景）。 `.chat-header`：`height:36px; padding:2px 8px; font-size:16px; font-weight:600`，左侧「小张的聊天室」+ 右侧状态（`连接中...` / `在线人数 N 人`，`.online-total{color:var(--font-color)}`，0.875rem）；右侧工具：`icon-gerenzhongxin` → `el-popover(width=200)` 在线用户列表（`el-avatar:32` + 昵称 `.nick-name{width:80px; 单行省略}`，管理员多一个 `el-button type=danger size=small`「下线」）、管理员「清空记录」、断线时「重连」按钮、`icon-off-search` 关闭。 消息区 `#root.chat-container{width:100%; height:380px; overflow:auto}`（手机 `height:86vh`）：顶部 `.observe`「点击加载更多消息」（`font-size:1rem; color:var(--primary); letter-spacing:1px`，加载时 `<Loading :size="16"/>`）；空态 `.empty`「还等什么 赶快聊起来吧」（16px/700 居中）；每条 `.message-item{min-height:36px; margin-bottom:10px}`，**自己发的右对齐、别人的左对齐**（`el-avatar` 32×32 在右侧/左侧）；`el-dropdown`（PC `trigger=hover`、手机 `click`）包住气泡，下拉只有「撤回」（仅本人或 `role==1`）；文字气泡 `.message-content{display:inline-block; word-break:break-all; padding:8px; border-radius:8px; background:var(--global-white)}`；图片消息 `.message-image{width:100px; height:80px; border-radius:8px}`，内嵌 `el-image fit=cover` + 错误插槽 `image404`。 输入区 `.send-container{display:flex; align-items:flex-start; padding:2px 8px; min-height:36px}`：① 表情 `IconList`（复用评论的 101 emoji）；② 图片上传 `el-upload :auto-upload=false :limit=1`（图标 `UploadFilled` 18px）；③ `.send-content`（`contenteditable`，`max-height:100px`、`border-radius:8px`、`padding:8px`、`font-size:1.2rem; font-weight:700`、`background:var(--global-shadow-white)`、`box-shadow:0 3px 6px 3px rgba(7,17,27,.06)` → hover `.15`，`:empty::before{content:attr(placeholder); font-size:14px; color:var(--comment-grey)}`）；④ `.send-btn`（`width:100px; height:40px; border-radius:8px; background-image:var(--button-linear-gradient); color:#fff; font-size:18px`，手机 80px）。 数据层（复刻时注意）：**原生 WebSocket 直连 `ws://localhost:8889/`（写死，注释里是 `ws://mrzym.top/ws/`）**，消息协议 `{type:'init'|'message'|'tips'|'onlineList'|'revert'|'offline', user_id, content, content_type:'text'|'image'}`；30s 心跳、断线重连最多 5 次；历史消息走 `GET /api/chat`（`size=10&last_id=`，向上翻页）。未登录发言/空内容会弹 `ElNotification`（`#e6c081` 字）。 备注：路由 `/message/chat` 被注释掉，所以它只以「浮标 + 弹窗」形式存在，不是独立页面。
### 5.9 登录/注册弹窗 `Layout/header/login/login.vue`
- 打开方式：`userStore.setShowLogin(true)`（header「登录」按钮、评论/友链/留言等需要登录的操作）。 `el-dialog`（`width="120"`，配合全局 `.el-dialog` 规则定宽，**实际宽度需实测**）；`#header` 是 `<h1>登录 / 注册</h1>`；`.login-box` 竖向 flex，PC `height:50vh`、手机 `88vh`。 顶部切换行：`没有账号？去注册` / `已有账号？去登录`（1rem，`.line{cursor:pointer; text-decoration:underline}`）。 登录表单：80×80 圆角头像（`blogAvatar.png`）→ 账号 `el-input`（校验 5–16 位）→ 密码（`show-password`）→「记住我」`el-checkbox`（勾选则 `crypto-js` 加密后存 `localStorage["loginForm"]`）→ 整宽 `.apply-button`「登录」；输入框高 40px，`el-form-item` padding 15px 0，回车提交。 注册表单：用户名（5–16）/ 昵称 / 密码 / 确认密码；密码正则 `^(?![0-9]+$)(?![a-z]+$)(?![A-Z]+$)(?!([^(0-9a-zA-Z)]|[()])+$)(?!^.*[\u4E00-\u9FA5].*$)([^(0-9a-zA-Z)]|[()]|[a-z]|[A-Z]|[0-9]){6,18}$`（6–18 位、数字/字母/符号任意两种组合、禁止纯中文）；注册成功自动登录。 登录成功：`ElNotification({offset:60,title:"提示",message:"登录成功"})` + 「欢迎～」通知（`getWelcomeSay(nickname)`，`id==3` 特判为「小婷光临，真是三生有幸」）。

## 6. 动效清单
### 6.1 GSAP 统一入口 `src/utils/transform.js`（全部函数签名与默认值）
| 函数 | 签名 | 实际 fromTo | 用途 |
|---|---|---|---|
| `gsapTransX(list, x, duration = 1, ease = "power1.inOut")` | 逐个元素 | `from{x, scrollTrigger:v}` → `to{x:0, duration, ease}` | 横向滑入（卡片、右栏） |
| `gsapTransY(list, y, duration = 1, ease = "power1.inOut")` | 逐个元素 | `from{y, scrollTrigger:v}` → `to{y:0, ...}` | 纵向滑入（首页手机卡片 `y=±30, duration=0.3`） |
| `gsapTransXScale(list, opacity = 0, duration = 0.6, ease = "power2.inOut")` | 逐个元素 | `from{duration:0, y:50, opacity}` → `to{duration, opacity:1, y:0, ease}` | 「淡入 + 上移 50px」（作者已把 scale 注释掉，函数名保留） |
| `gsapTransFont(name)` | 选择器 | `gsap.to(name, {y:-10, stagger:0.3})` | PageHeader 标题逐字上浮 10px、错峰 0.3s |
| `gsapTransLyric(name, duration, reverse = false, dom)` | 选择器 | 正向 `scaleX:1.1, opacity:.5` → `opacity:1, scaleX:1`；反向 `opacity:1, scaleX:1, blur(0)` → `opacity:0, scaleX:1.1, blur(2px)`，`onComplete` 把 `dom.style.filter="blur(0)"` | 歌词行切换 |
| `gsapTransLyricLeftToRight(name, duration)` | 选择器 | `backgroundSize: "0% 100%"` → `"100% 100%"`，`ease:"none"` | SPECIAL 歌词卡拉 OK 填充 |
- 所有函数内部 `gsap.registerPlugin(ScrollTrigger)`，且把 `scrollTrigger: v` 塞进 vars（GSAP 3 允许），**默认 start/end 未设置**（即 `start:"top bottom"`），一次性播放、不回退。 直接使用 gsap 的地方：`GsapCount`（`gsap.to(d,{scrollTrigger:'.num-xxx', duration:1, num:目标值})`，渲染 `d.num.toFixed(0)`）、首页 `.bg` 视差（`scrub:true` 缩放到 `1.3`，`ease:"power1.inOut"`，`start:"top top" / end:"bottom"`）、移动端卡片入场。
### 6.2 CSS 关键帧总表
| 名称 | 定义处 | 参数 | 触发/用途 |
|---|---|---|---|
| `spin` | `index.html` 内联 | `2s ease infinite` | 首屏四色 loader（80×80，四点是 `#49b1f5/#aadafa` 交替） |
| `fadeIn` | `base.scss` | `1s`，opacity `.5→1` | `.page-header` 与 `#home` 挂载淡入（配合 `transition:all .5s`） |
| `Up` | `base.scss` | `1s` | `.center_box` 进场上移 |
| `steam` / `aboveEnter` / `bottomEnter` | `element/loading.scss` | — | 咖啡杯 Loading（`el-loading` 全局替换） |
| header 显/隐 | `Layout/header` | `.8s forwards` | `translateY(-52px)→0`（显示）/ `0→-52px`（隐藏） |
| `rotate360` | 音乐/右栏头像 | 唱片封面 `18s linear infinite`；歌词大图 `36s`；头像 hover `1s` 一次 | 旋转 |
| `showInfinite` | `TypeWriter` | `.8s infinite both` | 打字机光标 `|` 闪烁 |
| `bounce` | 首页 `.scroll-bottom` | `2s infinite` | `translateY(20px)+opacity .4` → `0/1` |
| `move` | `Loading` | `3.5s linear infinite`（delay 0/.1/.2/.3/.4/.5s） | 6 个点：`74% rotate(600deg)`→`79% rotate(720deg) opacity 1`→`80% opacity 0`→`100% rotate(810deg)` |
| `showPlayer`/`hidePlayer` | 音乐播放器 | `.3s ease-in-out forwards` | 全屏播放器 opacity 0↔1 |
| `showBoard`/`hideBoard` | 歌词板 | `.3s` | `top:100% → 0`（自底部滑入） |
| `showControl` | 音乐底部控制条 | `.6s` | `translateY(30px)+opacity 0 → 0/1` |
| `show`/`hide` | `BackTop` | `.8s` | 显示：`translateY(100px)+opacity 0`→`0/1`（80% 处到位）；隐藏：opacity→0、`translateY(0→300px)`、末帧 `translateX(300px)` |
| `shooting_star`（双动画） | 留言板弹幕页 | `5s` | 20 条流星，位移渐变 + opacity 渐变 |
其余过渡（无 keyframes、纯 transition）：首页大标题 hover `anime .5s cubic-bezier(.445,.05,.55,.95)`；分类/标签 hover 字号与颜色 `.3s`；资源半圆装饰 hover `translateY(∓33px) .8s forwards`；相册封面 hover `filter:saturate(2) drop-shadow(...) translateY(-5px)`；`.git-ee__item` 扫入 `cubic-bezier(.45,1.64,.47,.66)`。
### 6.3 打字机 `TypeWriter`
- 每字 `300ms`、整句结束后停顿 `800ms`，再从头/删字（删除间隔 `50ms` 量级，需实测）；光标为文本 `|` + `showInfinite .8s`。 首页文案来自 `https://wisdom.mrzym.top/api/random`（返回 JSON `data.content`），**接口挂了就没有文字**，需兜底。
### 6.4 波浪 `Waves`
4 层 `<svg><use href="#wave-one|two|four|three"/></svg>` 叠放，`animation: wave 7s/10s/13s/20s linear infinite`（按层逐渐变慢），`animation-delay: -2s/-3s/-4s/-5s`（错峰，避免所有层同步），缓动 `cubic-bezier(.55,.5,.45,.5)`，`transform: translate3d(-90px,0,0) → translate3d(85px,0,0)`；高度 `6rem`（首页）/`4rem`（内页）/`5rem`（手机）。
### 6.5 animate.css（4.1.1，`main.js` 全局引入，实际只用 3 个类）
| 类组合 | 出现位置 |
|---|---|
| `animate__animated animate__fadeIn` | 右栏 4 张卡片、友链卡、说说卡、留言卡、相册/图集图、网站卡、评论列表、歌词板、`ToolTip` |
| `animate__animated animate__fadeInDown` | 文章详情推荐图/右栏目录图、分类项、标签项、文章列表容器 |
| `animate__fadeIn` / `animate__fadeOut` 作 `enter-active-class`/`leave-active-class` | `card-message.vue`（留言卡片切换，**全项目唯一的 `<Transition>`**） |
> 全项目**没有** `<TransitionGroup>`；页面切换也没做路由过渡（`transition.scss` 里的 `.component-*` / `.main-*`（0.6s）定义了但当前未被引用，可直接省略）。
### 6.6 暗色模式切换
- 机制：`@vueuse/core` 的 `useDark({ storageKey:"useDarkKEY", valueDark:"dark", valueLight:"light" })` + `useToggle`；效果是给 `html` 增删 `dark` class。Pinia `staticData.mainTheme` getter 直接返回 `isDark.value`；`switchMainTheme()` = `toggle()` + `localStorage["mainTheme"] = "dark"|"light"`。 所有颜色都走 CSS 变量（§1），`html.dark` 覆盖 13 项；`el-*` 组件暗色由 `element-plus/theme-chalk/dark/css-vars.css` + 自写 `element/dark.scss` 承担；PageHeader 遮罩由 `rgba(0,0,0,.6)` 变 `.7`，header 背景切 `var(--header-bg)`，BackTop/ContextMenu 图标切 dark 版。 **切换本身没有颜色过渡动画**（`html` 上没有 transition），是瞬切；若要更顺滑，需自行在 `html` 上加 `transition:background-color .3s, color .3s`。**需实测**（原项目未做）。

## 7. 图标与图片资源
### 7.1 三套并存的图标体系
**① iconfont（阿里 Iconfont，project id `3812688`，自托管 `src/assets/css/iconFont/`）**——用法 `<i class="iconfont icon-xxx">`，基类 `.iconfont{font-family:"iconfont"; font-size:16px}`，实际尺寸全靠外部 class 覆盖。共 78 个字形，按用途分组（括号内为 `content`）：
- 音乐：`icon-bofangzhong`(\e68f) `icon-zanting`(\e691) `icon-shangyiqu`(\e692) `icon-xiayiqu`(\e693) `icon-suijibofang`(\e6a0) `icon-liebiaoxunhuan`(\e6a3) `icon-danquxunhuan`(\e6a2) `icon-bofangliebiao`(\e696) `icon-bofangduilie`(\e699) `icon-lishibofang`(\e694) `icon-yinliang`(\e698) `icon-tianjiadao`(\e6a4) 导航/通用：`icon-home`(\e622) `icon-home2`(\e612) `icon-menu`(\e615) `icon-menu2`(\e609) `icon-menu21`(\e623) `icon-arrowup`(\e607) `icon-arrowdown`(\e608) `icon-arrowleft`(\e61c) `icon-arrowright`(\e61d) `icon-fanhui`(\e8a4) `icon-nav-search`(\e61f) `icon-fangdajing`(\e60b) `icon-off-search`(\e619) `icon-repeat`(\e620) `icon-share`(\e610) `icon-link`(\e60e) `icon-qr-code`(\e616) `icon-print`(\e614) `icon-paper`(\e60a) `icon-editor`(\e60c) 文章 meta：`icon-calendar2`(\e61b) `icon-schedule`(\e611) `icon-folder`(\e621) `icon-label_fill`(\e60d) `icon-chakan`(\e613) `icon-zhiding`(\e890) `icon-zhiding1`(\e634) `icon-sort`(\e60f) `icon-stack`(\e617) `icon-timerauto`(\e618) `icon-star`(\e605) `icon-hot`(\e606) `icon-new`(\e603) `icon-icon1`(\e651) `icon-icon`(\e652) 社交/关于：`icon-github-fill`(\e885) `icon-gitee2`(\e677) `icon-bilibili-line`(\e69e) `icon-QQ1`(\e62a) `icon-weixin1`(\e62e) `icon-pengyouquan`(\e601) 功能：`icon-xiaoxi`(\e62f) `icon-liuyan`(\e624) `icon-pinglun`(\e7f5) `icon-speechbubble`(\e61a) `icon-gonggao`(\e604) `icon-jiaoliuye`(\e659) `icon-zixun`(\e628) `icon-photo-camera`(\e629) `icon-localoffer`(\e61e) `icon-WEBqianduan`(\e625) `icon-houduankaifa`(\e62b) `icon-denglu`(\e6bd) `icon-gerenzhongxin`(\e626) `icon-tuichudenglu`(\e627) `icon-hangtiantubiao-`(\e600) `icon-icon-test`(\e633) `icon-icon-test1`(\e635) `icon-icon-test2`(\e661)（后三个是音乐播放器的模式切换/封面按钮）
字体文件：`iconfont.woff2`(10.8KB) / `iconfont.woff`(12.6KB) / `iconfont.ttf`(20.2KB)；另有 `iconfont.js`(87KB，symbol 版**未被使用**)、`iconfont.json`(11.7KB，字形清单)、`demo.css` + `demo_index.html`（官方示例页，可删）。
**② SVG sprite（`vite-plugin-svg-icons`，源目录 `src/icons/svg/`，组件 `<svg-icon name="x"/>` → `#icon-x`）——19 个文件**
| 文件 | 体积 | 用途 |
|---|---|---|
| `image404.svg` | 17.7KB | **全站空态插图**（粉色占位图），30+ 处引用：首页卡片空态、右栏、相册、图集、说说、归档、文章推荐位、`el-image` 的 error/placeholder 插槽 |
| `rocket.svg` | 79KB | 大号插画（约 3D 火箭），用于 404 页/装饰（当前引用点需实测） |
| `lightRocket.svg` / `darkRocket.svg` | — | 火箭的明/暗两版，供主题切换（未被当前页面引用，需实测） |
| `lightTop.svg` / `darkTop.svg` | — | **BackTop** 按钮图标（`svgName="Top"` → `light`/`dark` 前缀拼接） |
| `lightDisc.svg` / `darkDisc.svg` / `disc.svg` | — | 唱片占位（音乐面板主题化，需实测） |
| `redHeart.svg` / `greyHeart.svg` | — | 说说/留言点赞（已赞红心 / 未赞灰心） |
| `404.svg` | 52B | 404 页大号「404」文字图形（`30×30` 由父级放大） |
| `chat.svg` | — | 聊天室浮标（`App.vue` 内 `1rem`） |
| `publish.svg` | — | 聊天室/评论发送按钮（5.8 的两处 `name="publish"`） |
| `smileFace.svg` | — | 评论表情面板入口（`25px`） |
| `delete.svg` | — | 自选歌单删除（`1rem`） |
| `chat/comment/search/user` 中的 `comment.svg` `search.svg` `user.svg` | — | 预留（当前代码未引用，需实测） |
**③ Element Plus 图标（`@element-plus/icons-vue`，按需 auto-import）**：`Sunrise` / `Moon`（主题切换）、`Search`（搜索框 prefix）、`Compass`（消息跳转）、`Delete`（消息删除）等；用在 `el-input/el-switch/el-button` 的 icon 属性里。
### 7.2 本地图片 / 位图
| 路径 | 体积 | 用途 |
|---|---|---|
| `src/assets/context-menu/*.png` | 20 张 ×20×20 | 右键菜单图标（实际用 9 张，见 §5.3），另 `tupian.jpeg`(101.5KB) 为菜单预览图 |
| `src/assets/img/blogAvatar.png` | 2.4KB | **默认头像**（header 未登录、评论区、右栏、播放器封面兜底） |
| `src/assets/img/apple-logo-white.svg` | 8.4KB | 白色 Apple 标志（装饰/关于页，需实测） |
| `src/components/Music/controls/components/blogAvatar.png` | 10.6KB | 音乐播放器唱片封面兜底图 |
| `public/favicon.ico` | 4.2KB | 站点图标 |
### 7.3 外链资源与外部依赖（复刻时必须处理）
| 类型 | 地址 | 说明 |
|---|---|---|
| 首页/各页背景图 | 后端 `/api/pageHeader` 返回（图片存 `img.mrzym.top`），兜底 `http://img.mrzym.top/FvmVKfygxBKoJbFVXJwzjgAASL9S` | 关掉后端就只剩兜底图 |
| 首页标题文案 | `https://wisdom.mrzym.top/api/random` | 一言 API，`res.data.content` |
| 图片 CDN | 开发环境 `/blog-images` → `mrzym.top:9000`（MinIO） | 文章封面/相册/头像全走它 |
| 音乐 | `/wapi` → `mrzym.top:3000`（网易云 API 代理） | 歌单、搜索、歌词、播放地址 |
| 技术栈徽章 | `https://img.shields.io/badge/...` ×7 | 关于页/友链页（阿里云 ECS、HEXO、MdEditorV3、minio…） |
| 备案 | `http://beian.miit.gov.cn/` | footer 里 `ICP 备案` 链接 |
| 站外链接库 | 资源导航/友链/网站列表的种子数据（vue/vite/element/tailwind/mdn/github/gitee/juejin/csdn…） | 数据来自后端，不是写死在前端 |
| 字体外链 | **无**（无 Google Fonts；`at.alicdn.com` 只出现在 iconfont 的 demo.css 里） | 自托管 woff2 |
**字体栈**：`Helvetica Neue, Helvetica, PingFang SC, Hiragino Sans GB, Microsoft YaHei, Arial, sans-serif`；根字号 `html{font-size:var(--global-font-size)}` = **14px**（全站 rem 的基准，改动会整体错位）。右栏个性签名额外用 `font-family:"DYBlack", serif`——**项目内没有 DYBlack 字体文件**，实际会回退到 serif，复刻时可直接用系统衬线体或标注需实测。

## 8. 换栈实现要点（→ Vue 3.5 + Vite 8 + TS 7 + Pinia 4 + Tailwind 4 + Element Plus 2.14）
### 8.1 变量迁移：SCSS 变量 → Tailwind 4 `@theme`
原项目 `variable.scss` 的 30 个 `:root` 自定义属性已经是 CSS 变量（不是 SCSS 变量），**可 1:1 搬进 Tailwind 4 的 `@theme`**：
```css
@import "tailwindcss";
@theme{--color-primary: #49b1f5; /* 原 --primary */ --color-primary-blue: #5cbfef; /* 原 tailwind.config 的 primary-blue */ --color-text-primary: …; --color-meta: …; --color-hot: …; /* …其余同 §1.1，命名建议 color-* 以生成 bg-primary/text-primary 工具类 */}
/* Element Plus 对齐：把 el 变量映射到自建 token，避免两套色 */
:root{--el-color-primary: var(--primary); --el-border-radius-base: 4px; }
html.dark{ /* 原 dark 覆盖 13 项原样照搬，注意选择器用 html.dark 而非 .dark */ }
```
- **不要**在 Tailwind 里重设 `--color-primary` 后又用 `--primary` 命名，二者会分叉。建议保留原 `--primary` 等变量名（自有 SCSS/内联 style 仍在用），同时给 Tailwind `@theme` 加同名映射。 Tailwind 4 的 `@theme` 生成的是 `--color-*` 编译期 token，**不能**被运行时的 `html.dark` 覆盖；暗色必须用 `@layer base` 里的 `html.dark{ --color-… }` 或直接沿用原 CSS 变量体系（推荐后者：颜色仍走 `var(--primary)`，Tailwind 只负责布局/间距）。
### 8.2 必须保留的三个「地基」
1. **根字号 14px**：Tailwind 默认 spacing 基于 16px（`1rem=16px`），而原设计所有 `rem` 数值都按 14px 算。方案 A：`html{font-size:14px}` 且 Tailwind 的 `@theme{--spacing:0.25rem}` 保持（视觉会整体缩小 12.5%，与原稿一致的前提是**所有数值都从原 SCSS 抄**）；方案 B：保留 `14px` 根字号 + 用 `text-[0.857rem]` 之类换算。**结论：直接 `html{font-size:14px}`，原 rem 数值原样抄，不要换算。**
2. **Preflight**：原项目 `corePlugins.preflight:false`（关掉重置）。Tailwind 4 默认带 preflight，会重置 `h1~h6/margin/border`，破坏 Element Plus 与自写样式。迁移时用 `@layer theme, base, components, utilities;` + 自定义 `@layer base` 覆盖，或干脆关掉 preflight（Tailwind 4 用 `@import "tailwindcss" layer(base)` 的粒度控制）。
3. **hash 路由**：原项目 `createWebHashHistory`，页面锚点、`?id=` 查询、404 匹配都依赖它；换 history 模式会改变所有 URL 形态。
### 8.3 逐项替代方案
| 原实现 | 依赖 | 新栈方案 | 工作量 |
|---|---|---|---|
| `Waves` 波浪 | 内联 SVG `#wave-one~four` 四层 path | 原样复制 SVG `<defs>` + 4 层 `<use>`，抽成 `Waves.vue`（props: height）；动画是纯 CSS | 纯样式，10 分钟 |
| `TypeWriter` 打字机 | 自写 | 自写 composable（`useTypewriter(words, {typeSpeed:300, holdTime:800})`），无依赖 | 小 |
| `GsapCount` 数字滚动 | gsap + ScrollTrigger | 保留 gsap；或 `@vueuse/core` 的 `useTransition` + IntersectionObserver | 小 |
| 右键菜单 | 自写 + 20 张 png | 自写（`contextmenu` 监听 + 越界翻转），图标建议换 iconfont/Element 图标以去掉 png | 中 |
| 音乐播放器 | 网易云 API + 自写歌词解析 | 组件整体重写（1000+ 行），UI 可 1:1，**数据层强依赖 `/wapi` 代理** | **大** |
| 歌词板 SPECIAL 模式 | gsap `backgroundSize` 动画 | 保留 gsap 写法 | 中 |
| Markdown 渲染 | `md-editor-v3`（`MdPreview` + `MdCatalog` + 6 预览主题 + 8 代码主题） | 换 `markdown-it` + `shiki`/`prismjs` + 自写 TOC（滚动高亮 + `affix offset 53`）；`markdown.scss` 的 258B 样式照抄，主题名要重做映射 | **大** |
| 留言弹幕 | `vue3-danmaku` | 自写弹幕层（随机轨道 `translateX` + `requestAnimationFrame`/CSS 动画），或换 `danmu.js` | 中 |
| 未读消息抽屉 | el-drawer + 自写 | 保留 Element Plus | 小 |
| 图片懒加载 `v-image` | 自定义指令（先占位再写 `background-image`） | 保留为自定义指令；或直接用 `el-image` 的 `lazy` | 小 |
| `v-copy` 复制 | 自定义指令（`navigator.clipboard` + 兜底 `execCommand`） | 保留 | 小 |
| `animate.css` | 4.1.1 | 保留（只用到 fadeIn/fadeInDown/fadeOut，也可自写成 3 个 keyframes 省 60KB） | 纯样式 |
| GSAP + ScrollTrigger | 3.12.2 | 保留；注意 `scrollTrigger` 塞进 vars 的旧写法 | 小 |
| 图片 `require()` | `require-transform` 插件 | 改 `new URL('./x.png', import.meta.url).href` 或直接 `import` | 小 |
| SCSS 全局注入（`additionalData`） | sass | 改为 Tailwind 4 的 `@import` + `@layer`，不再需要 SCSS 注入 | 中 |
### 8.4 Element Plus 2.14 定制冲突点（原项目靠 `element.scss`5KB + `dark.scss`5.9KB 覆盖）
1. `el-card` 默认 `padding:20px` 与圆角 → 全站卡片重设（含 hover 阴影/上浮的 `.card-hover`）。
2. `el-menu` 在 header 里要**透明背景 + 无边框**，`horizontal` 且 `height:53px`，子菜单箭头 `display:none`，激活态用 `var(--primary)`。
3. `el-popper`（下拉/气泡）暗色与首页「渐变气泡」样式要重写。
4. `el-timeline` 的节点尺寸/连接线需覆盖（归档页）：`tail 3px solid var(--hr-border)`、节点 1.4rem/1rem、`left:-5px/-2px`。
5. `el-pagination` 激活底色 `#00c4b6`、`font-weight:800`、`size="5"`。
6. `el-dialog` 宽度在源码里写 `width="120"`（配合全局 `.el-dialog` 规则确实生效，**2.14 下需实测**），登录/友链申请两个弹窗都依赖它。
7. `el-image` 的 `error`/`placeholder` 插槽大量塞 `image404.svg`，要保留（空态视觉的一部分）。
8. `el-slider` 音乐进度条/音量条需 `:deep()` 改高度与按钮尺寸。
9. `el-drawer` 背景色在手机端菜单写死 `#484848`。
### 8.5 复刻工作量评估（给开发者排期用）
- **纯样式 / 可直接搬（约 40%）**：§1 全部 token、§2 header/footer 骨架、§3 首页欢迎区+文章卡+右栏、§4 各列表页卡片、§5.2–5.7 小挂件、§6 的 CSS 动画、§7 图标资源。这些是「抄数值 + 建变量」，风险低。 **需重写组件（约 40%）**：音乐播放器（含歌词解析/播放列表/SPECIAL 模式）、Markdown 渲染与目录（依赖 md-editor-v3 的替代）、弹幕留言板、右键菜单、搜索弹窗、无限滚动/分页逻辑、评论树（含表情面板 101 emoji）。这些组件逻辑与原库强绑定。 **依赖外部 API / 资源（约 20%）**：所有页面内容（文章/评论/分类/标签/归档/说说/相册/图库/留言/友链/资源/网站/用户/消息/上传）来自 `/api/**` 后端；音乐依赖 `/wapi` 网易云代理；图片依赖 `mrzym.top:9000`；首页背景/文案依赖 `pageHeader` + `wisdom.mrzym.top`。**不做 mock 服务端，前端只剩空态（image404）与兜底图**。 **风险点**：① 14px 根字号与 Tailwind 4 默认 rem 体系的冲突（全局错位风险最高）；② Element Plus 2.14 的 CSS 变量命名/默认 padding 变化；③ `md-editor-v3` 的主题与目录行为难以 1:1；④ 网易云 API 的可用性；⑤ 手机端断点 `768px` 与一堆 `@media (max-width:768px)` 内联样式需要逐条搬。
