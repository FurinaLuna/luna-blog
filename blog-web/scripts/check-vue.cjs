#!/usr/bin/env node
/**
 * Vue SFC 类型检查入口。
 *
 * 项目主 TypeScript 版本是 7.x（原生编译器 tsgo），它不对外提供经典的
 * `typescript/lib/tsc` JS API，因此 vue-tsc 无法直接与它配合。
 * 这里显式把 `typescript6`（官方提供的 6.x 兼容包，经典 JS API 布局）
 * 作为 vue-tsc 的宿主编译器，只用于 .vue 单文件组件的类型检查；
 * 纯 .ts 代码仍由 TS 7 的 `tsc` 检查（见 package.json 的 typecheck 脚本）。
 */
const { run } = require('vue-tsc')

run(require.resolve('typescript6/lib/tsc'))
