import { http } from './http'
import type {
  Article,
  ArticleFlags,
  ArticlePayload,
  ArticleQuery,
  ArticleSummary,
  PageResult,
} from './types'

/** 后台文章分页列表（按 updatedAt 倒序） */
export function getAdminArticles(params: ArticleQuery): Promise<PageResult<ArticleSummary>> {
  return http.get<PageResult<ArticleSummary>>('/admin/articles', { params })
}

/**
 * 后台文章详情（草稿也可读）。
 *
 * 注意：docs/API.md 未收录该接口，但后端已实现
 * `GET /api/admin/articles/:id`；没有它无法读取草稿正文。
 * 调用失败时编辑页会回退为「按列表页扫描」，见 ArticleEditPage。
 */
export function getAdminArticle(id: number): Promise<Article> {
  return http.get<Article>(`/admin/articles/${id}`)
}

/** 新建文章 */
export function createArticle(payload: ArticlePayload): Promise<Article> {
  return http.post<Article>('/admin/articles', payload)
}

/** 全量更新文章 */
export function updateArticle(id: number, payload: ArticlePayload): Promise<Article> {
  return http.put<Article>(`/admin/articles/${id}`, payload)
}

/** 局部更新文章状态 / 推荐 / 置顶 */
export function updateArticleFlags(id: number, flags: ArticleFlags): Promise<Article> {
  return http.patch<Article>(`/admin/articles/${id}/flags`, flags)
}

/** 删除文章（连带评论与点赞） */
export function deleteArticle(id: number): Promise<void> {
  return http.delete<void>(`/admin/articles/${id}`)
}
