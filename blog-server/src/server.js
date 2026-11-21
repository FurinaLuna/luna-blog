import { createApp } from './app.js'
import { config } from './config/index.js'
import { assertDatabaseConnection, sequelize } from './db/index.js'

async function bootstrap() {
  await assertDatabaseConnection()

  const app = createApp()
  const server = app.listen(config.port, () => {
    console.log(`\n  luna-blog server 已启动`)
    console.log(`  → http://127.0.0.1:${config.port}`)
    console.log(`  → 环境：${config.env}`)
    console.log(`  → 健康检查：http://127.0.0.1:${config.port}/api/health\n`)
  })

  const shutdown = (signal) => {
    console.log(`\n收到 ${signal}，正在关闭服务…`)
    server.close(async () => {
      await sequelize.close()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

bootstrap().catch((error) => {
  console.error('[启动失败]', error)
  process.exit(1)
})
