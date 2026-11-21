import { Sequelize } from 'sequelize'
import { config } from '../config/index.js'

export const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  timezone: '+08:00',
  logging: false,
  define: {
    underscored: true,
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
})

/** 启动时探活，失败即退出（fail-fast） */
export async function assertDatabaseConnection() {
  try {
    await sequelize.authenticate()
  } catch (error) {
    console.error('\n[启动失败] 无法连接 MySQL，请检查 blog-server/.env 中的 DB_* 配置与数据库服务状态。')
    console.error(`  目标：${config.db.user}@${config.db.host}:${config.db.port}/${config.db.name}`)
    console.error(`  原因：${error instanceof Error ? error.message : String(error)}\n`)
    process.exit(1)
  }
}
