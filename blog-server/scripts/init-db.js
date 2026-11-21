/**
 * 初始化数据库：建库 → 建表 → 创建管理员 → 写入站点配置与示例内容。
 * 用法：pnpm db:init（可重复执行，已存在的数据不会覆盖）
 */
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { config } from '../src/config/index.js'

const WELCOME_ARTICLE = `# 欢迎来到 Luna Blog

这是一篇由初始化脚本写入的示例文章，你可以在后台把它删除或改写成自己的第一篇博客。

## 为什么重写这个项目

旧版本把鉴权、路由、数据访问揉在一起，评论还要求访客注册登录。新版本做了这些改动：

- 三端分离：\`blog-web\`（前台）、\`blog-admin\`（后台）、\`blog-server\`（API）
- 访客**无需登录**即可评论，提交后进入审核队列，管理员在后台一键通过
- 标签、分类、归档、搜索、RSS 全部由数据库驱动
- 深色模式、移动端适配、Markdown 渲染与代码高亮开箱即用

## 一段示例代码

\`\`\`ts
export function greet(name: string): string {
  return \`你好，\${name}！\`
}
\`\`\`

## 接下来做什么

1. 打开后台 \`/change-password\` 修改初始密码
2. 在「站点配置」里改成你的站点名、头像和关于页
3. 写第一篇文章，发布后即可在前台看到

> 保持记录，保持热爱。
`

