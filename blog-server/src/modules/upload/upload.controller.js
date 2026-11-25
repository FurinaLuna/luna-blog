import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import multer from '@koa/multer'
import { config } from '../../config/index.js'
import { payloadTooLarge } from '../../core/errors.js'

/** 允许上传的图片类型 */
const IMAGE_TYPES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
])

/** 允许上传的普通文件类型（不接收可执行脚本与 svg，避免存储型 XSS） */
/** 允许上传的音频类型（站内自建歌单） */
const AUDIO_TYPES = new Map([
  ['audio/mpeg', '.mp3'],
  ['audio/mp3', '.mp3'],
  ['audio/mp4', '.m4a'],
  ['audio/x-m4a', '.m4a'],
  ['audio/aac', '.aac'],
  ['audio/wav', '.wav'],
  ['audio/x-wav', '.wav'],
  ['audio/ogg', '.ogg'],
])

const FILE_TYPES = new Map([
  ['application/pdf', '.pdf'],
  ['application/zip', '.zip'],
  ['text/plain', '.txt'],
  ['text/markdown', '.md'],
])

const storage = multer.diskStorage({
  destination(_req, _file, callback) {
    const now = new Date()
    const dir = path.join(config.upload.dir, String(now.getFullYear()), String(now.getMonth() + 1).padStart(2, '0'))
    fs.mkdirSync(dir, { recursive: true })
    callback(null, dir)
  },
  filename(_req, file, callback) {
    const ext = IMAGE_TYPES.get(file.mimetype) ?? FILE_TYPES.get(file.mimetype) ?? AUDIO_TYPES.get(file.mimetype) ?? path.extname(file.originalname)
    callback(null, `${randomUUID()}${ext}`)
  },
})

const maxBytes = Math.max(config.upload.maxImageBytes, config.upload.maxFileBytes)

const uploader = multer({
  storage,
  limits: { fileSize: maxBytes, files: 1 },
  fileFilter(_req, file, callback) {
    const allowed = IMAGE_TYPES.has(file.mimetype) || FILE_TYPES.has(file.mimetype) || AUDIO_TYPES.has(file.mimetype)
    if (!allowed) {
      callback(new Error('不支持的文件类型，仅允许 jpg/png/webp/gif/avif/pdf/zip/txt/md 与 mp3/m4a/aac/wav/ogg'))
      return
    }
    callback(null, true)
  },
})

/** 单文件上传中间件（字段名 file） */
export const singleFile = uploader.single('file')

/**
 * 校验实际大小是否符合类型限制（超大文件在落盘后删除）。
 * @param {Express.Multer.File} file
 */
function assertSize(file) {
  const isImage = IMAGE_TYPES.has(file.mimetype)
  const limit = isImage ? config.upload.maxImageBytes : config.upload.maxFileBytes
  if (file.size > limit) {
    fs.rmSync(file.path, { force: true })
    throw payloadTooLarge(
      isImage
        ? `图片超过大小限制（${Math.round(config.upload.maxImageBytes / 1024 / 1024)}MB）`
        : `文件超过大小限制（${Math.round(config.upload.maxFileBytes / 1024 / 1024)}MB）`,
    )
  }
}

/**
 * POST /api/admin/upload
 * 返回相对 URL（前端自动拼当前域名）。
 */
export async function handleUpload(ctx) {
  const file = ctx.file ?? ctx.request.file
  if (!file) {
    ctx.status = 400
    ctx.body = { code: 400, message: '请选择要上传的文件（字段名 file）' }
    return
  }

  assertSize(file)

  const relative = path.relative(config.upload.dir, file.path).split(path.sep).join('/')
  ctx.body = {
    code: 0,
    message: '上传成功',
    data: {
      url: `${config.upload.urlPrefix}/${relative}`,
      name: file.originalname,
      size: file.size,
      mime: file.mimetype,
    },
  }
}
