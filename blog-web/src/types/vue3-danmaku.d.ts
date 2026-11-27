/**
 * vue3-danmaku@1.6.7 的 package.json 里写的是
 * `"types": "dist/typings/lib/danmaku.vue.d.ts"`（小写 d），
 * 但实际发布出来的文件名是 `dist/typings/lib/Danmaku.vue.d.ts`（大写 D）。
 * Windows / macOS 文件系统大小写不敏感，本地能解析；Linux CI 上会解析失败，
 * vue-tsc 报 TS7016「Could not find a declaration file for module 'vue3-danmaku'」。
 *
 * 这里补一份最小声明，保证跨平台一致；升级该依赖后如果上游修好了文件名，这份声明依然兼容。
 */
declare module 'vue3-danmaku' {
  import type { DefineComponent } from 'vue'

  const Danmaku: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

  export default Danmaku
}