/** 建库 */
async function ensureDatabase() {
  const connection = await mysql.createConnection({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    multipleStatements: false,
  })
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${config.db.name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await connection.end()
  console.log(`✓ 数据库 ${config.db.name} 已就绪`)
}

async function seed() {
  const models = await import('../src/db/models/index.js')
  const { sequelize, User, Article, Category, Tag, Talk, Album, Resource, FriendLink, Message } = models
  const { SITE_CONFIG_DEFAULTS, updateSiteConfig, getSiteConfig } = await import(
    '../src/modules/site/site-config.service.js'
  )

  await sequelize.sync()
  console.log('✓ 数据表已同步')

  /* ---------- 管理员 ---------- */
  const existingAdmin = await User.findOne({ where: { username: config.admin.username } })
  if (existingAdmin) {
    console.log(`✓ 管理员 ${config.admin.username} 已存在，跳过创建`)
  } else {
    if (!config.admin.password || config.admin.password.length < 8) {
      throw new Error('ADMIN_PASSWORD 未配置或少于 8 位，请在 blog-server/.env 中设置后再执行 db:init')
    }
    await User.create({
      username: config.admin.username,
      password: await bcrypt.hash(config.admin.password, 10),
      nickname: 'Luna',
      needPasswordChange: true,
    })
    console.log(`✓ 管理员 ${config.admin.username} 已创建（首次登录须修改密码）`)
  }

  /* ---------- 站点配置 ---------- */
  const configRows = await models.SiteConfig.count()
  if (configRows === 0) {
    await updateSiteConfig({ ...SITE_CONFIG_DEFAULTS, author: 'Luna' })
  }
  console.log('✓ 站点配置已初始化')

  /* ---------- 示例内容（仅在库为空时写入） ---------- */
  const articleCount = await Article.count()
  if (articleCount > 0) {
    console.log('✓ 已存在文章，跳过示例内容')
    await sequelize.close()
    return
  }

  const categories = await Category.bulkCreate([
    { name: '前端开发', slug: 'frontend', description: 'Vue、TypeScript 与工程化实践', sort: 1 },
    { name: '后端开发', slug: 'backend', description: 'Node.js、数据库与接口设计', sort: 2 },
    { name: '随笔', slug: 'essay', description: '生活、阅读与一些胡思乱想', sort: 3 },
    { name: '工具', slug: 'tools', description: '提升效率的工具与配置', sort: 4 },
  ])

  const tags = await Tag.bulkCreate([
    { name: 'Vue', color: '#42b883' },
    { name: 'TypeScript', color: '#3178c6' },
    { name: 'Node.js', color: '#3c873a' },
    { name: 'MySQL', color: '#00758f' },
    { name: '设计', color: '#e07a3f' },
    { name: '效率', color: '#8a63d2' },
  ])

  const welcome = await Article.create({
    title: '欢迎来到 Luna Blog',
    summary: '一篇由初始化脚本写入的示例文章，介绍新版本的改动与使用方式。',
    content: WELCOME_ARTICLE,
    status: 'published',
    isRecommend: true,
    isTop: true,
    categoryId: categories[0]?.id ?? null,
    readingTime: 3,
    publishedAt: new Date(),
  })
  await welcome.setTags(tags.filter((tag) => ['Vue', 'TypeScript', '设计'].includes(tag.name)))

  const second = await Article.create({
    title: '如何优雅地搭建一个个人博客',
    summary: '从目录结构、接口契约到部署，记录这次博客重写的完整思路。',
    content: [
      '# 如何优雅地搭建一个个人博客',
      '',
      '把博客拆成三块：前台展示、后台管理、API 服务。它们各自独立构建，通过 HTTP 契约连接。',
      '',
      '## 目录结构',
      '',
      '```text',
      'luna-blog/',
      '├── blog-web/     前台（Vue 3 + Tailwind）',
      '├── blog-admin/   后台（Vue 3 + Element Plus）',
      '└── blog-server/  API（Koa 3 + Sequelize）',
      '```',
      '',
      '## 关键取舍',
      '',
      '- 访客评论不登录，用「昵称 + 邮箱」+ 审核制，减少注册摩擦',
      '- 图片存本地 `uploads/`，由 Koa 静态服务托管，省掉对象存储依赖',
      '- 所有配置走环境变量，启动时 fail-fast，避免线上才发现缺配置',
      '',
      '## 部署',
      '',
      '前台与后台构建成静态文件，用 Nginx 托管并把 `/api`、`/uploads` 反向代理到 Node 服务即可。',
    ].join('\n'),
    status: 'published',
    categoryId: categories[1]?.id ?? null,
    readingTime: 4,
    publishedAt: new Date(Date.now() - 86_400_000),
  })
  await second.setTags(tags.filter((tag) => ['Node.js', 'MySQL', '效率'].includes(tag.name)))

  await Talk.bulkCreate([
    {
      content: '新博客上线了，评论不用注册账号，填个昵称和邮箱就能说话。欢迎来玩。',
      images: [],
      likeCount: 3,
    },
    {
      content: '今天把配色从纯白换成了暖白，暗色模式也重新调了一遍，晚上看着舒服很多。',
      images: [],
      likeCount: 1,
    },
  ])

  const album = await Album.create({
    name: '随手拍',
    description: '日常里一些好看的瞬间',
    sort: 1,
  })
  console.log(`  相册 #${album.id} 已创建，可在后台上传照片`)

  await Resource.bulkCreate([
    { name: 'Vue 官方文档', url: 'https://cn.vuejs.org/', description: '渐进式 JavaScript 框架', icon: '🟢', category: '前端', sort: 1 },
    { name: 'MDN', url: 'https://developer.mozilla.org/zh-CN/', description: 'Web 技术权威文档', icon: '📚', category: '前端', sort: 2 },
    { name: 'Koa', url: 'https://koajs.com/', description: '轻量 Node.js Web 框架', icon: '🌿', category: '后端', sort: 3 },
  ])

  await FriendLink.bulkCreate([
    { name: 'Vue.js', url: 'https://cn.vuejs.org/', description: '渐进式框架', status: 'approved', sort: 1 },
    { name: 'Koa', url: 'https://koajs.com/', description: 'Node.js 框架', status: 'approved', sort: 2 },
  ])

  await Message.bulkCreate([
    { nickname: '路过的旅人', content: '博客很清爽，暗色模式好评！', color: '#2f8f83', status: 'approved' },
    { nickname: '小满', content: '来看你的新站啦，记得常更新。', color: '#e07a3f', status: 'approved' },
  ])

  console.log('✓ 示例文章、说说、相册、资源、友链、留言已写入')
  await sequelize.close()
}

try {
  await ensureDatabase()
  await seed()
  console.log('\n初始化完成 🎉\n')
  process.exit(0)
} catch (error) {
  console.error('\n[初始化失败]', error instanceof Error ? error.message : error)
  process.exit(1)
}
