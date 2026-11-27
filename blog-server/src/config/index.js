import { fileURLToPath } from 'node:url'
import path from 'node:path'
import dotenv from 'dotenv'
import { z } from 'zod'

const rootDir = fileURLToPath(new URL('../../', import.meta.url))

// 无论从哪个目录启动，都读取 blog-server/.env
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true })

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  SITE_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().default('http://localhost:5173,http://localhost:5174'),

  DB_HOST: z.string().default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().min(1, 'DB_NAME 不能为空'),
  DB_USER: z.string().min(1, 'DB_USER 不能为空'),
  DB_PASSWORD: z.string().min(1, 'DB_PASSWORD 不能为空，请在 blog-server/.env 中配置'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET 至少 16 位，请在 blog-server/.env 中配置'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  ADMIN_USERNAME: z.string().min(3).default('admin'),
  ADMIN_PASSWORD: z.string().optional(),

  UPLOAD_DIR: z.string().default('uploads'),
  UPLOAD_MAX_IMAGE_MB: z.coerce.number().positive().default(5),
  UPLOAD_MAX_FILE_MB: z.coerce.number().positive().default(10),

  /** 访问记录保留天数：历史数据回填后需要调大，否则会被 90 天清理策略删掉 */
  VISIT_RETENTION_DAYS: z.coerce.number().int().min(1).max(36500).default(90),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  const lines = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
  console.error(`\n[启动失败] 环境变量校验未通过：\n${lines.join('\n')}\n请复制 .env.example 为 .env 并补全配置。\n`)
  process.exit(1)
}

const env = parsed.data

export const config = Object.freeze({
  rootDir,
  env: env.NODE_ENV,
  isProd: env.NODE_ENV === 'production',
  port: env.PORT,
  siteUrl: env.SITE_URL.replace(/\/+$/, ''),
  corsOrigins: env.CORS_ORIGINS.split(',').map((item) => item.trim()).filter(Boolean),
  db: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    name: env.DB_NAME,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  admin: {
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD ?? '',
  },
  upload: {
    dir: path.isAbsolute(env.UPLOAD_DIR) ? env.UPLOAD_DIR : path.join(rootDir, env.UPLOAD_DIR),
    urlPrefix: '/uploads',
    maxImageBytes: env.UPLOAD_MAX_IMAGE_MB * 1024 * 1024,
    maxFileBytes: env.UPLOAD_MAX_FILE_MB * 1024 * 1024,
  },
  visit: {
    retentionDays: env.VISIT_RETENTION_DAYS,
  },
})
