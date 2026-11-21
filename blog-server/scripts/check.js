/**
 * 后端构建检查：
 * 1. 对 src / scripts 下所有 .js 做语法检查（node --check）
 * 2. 导入应用入口，确保模块依赖图完整（不会连接数据库，只验证 import 是否成立）
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const targets = ['src', 'scripts']

function walk(dir) {
  const result = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) result.push(...walk(full))
    else if (entry.isFile() && entry.name.endsWith('.js')) result.push(full)
  }
  return result
}

const files = targets.flatMap((target) => walk(path.join(root, target)))
let failed = 0

for (const file of files) {
  try {
    execFileSync(process.execPath, ['--check', file], { stdio: 'pipe' })
  } catch (error) {
    failed += 1
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : String(error)
    console.error(`✗ 语法错误：${path.relative(root, file)}\n${stderr}`)
  }
}

if (failed > 0) {
  console.error(`\n后端检查失败：${failed} 个文件存在语法错误`)
  process.exit(1)
}
console.log(`✓ 语法检查通过（${files.length} 个文件）`)

try {
  const { createApp } = await import('../src/app.js')
  const app = createApp()
  if (typeof app.listen !== 'function') throw new Error('createApp 未返回 Koa 实例')
  console.log('✓ 应用依赖图完整（createApp 可构建）')
} catch (error) {
  console.error('✗ 应用入口导入失败：', error instanceof Error ? error.message : error)
  process.exit(1)
}

console.log('\n后端检查全部通过')
