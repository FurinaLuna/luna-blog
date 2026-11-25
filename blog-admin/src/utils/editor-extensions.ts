import { config } from 'md-editor-v3'

let pending: Promise<void> | null = null

/**
 * md-editor-v3 默认从 unpkg CDN 懒加载 highlight.js / katex / mermaid / screenfull。
 * 国内网络或离线环境下这些请求会静默失败：代码不高亮、公式渲染成 KaTeX 源码、
 * mermaid 图退化成裸代码块。这里改用本地依赖注册实例，避免依赖外网。
 *
 * 依赖较重（mermaid 约 1MB），只在真正进入带编辑器的路由前 await 一次。
 */
export function setupEditorExtensions(): Promise<void> {
  if (!pending) {
    pending = Promise.all([
      import('highlight.js/lib/common'),
      import('katex'),
      import('mermaid'),
      import('screenfull'),
      import('prettier/standalone'),
      import('prettier/plugins/markdown'),
      import('cropperjs'),
    ])
      .then(
        ([
          hljsModule,
          katexModule,
          mermaidModule,
          screenfullModule,
          prettierModule,
          prettierMarkdownModule,
          cropperModule,
        ]) => {
          config({
            editorExtensions: {
              highlight: { instance: hljsModule.default },
              katex: { instance: katexModule.default },
              mermaid: { instance: mermaidModule.default },
              screenfull: { instance: screenfullModule.default },
              prettier: {
                prettierInstance: prettierModule.default ?? prettierModule,
                parserMarkdownInstance: prettierMarkdownModule.default ?? prettierMarkdownModule,
              },
              cropper: { instance: cropperModule.default ?? cropperModule },
            },
          })
        },
      )
      .catch((error: unknown) => {
        console.warn('[editor] 本地编辑器扩展加载失败，回退到 CDN', error)
      })
  }
  return pending
}
