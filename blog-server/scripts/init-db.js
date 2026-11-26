/**
 * 初始化数据库：建库 → 建表 → 创建管理员 → 写入默认站点配置。
 * 用法：pnpm db:init（可重复执行，已存在的数据不会覆盖）
 */
import bcrypt from 'bcryptjs'
import mysql from 'mysql2/promise'
import { config } from '../src/config/index.js'

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
  const { sequelize, User } = models
  const { SITE_CONFIG_DEFAULTS, updateSiteConfig } = await import(
    '../src/modules/site/site-config.service.js'
  )

  await sequelize.sync()
  const { ensureSchema } = await import('../src/db/migrate.js')
  await ensureSchema()
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
  /* ---------- 完成 ---------- */
  console.log('✓ 站点配置已初始化')
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
