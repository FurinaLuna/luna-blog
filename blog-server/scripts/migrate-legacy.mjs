/**
 * 一次性迁移脚本：把旧 Hexo 博客（fluid 主题）的内容迁进 luna-blog。
 *
 * 用法：
 *   node scripts/migrate-legacy.mjs            # 真跑
 *   node scripts/migrate-legacy.mjs --dry-run  # 只看计划，不写库/不拷图
 *   LEGACY_BLOG_DIR="D:/path/to/hexo" node scripts/migrate-legacy.mjs
 *
 * 做什么：
 * 1. 解析 source/_posts/*.md 的 front-matter（title/date/tags/categories/sticky/hide/index_img）
 * 2. 文章内联资源（source/_posts/<文章名>/**）与站点图片（source/img/**）拷到 uploads/legacy/**
 *    并把正文里的相对路径改写成 /uploads/legacy/**
 * 3. 分类/标签按名字 find-or-create，文章按标题幂等插入（已存在则跳过）
 * 4. 旧 about 页正文在站点配置 about 为空时补进去
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { sequelize, Article, ArticleTag, Category, Tag, SiteConfig } from '../src/db/models/index.js'
import { config } from '../src/config/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const serverRoot = path.resolve(__dirname, '..')
const dryRun = process.argv.includes('--dry-run')
const updateExisting = process.argv.includes('--update')

const legacyRoot = path.resolve(
  process.env.LEGACY_BLOG_DIR || 'D:/Projects/01_个人项目/blog',
)
const postsDir = path.join(legacyRoot, 'source', '_posts')
const siteImgDir = path.join(legacyRoot, 'source', 'img')
const aboutFile = path.join(legacyRoot, 'source', 'about', 'index.md')

const uploadsRoot = path.isAbsolute(config.upload.dir)
  ? config.upload.dir
  : path.resolve(serverRoot, config.upload.dir)
const legacyUploadsRoot = path.join(uploadsRoot, 'legacy')
const uploadUrl = config.upload.urlPrefix

/** 极简 front-matter 解析：支持 key: value 与 key:\n  - item 两种写法 */
function parseFrontMatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { data: {}, body: raw }

  const lines = match[1].split(/\r?\n/)
  const data = {}
  let currentKey = null

  for (const line of lines) {
    const itemMatch = line.match(/^\s*-\s+(.*)$/)
    if (itemMatch && currentKey) {
      const value = stripQuotes(itemMatch[1].trim())
      if (!Array.isArray(data[currentKey])) data[currentKey] = []
      if (value) data[currentKey].push(value)
      continue
    }

    const kvMatch = line.match(/^([A-Za-z_][\w-]*):\s*(.*)$/)
    if (!kvMatch) continue

    const key = kvMatch[1]
    const value = kvMatch[2].trim()
    currentKey = key
    data[key] = value ? stripQuotes(value) : []
  }

  return { data, body: raw.slice(match[0].length) }
}

