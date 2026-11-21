const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 50

/**
 * 归一化分页参数。
 * @param {Record<string, unknown>} query
 * @param {{ defaultPageSize?: number, maxPageSize?: number }} [options]
 */
export function resolvePaging(query, options = {}) {
  const defaultPageSize = options.defaultPageSize ?? DEFAULT_PAGE_SIZE
  const maxPageSize = options.maxPageSize ?? MAX_PAGE_SIZE

  const rawPage = Number(query.page)
  const rawPageSize = Number(query.pageSize)

  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize > 0
    ? Math.min(Math.floor(rawPageSize), maxPageSize)
    : defaultPageSize

  return { page, pageSize, limit: pageSize, offset: (page - 1) * pageSize }
}
