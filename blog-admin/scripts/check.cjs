#!/usr/bin/env node
/**
 * 类型检查总入口：任何一步失败都以退出码 1 结束。
 *
 * 1. TS 7（原生 tsc）检查 .ts 文件；
 * 2. TS 6（typescript6 兼容包）作为宿主，由 vue-tsc 检查 .vue 文件。
 */
const { execFileSync } = require('node:child_process')
const path = require('node:path')

const tscBin = path.join(
  path.dirname(require.resolve('typescript/package.json')),
  'bin',
  'tsc',
)

const steps = [
  { label: 'TypeScript 7 · .ts', command: process.execPath, args: [tscBin, '--noEmit'] },
  {
    label: 'TypeScript 6 + vue-tsc · .vue',
    command: process.execPath,
    args: [path.join(__dirname, 'check-vue.cjs'), '--noEmit'],
  },
]

let failed = false

for (const step of steps) {
  process.stdout.write(`\n▶ 检查 ${step.label}\n`)
  try {
    execFileSync(step.command, step.args, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
    process.stdout.write(`✔ ${step.label} 通过\n`)
  } catch {
    failed = true
    process.stderr.write(`✖ ${step.label} 未通过\n`)
  }
}

if (failed) {
  process.stderr.write('\n类型检查失败\n')
  process.exit(1)
}

process.stdout.write('\n✔ 全部类型检查通过\n')