function stripQuotes(value) {
  return value.replace(/^['"]/, '').replace(/['"]$/, '').trim()
}

/** tags/categories 兼容三种写法：`a b`、`'a, b'`、YAML 列表 */
function toList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []
  return value
    .split(/[,，\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

/** 文件名安全化（保留中文，去掉路径分隔与非法字符） */
function safeName(name) {
  return name.replace(/[\\/:*?"<>|]/g, '_')
}

function copyFile(source, target) {
  if (dryRun) return
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
}

/** 按目录拷贝，返回拷贝的字节数 */
function copyDir(sourceDir, targetDir) {
  let bytes = 0
  if (!fs.existsSync(sourceDir)) return bytes

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const from = path.join(sourceDir, entry.name)
    const to = path.join(targetDir, entry.name)
    if (entry.isDirectory()) {
      bytes += copyDir(from, to)
    } else if (entry.isFile()) {
      bytes += fs.statSync(from).size
      copyFile(from, to)
    }
  }

  return bytes
}

/** 把 /img/xxx 与 <文章名>/xxx 之类的相对资源引用改写成 uploads 下的绝对地址 */
function rewriteAssets(body, postSlug, postDir) {
  const replaceRef = (ref) => {
    if (!ref || /^(https?:)?\/\//i.test(ref) || ref.startsWith('data:')) return ref

    if (ref.startsWith('/img/')) {
      const rest = ref.slice('/img/'.length)
      const source = path.join(siteImgDir, decodeURIComponent(rest))
      if (!fs.existsSync(source)) return ref
      copyFile(source, path.join(legacyUploadsRoot, 'site-img', rest))
      return `${uploadUrl}/legacy/site-img/${rest}`
    }

    if (ref.startsWith('/uploads/')) return ref

    const candidates = [
      path.join(postDir, decodeURIComponent(ref)),
      path.join(postsDir, decodeURIComponent(ref)),
      path.join(legacyRoot, 'source', decodeURIComponent(ref)),
    ]
    const source = candidates.find((candidate) => fs.existsSync(candidate))
    if (!source) return ref
    copyFile(source, path.join(legacyUploadsRoot, 'posts', postSlug, ref))
    return `${uploadUrl}/legacy/posts/${postSlug}/${ref}`
  }

  return body
    .replace(/(<img[^>]*src=["'])([^"']+)(["'])/g, (_, head, ref, tail) => head + replaceRef(ref) + tail)
    .replace(/(!\[[^\]]*\]\()([^)\s]+)(\))/g, (_, head, ref, tail) => head + replaceRef(ref) + tail)
}

/** 把正文里的 HTML 图片/换行标签转成 Markdown（跳过代码块，示例代码保持原样） */
function convertHtmlImages(body) {
  return body
    .split(/(```[\s\S]*?```)/g)
    .map((segment) => {
      if (segment.startsWith('```')) return segment
      return segment
        .replace(
          /<img\b[^>]*?alt=["']([^"']*)["'][^>]*?src=["']([^"']+)["'][^>]*>/gi,
          (_, alt, src) => `![${alt}](${src})`,
        )
        .replace(
          /<img\b[^>]*?src=["']([^"']+)["'][^>]*?alt=["']([^"']*)["'][^>]*>/gi,
          (_, src, alt) => `![${alt}](${src})`,
        )
        .replace(/<img\b[^>]*?src=["']([^"']+)["'][^>]*>/gi, (_, src) => `![](${src})`)
        .replace(/<br\s*\/?>/gi, '  \n')
    })
    .join('')
}

/** 摘要：去掉 Markdown 标记后取前 140 字 */
function makeSummary(body) {
  const plain = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_>#`|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return plain.slice(0, 140)
}

function makeReadingTime(body) {
  const length = body.replace(/\s/g, '').length
  return Math.max(1, Math.round(length / 400))
}

async function findOrCreateCategory(name) {
  const [record] = await Category.findOrCreate({
    where: { name },
    defaults: { name, slug: '', description: '', sort: 0 },
  })
  return record
}

async function findOrCreateTag(name) {
  const [record] = await Tag.findOrCreate({
    where: { name },
    defaults: { name, slug: '', color: '#2f8f83' },
  })
  return record
}

async function migratePosts() {
  const files = fs
    .readdirSync(postsDir)
    .filter((name) => name.endsWith('.md'))
    .sort()

  const report = { created: 0, updated: 0, skipped: 0, images: 0, categories: new Set(), tags: new Set() }

  for (const file of files) {
    const fullPath = path.join(postsDir, file)
    const raw = fs.readFileSync(fullPath, 'utf8')
    const { data, body } = parseFrontMatter(raw)

    const title = String(data.title || file.replace(/\.md$/, '')).trim()
    const baseName = file.replace(/\.md$/, '')
    const postDir = path.join(postsDir, baseName)
    const hasAssets = fs.existsSync(postDir)
    const postSlug = `p${String(files.indexOf(file) + 1).padStart(2, '0')}`

    const existing = await Article.findOne({ where: { title } })
    if (existing && !updateExisting) {
      report.skipped += 1
      console.info(`跳过（已存在）：${title}`)
      continue
    }

    if (hasAssets) {
      report.images += copyDir(postDir, path.join(legacyUploadsRoot, 'posts', postSlug))
    }

    const content = convertHtmlImages(rewriteAssets(body.trim(), postSlug, postDir))

    const categoryNames = toList(data.categories)
    const tagNames = toList(data.tags)
    for (const extra of categoryNames.slice(1)) tagNames.push(extra)

    let categoryId = null
    if (categoryNames.length > 0) {
      categoryId = dryRun ? -1 : (await findOrCreateCategory(categoryNames[0])).id
      report.categories.add(categoryNames[0])
    }

    const coverRaw = typeof data.index_img === 'string' ? data.index_img.trim() : ''
    const cover = coverRaw ? rewriteAssets(`<img src="${coverRaw}">`, postSlug, postDir).match(/src="([^"]+)"/)?.[1] ?? '' : ''

    const publishedAt = data.date ? new Date(String(data.date).replace(' ', 'T')) : new Date()
    const summary = String(data.description || '').trim() || makeSummary(content)

    if (!dryRun) {
      const payload = {
        title,
        summary: summary.slice(0, 500),
        content,
        cover,
        categoryId,
        status: 'published',
        isRecommend: false,
        isTop: Boolean(data.sticky),
        readingTime: makeReadingTime(content),
        publishedAt: Number.isNaN(publishedAt.getTime()) ? new Date() : publishedAt,
      }

      const article = existing
        ? await existing.update(payload)
        : await Article.create({ ...payload, views: 0, likeCount: 0, commentCount: 0 })

      if (existing) {
        await ArticleTag.destroy({ where: { articleId: article.id } })
      }

      for (const tagName of [...new Set(tagNames)]) {
        const tag = await findOrCreateTag(tagName)
        await ArticleTag.findOrCreate({
          where: { articleId: article.id, tagId: tag.id },
          defaults: { articleId: article.id, tagId: tag.id },
        })
        report.tags.add(tagName)
      }
    } else {
      for (const tagName of [...new Set(tagNames)]) report.tags.add(tagName)
    }

    if (existing) {
      report.updated += 1
      console.info(`更新：${title}（${categoryNames[0] ?? '无分类'} / ${tagNames.join('、') || '无标签'}）`)
    } else {
      report.created += 1
      console.info(`迁移：${title}（${categoryNames[0] ?? '无分类'} / ${tagNames.join('、') || '无标签'}）`)
    }
  }

  return report
}

async function migrateAbout() {
  if (!fs.existsSync(aboutFile)) return false
  const raw = fs.readFileSync(aboutFile, 'utf8')
  const { body } = parseFrontMatter(raw)
  const text = body.trim()
  if (!text) return false

  const record = await SiteConfig.findByPk('about')
  const current = record ? safeParse(record.value) : ''
  if (typeof current === 'string' && current.trim()) return false

  if (!dryRun) {
    await SiteConfig.upsert({ key: 'about', value: JSON.stringify(text) })
  }
  return true
}

function safeParse(raw) {
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

async function main() {
  if (!fs.existsSync(postsDir)) {
    throw new Error(`找不到旧博客文章目录：${postsDir}`)
  }

  console.info(`旧博客目录：${legacyRoot}`)
  console.info(`上传目录：${legacyUploadsRoot}`)
  console.info(dryRun ? '模式：dry-run（不写库、不拷图）' : '模式：实际迁移')

  if (fs.existsSync(siteImgDir) && !dryRun) {
    const bytes = copyDir(siteImgDir, path.join(legacyUploadsRoot, 'site-img'))
    console.info(`站点图片拷贝：${(bytes / 1024 / 1024).toFixed(2)} MB`)
  }

  const report = await migratePosts()
  const aboutMigrated = await migrateAbout()
  const total = await Article.count()

  console.info('')
  console.info('迁移完成：')
  console.info(`  新建文章 ${report.created} 篇，跳过 ${report.skipped} 篇`)
  console.info(`  分类 ${report.categories.size} 个：${[...report.categories].join('、')}`)
  console.info(`  标签 ${report.tags.size} 个：${[...report.tags].join('、')}`)
  console.info(`  内联图片拷贝 ${(report.images / 1024 / 1024).toFixed(2)} MB`)
  console.info(`  关于页正文${aboutMigrated ? '已写入站点配置' : '未写入（已有内容或旧文件缺失）'}`)
  console.info(`  库中文章总数：${total}`)
}

main()
  .then(async () => {
    await sequelize.close()
    process.exit(0)
  })
  .catch(async (error) => {
    console.error('迁移失败：', error)
    await sequelize.close().catch(() => {})
    process.exit(1)
  })
