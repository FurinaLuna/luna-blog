import { get, post } from './http'
import type {
  ArchiveYear,
  Article,
  ArticleDetail,
  ArticleQuery,
  LikeResult,
  Paginated,
} from './types'

/** 文章列表（仅已发布），支持分类/标签/关键词/排序 */
export function getArticles(params: ArticleQuery = {}): Promise<Paginated<Article>> {
  return get<Paginated<Article>>('/articles', {
    page: params.page,
    pageSize: params.pageSize,
    categoryId: params.categoryId,
    tagId: params.tagId,
    keyword: params.keyword,
    sort: params.sort,
  })
}

/** 推荐位（不足时后端补最新） */
export function getRecommendArticles(limit = 3): Promise<Article[]> {
  return get<Article[]>('/articles/recommend', { limit })
}

/** 时间轴（按年/月分组） */
export function getArticleArchives(): Promise<ArchiveYear[]> {
  return get<ArchiveYear[]>('/articles/archives')
}

/** 文章详情（含上下篇、相关文章） */
export function getArticle(id: number): Promise<ArticleDetail> {
  return get<ArticleDetail>(`/articles/${id}`)
}

/** 点赞文章（同 IP 幂等） */
export function likeArticle(id: number): Promise<LikeResult> {
  return post<LikeResult>(`/articles/${id}/like`)
}
